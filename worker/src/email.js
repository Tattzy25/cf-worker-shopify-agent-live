import { renderApiKeyAlert } from "./templates/apiKeyAlert.js";

export async function handleInboundEmail(message, env, ctx) {
  try {
    const raw = await new Response(message.raw).arrayBuffer();
    console.log(`[Email Routing Inbound] From: ${message.from} To: ${message.to} (${raw.byteLength} bytes)`);
    if (env.DB) {
      ctx.waitUntil(
        env.DB.prepare(
          "INSERT INTO error_logs (shop, conversation_id, user_message, error, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
        ).bind(
          "email-routing",
          message.to,
          `Inbound email from ${message.from}`,
          `Subject: ${message.headers.get("subject") || "(No Subject)"} (${raw.byteLength} bytes)`
        ).run().catch((dbErr) => console.error("[Email Routing D1 Log Error]", dbErr))
      );
    }
  } catch (err) {
    console.error("[Email Routing Handler Error]", err);
  }
}

/**
 * Dispatches an email alert to the merchant's verified store email.
 * Adheres strictly to Cloudflare Email Sending standards:
 * - Sender: error@urgent.facetimefy.com
 * - Recipient: verified merchant store email (never @urgent.facetimefy.com)
 */
export async function dispatchAlertEmail(env, {
  shop,
  provider,
  rawError,
  context = "Storefront Error Alert",
  conversationId = null,
  merchantEmail = null
}) {
  const timestamp = new Date().toISOString();
  let errorString = "";

  if (typeof rawError === "string") {
    errorString = rawError;
  } else if (rawError && typeof rawError === "object") {
    errorString = rawError.message || JSON.stringify(rawError, null, 2);
  } else {
    errorString = String(rawError || "Unknown error");
  }

  const targetShop = shop || "system";

  let recipient = merchantEmail ? merchantEmail.trim() : null;

  if (!recipient && shop && env.MERCHANT_SETTINGS) {
    try {
      const cfg = await env.MERCHANT_SETTINGS.get(shop, { type: "json" });
      if (cfg?.notification_email) {
        recipient = cfg.notification_email.trim();
      }
    } catch (_) {}
  }

  if (!recipient && shop && env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT notification_email FROM merchants WHERE shop = ?"
      ).bind(shop).first();
      if (row?.notification_email) {
        recipient = row.notification_email.trim();
      }
    } catch (_) {}
  }

  const isProviderError = provider === "openai" || provider === "gemini" || provider === "shopify" || provider === "mcp";
  const senderEmail = (env.SENDER_EMAIL || "error@urgent.facetimefy.com").trim();
  const senderName = (env.SENDER_NAME || "Facetimefy AI Alert").trim();

  if (!recipient || !env.EMAIL) {
    return { sent: false };
  }

  const providerLabel = provider === "openai"
    ? "OpenAI"
    : provider === "gemini"
      ? "Google Gemini"
      : provider === "shopify"
        ? "Shopify"
        : provider === "mcp"
          ? "MCP Tool Server"
          : String(provider || "AI Service").toUpperCase();

  const shopLabel = shop || "Your Store";

  const { subject, text, html } = renderApiKeyAlert({
    providerLabel,
    shopLabel,
    recipient,
    errorString,
    timestamp
  });

  const response = await env.EMAIL.send({
    to: recipient,
    from: {
      email: senderEmail,
      name: senderName
    },
    replyTo: senderEmail,
    subject,
    text,
    html
  });

  return { sent: true, messageId: response?.messageId || "dispatched" };
}

export async function recordAndAlertError(env, {
  shop,
  provider,
  rawError,
  context = "API Key Verification",
  conversationId = null,
  merchantEmail = null,
  sendEmail = true
}) {
  let errorString = "";
  if (typeof rawError === "string") {
    errorString = rawError;
  } else if (rawError && typeof rawError === "object") {
    errorString = rawError.message || JSON.stringify(rawError, null, 2);
  } else {
    errorString = String(rawError || "Unknown error");
  }

  // Asynchronous Queue Offload: If FTC_QUEUE binding is present, enqueue event for background processing
  if (env.FTC_QUEUE) {
    try {
      await env.FTC_QUEUE.send({
        type: "ERROR_ALERT",
        shop,
        provider,
        rawError: errorString,
        context,
        conversationId,
        merchantEmail,
        sendEmail
      });
      return;
    } catch (queueErr) {
      console.error("[Queue Enqueue Failed] Falling back to direct handling:", queueErr);
    }
  }

  // Fallback direct execution if Queue is unavailable
  const targetShop = shop || "system";
  if (env.DB) {
    try {
      await env.DB.prepare(`
        INSERT INTO error_logs (shop, conversation_id, user_message, error, created_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        targetShop,
        conversationId,
        context,
        errorString
      ).run();
    } catch (dbErr) {
      console.error("[D1 Error Logging Failed]", dbErr);
    }
  }

  if (sendEmail) {
    try {
      await dispatchAlertEmail(env, {
        shop,
        provider,
        rawError: errorString,
        context,
        conversationId,
        merchantEmail
      });
    } catch (emailErr) {
      console.error("[Alert Email Dispatch Failed]", emailErr);
    }
  }
}
