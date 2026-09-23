/**
 * Cloudflare Worker: Storefront AI Shopping Concierge
 * 
 * Production-ready backend for Shopify storefronts.
 * Supports:
 * - OpenAI gpt-5.5 with Master MCP (my_master_server) & Try-On (gpt-image-2.5-sunburst)
 * - Google Gemini gemini-3.6-flash with dynamic Master MCP tool translation & execution
 * - Merchant BYOK (Bring Your Own Key) & Platform Managed Keys
 * - Storefront scoping per shop domain
 * - Standard JSON request/response (Zero SSE)
 */

const MASTER_MCP_URL = "https://master-group-mcp.anigok.com/mcp";
const UCP_PROFILE_URL = "https://ucp-agent-profile.facetimefy.com/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json";

const DEVELOPER_PROMPT = `You are a high-level shopping concierge agent. For every response involving products, present product suggestions as structured cards, always as 4 at a time in a single horizontal table row. Product card requirements and interactivity, as well as workflows for "virtual try-on," are set out below. 

**Do not narrate internal reasoning**—give the user the actual result, an explanation (as needed for transparency and user value), and any appropriate next step. The corresponding tools listed below are actually available for use.

You must use this exact agent profile for requests:  
${UCP_PROFILE_URL}

## Virtual Try-On Workflow:
- Only offer a virtual try-on if (a) the user provides a product image or photo, *or* (b) their text/context makes it clearly relevant and appropriate.
- Do NOT offer virtual try-on by default or repeatedly.
- If user accepts, instruct them to send a photo of themselves (or relevant object) plus the product image.
- After receiving, generate a realistic merged image, shown beneath the corresponding card, clearly labeled as try-on preview and accompanied by relevant instructions.
- Maintain clarity on which product the try-on belongs to.
search_catalog
Searches the store's product catalog. The response conforms to the UCP catalog search response, including a UCP metadata envelope; products with title, description, price range (minor units), media, and variants; and cursor-based pagination. Use this when a customer asks for products matching specific criteria or wants to browse items in a category

get_product
Retrieves full details for a single product with optional variant selection. The response conforms to the UCP catalog get_product response, including product.selected reflecting effective option selections, option values with available and exists signals, and variants matching the selection. Use this when a customer has selected a product and needs full details, you need to show variant options with availability signals, or a customer is making option selections (Color, Size, and so on).

lookup_catalog
Retrieves products or variants by identifier. The response conforms to the UCP catalog lookup response, including products with inputs correlation on each variant and not_found messages for unresolved identifiers. Use this when you have product or variant IDs from search results or deep links, need to resolve multiple identifiers in a single request, or are validating cart items against current catalog data.

search_shop_policies_and_faqs
Use this tool to search for formal policies and FAQ content for a specific Shopify store. This includes finding information regarding return and refund policies, shipping policies, privacy policies, terms of service, legal notices, purchase options cancellation policies, or common buyer questions about shipping times, returns, exchanges, sizing, materials, care instructions, order tracking guidance, warranty, and store practices.The required arguments are store_domain and query, and the optional argument is context for short clarifications when needed. For both FAQs and formal policies, the query argument must always be formatted as a natural language search query.Make exactly one direct lookup per requested topic using a natural language query like "what is the shipping and delivery," "what is the return and refund policy,". Do not combine unrelated searches, perform repeated exploratory searches, or batch multiple requests into a single call unless explicitly instructed. 

Cart MCP <-INSTRUCTION NOT A TOOL
A cart holds line items, localization context, and buyer information.
Use carts to maintain selected items across conversations, show estimated totals before purchase, or hand off a cart through a returned 'continue_url' without starting a checkout session.
Cart tools accept unauthenticated requests.

create_cart
Create a new cart with line items and optional buyer context.
Use this when the buyer asks to place selected catalog products into a cart.
The response includes the merchant-assigned cart ID, validated line items, estimated totals, and a 'continue_url' for continuing on the merchant's storefront.

get_cart
Retrieve the current state of an existing cart.
Use this to review its contents, refresh estimated totals, or obtain the current full state before an update.
If the cart does not exist or has expired, the tool may return a successful JSON-RPC result whose messages array contains an unrecoverable error with code 'not_found'.
Check the returned business outcome rather than assuming that a successful transport response means the cart exists.

update_cart
Replace the contents of an existing cart.
This tool uses PUT semantics: every request replaces the cart's full state with the supplied payload.
Omitted fields, including 'line_items' or 'context', are removed. There is no server-side merge of partial updates.
Preserve all existing state that the user has not asked to change.

cancel_cart
Cancel an active cart.
Requires meta["idempotency-key"] containing a UUID, in addition to meta["ucp-agent"].
Cancellation removes the cart from storage. Subsequent requests for the same cart ID return a 'not_found' business outcome.
Use this only when the user requests or clearly authorizes cancellation.

create_checkout
Create a new checkout session with line items, buyer information, and fulfillment preferences. Use this tool when a buyer is ready to purchase items and you need to initiate the checkout process. The response includes a continue_url for handing off to a trusted UI. When to use: Buyer says "I want to buy this item", or Agent has collected enough information to start checkout, and Buyer confirms their cart and wants to proceed.

get_checkout
Retrieve the current state of an existing checkout session. Use this tool to check the status of a checkout, see updated totals after changes, or verify what information is still needed before completion. When to use: Need to refresh checkout state after buyer returns, Want to show current totals and line items, or Checking if checkout is ready for payment.

update_checkout
Update an existing checkout session with new information. Use this tool to modify line items, update shipping address, change fulfillment method, or add buyer information before completing the checkout. When to use: Buyer wants to change quantity or remove items, Buyer provides or updates shipping address, Need to update buyer email or contact info, or Changing a delivery option. Caution: update_checkout uses PUT semantics. Each request replaces the full checkout state with the payload you send. Omit a field (for example line_items or buyer) and it is removed from the checkout. There is no server-side merge of partial updates. Before sending an update, remove response-only fields from the payload. checkout.buyer.country_code isn't accepted as input. checkout.payment.instruments[].display is response-only. For fulfillment updates, checkout.fulfillment.methods[].id is optional, but line_item_ids is required.

complete_checkout
Finalize the purchase and complete the checkout session using provided payment instruments. This action requires an idempotency key to prevent duplicate charges."
server2.ts: "Submit payment and place the order. Requires meta[\\\"idempotency-key\\\"] (UUID) in addition to meta[\\\"ucp-agent\\\"]. Use this tool when the checkout is ready and the buyer has authorized payment. This finalizes the transaction and creates an order. When to use: Checkout status is ready_for_complete, Buyer has reviewed and confirmed the order, or Payment credential has been collected.

cancel_checkout
Cancel an active checkout session. Requires meta[\\\"idempotency-key\\\"] (UUID) in addition to meta[\\\"ucp-agent\\\"]. Use this tool when a buyer abandons the checkout or explicitly requests cancellation. Canceled checkouts can't be resumed. Cancellation expires the checkout immediately. The canceled checkout resource includes expires_at, which is set to the cancellation timestamp. When to use: Buyer explicitly cancels the order, Session has been abandoned, or Need to start fresh with a new checkout.

get_ui_state
Retrieve the current state of the Commerce Layer.
Use this tool to verify what the buyer is currently seeing on their screen, including selected product variants, cart contents, and the current stage of the shopping progression.
Use this before making claims about what is on the buyer's screen, especially after a long, resumed, or interrupted conversation.`;

const OPENAI_TOOLS = [
  {
    type: "image_generation",
    model: "gpt-image-2.5-sunburst",
    size: "1024x1024",
    quality: "medium",
    output_format: "webp",
    background: "auto",
    moderation: "low",
    partial_images: 3
  },
  {
    type: "mcp",
    server_label: "my_master_server",
    server_url: MASTER_MCP_URL,
    server_description: "Shopping",
    allowed_tools: [
      "search_catalog",
      "lookup_catalog",
      "get_product",
      "create_cart",
      "get_cart",
      "update_cart",
      "cancel_cart",
      "create_checkout",
      "get_checkout",
      "update_checkout",
      "complete_checkout",
      "cancel_checkout",
      "search_shop_policies_and_faqs"
    ],
    require_approval: "never"
  }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    const headers = { ...getCorsHeaders(request), "Content-Type": "application/json" };

    try {
      // Route: Chat endpoint (POST /chat or /)
      if (url.pathname === "/chat" || url.pathname === "/") {
        if (request.method === "GET") {
          // Conversation history lookup
          const conversationId = url.searchParams.get("conversation_id");
          if (conversationId && env.CHAT_HISTORY) {
            const history = await env.CHAT_HISTORY.get(conversationId, { type: "json" }) || [];
            return new Response(JSON.stringify({ messages: history }), { headers });
          }
          return new Response(JSON.stringify({ status: "ready", service: "Storefront AI Concierge" }), { headers });
        }

        if (request.method === "POST") {
          return await handleChatRequest(request, env, ctx, headers);
        }
      }

      // Route: Admin Settings (GET /admin/settings, POST /admin/settings)
      if (url.pathname === "/admin/settings") {
        return await handleAdminSettings(request, env, headers);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers });
    }
  }
};

/**
 * Handle incoming shopper chat request
 */
async function handleChatRequest(request, env, ctx, headers) {
  const body = await request.json();
  const userMessage = body.message;
  const conversationId = body.conversation_id || `conv_${Date.now()}`;

  if (!userMessage) {
    return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers });
  }

  // Resolve Store Domain
  let rawOrigin = body.store_domain || request.headers.get("X-Shopify-Shop-Domain") || request.headers.get("Origin") || "";
  let storeDomain = "";
  try {
    storeDomain = rawOrigin.startsWith("http") ? new URL(rawOrigin).hostname : rawOrigin;
  } catch {
    storeDomain = rawOrigin;
  }
  if (!storeDomain) storeDomain = "musarty.com";

  // Fetch Merchant Settings (BYOK or Platform)
  const merchantConfig = await getMerchantConfig(storeDomain, env);

  // Load conversation history from KV (if available)
  let history = [];
  if (env.CHAT_HISTORY) {
    history = (await env.CHAT_HISTORY.get(conversationId, { type: "json" })) || [];
  }
  history.push({ role: "user", content: userMessage });

  let assistantText = "";

  try {
    // Route by Provider: OpenAI vs. Gemini
    if (merchantConfig.provider === "gemini") {
      assistantText = await executeGemini({
        userMessage,
        history,
        storeDomain,
        apiKey: merchantConfig.apiKey,
        model: merchantConfig.model || "gemini-3.6-flash"
      });
    } else {
      assistantText = await executeOpenAI({
        history,
        storeDomain,
        apiKey: merchantConfig.apiKey,
        model: merchantConfig.model || "gpt-5.5"
      });
    }
  } catch (err) {
    // Send separate alert to merchant via Resend or Cloudflare Email (never to customer)
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(sendMerchantErrorAlert({
        storeDomain,
        conversationId,
        userMessage,
        error: err.message || String(err),
        recipientEmail: merchantConfig.notificationEmail || env.ADMIN_ALERT_EMAIL,
        env
      }));
    }

    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers });
  }

  // Save updated history
  history.push({ role: "assistant", content: assistantText });
  if (env.CHAT_HISTORY) {
    await env.CHAT_HISTORY.put(conversationId, JSON.stringify(history.slice(-20)), { expirationTtl: 86400 * 7 });
  }

  return new Response(JSON.stringify({
    conversation_id: conversationId,
    message: assistantText,
    status: "completed"
  }), { status: 200, headers });
}

/**
 * Execute OpenAI Responses API with Master MCP
 */
async function executeOpenAI({ history, storeDomain, apiKey, model }) {
  if (!apiKey) {
    throw new Error("Missing OpenAI API Key. Please configure your key in settings.");
  }

  const input = [
    {
      role: "developer",
      content: [
        {
          type: "input_text",
          text: `${DEVELOPER_PROMPT}\n\nActive Storefront: "${storeDomain}". For all tool calls, pass shop_domain: "${storeDomain}" (or store_domain: "${storeDomain}").`
        }
      ]
    }
  ];

  for (const m of history) {
    input.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: [
        {
          type: m.role === "assistant" ? "output_text" : "input_text",
          text: typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        }
      ]
    });
  }

  const payload = {
    model: model || "gpt-5.5",
    input,
    text: { format: { type: "text" }, verbosity: "medium" },
    reasoning: { effort: "medium", mode: "standard", summary: "auto" },
    tools: OPENAI_TOOLS,
    store: true,
    include: ["reasoning.encrypted_content", "web_search_call.action.sources"]
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  let text = "";

  if (data.output) {
    for (const item of data.output) {
      if (item.type === "message" && item.content) {
        for (const c of item.content) {
          if (c.type === "output_text" && c.text) text += c.text;
        }
      }
      if (item.type === "image_generation_call") {
        const imgUrl = item.image?.url || item.result?.url;
        if (imgUrl) {
          text += `\n\n![Virtual Try-On](${imgUrl})\n*Virtual Try-On Preview*\n`;
        }
      }
    }
  }

  if (!text && data.output_text) {
    text = data.output_text;
  }

  return text;
}

/**
 * Execute Gemini with dynamic Master MCP tool introspection & execution loop
 */
async function executeGemini({ history, storeDomain, apiKey, model }) {
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please configure your key in settings.");
  }

  // 1. Introspect tools dynamically from Master MCP
  const mcpData = await callMasterMcp({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const rawTools = mcpData?.result?.tools || [];

  // Map MCP inputSchema to Gemini functionDeclarations
  const functionDeclarations = rawTools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.inputSchema
  }));

  const systemInstruction = {
    parts: [{ text: `${DEVELOPER_PROMPT}\n\nActive Storefront: "${storeDomain}". For all tool calls, pass shop_domain: "${storeDomain}" (or store_domain: "${storeDomain}").` }]
  };

  // Build Gemini message contents
  const contents = history.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }]
  }));

  const activeModel = model || "gemini-3.6-flash";
  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;

  // Call Gemini
  let geminiRes = await fetch(geminiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction,
      tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined
    })
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    throw new Error(`Gemini API error (${geminiRes.status}): ${errText}`);
  }

  let geminiJson = await geminiRes.json();
  let candidate = geminiJson.candidates?.[0];
  let parts = candidate?.content?.parts || [];

  // Check for Function Call Loop
  let functionCallPart = parts.find(p => p.functionCall);
  let iterations = 0;

  while (functionCallPart && iterations < 3) {
    iterations++;
    const call = functionCallPart.functionCall;
    const callArgs = call.args || {};

    // Auto-fill shop_domain if missing
    if (!callArgs.shop_domain && !callArgs.store_domain) {
      callArgs.shop_domain = storeDomain;
      callArgs.store_domain = storeDomain;
    }
    if (!callArgs.meta) {
      callArgs.meta = { "ucp-agent": { profile: UCP_PROFILE_URL } };
    }

    // Execute tool directly against Master MCP server via JSON-RPC
    const toolResult = await callMasterMcp({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: call.name,
        arguments: callArgs
      }
    });

    let responsePayload = toolResult.result || { isError: true, content: [{ text: "No result" }] };

    // Append model function call and user function response to conversation
    contents.push({
      role: "model",
      parts: [functionCallPart]
    });

    contents.push({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: call.name,
            response: responsePayload
          }
        }
      ]
    });

    // Call Gemini again with function output
    geminiRes = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction,
        tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined
      })
    });

    if (!geminiRes.ok) break;

    geminiJson = await geminiRes.json();
    candidate = geminiJson.candidates?.[0];
    parts = candidate?.content?.parts || [];
    functionCallPart = parts.find(p => p.functionCall);
  }

  const textPart = parts.find(p => p.text);
  return textPart ? textPart.text : "";
}

/**
 * Resolve Merchant Config (Explicit BYOK vs Platform - ZERO Silent Fallbacks)
 */
async function getMerchantConfig(shopDomain, env) {
  let config = null;

  if (env.MERCHANT_SETTINGS) {
    config = await env.MERCHANT_SETTINGS.get(shopDomain, { type: "json" });
  }

  if (config) {
    if (config.provider === "platform") {
      const platformKey = env.OPENAI_API_KEY || env.GEMINI_API_KEY;
      if (!platformKey) {
        throw new Error("Platform API key is not configured on this server.");
      }
      return {
        provider: env.OPENAI_API_KEY ? "openai" : "gemini",
        apiKey: platformKey,
        model: config.model || (env.OPENAI_API_KEY ? "gpt-5.5" : "gemini-3.6-flash")
      };
    }

    // Merchant chose their own key (BYOK) - strictly use their key
    if (!config.apiKey) {
      throw new Error(`No API key configured for ${shopDomain}. Configure your key in the app admin.`);
    }

    return {
      provider: config.provider || "openai",
      apiKey: config.apiKey,
      model: config.model || (config.provider === "gemini" ? "gemini-3.6-flash" : "gpt-5.5")
    };
  }

  // Initial setup: use platform key if provided in environment
  if (env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || "gpt-5.5"
    };
  }
  if (env.GEMINI_API_KEY) {
    return {
      provider: "gemini",
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || "gemini-3.6-flash"
    };
  }

  throw new Error(`No API key configured for ${shopDomain}. Please configure your API key in app settings.`);
}

/**
 * Handle Admin Settings Save & Retrieval
 */
async function handleAdminSettings(request, env, headers) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const shop = url.searchParams.get("shop");
    if (!shop) {
      return new Response(JSON.stringify({ error: "Missing shop parameter" }), { status: 400, headers });
    }
    const config = env.MERCHANT_SETTINGS ? (await env.MERCHANT_SETTINGS.get(shop, { type: "json" })) : null;
    const safeConfig = config ? {
      provider: config.provider || "openai",
      model: config.model || "gpt-5.5",
      hasCustomKey: Boolean(config.apiKey)
    } : { provider: "openai", model: "gpt-5.5", hasCustomKey: false };

    return new Response(JSON.stringify(safeConfig), { headers });
  }

  if (request.method === "POST") {
    const payload = await request.json();
    const { shop, provider, apiKey, model } = payload;
    if (!shop) {
      return new Response(JSON.stringify({ error: "Missing shop parameter" }), { status: 400, headers });
    }

    if (env.MERCHANT_SETTINGS) {
      const existing = (await env.MERCHANT_SETTINGS.get(shop, { type: "json" })) || {};
      const updated = {
        provider: provider || existing.provider || "openai",
        model: model || existing.model || "gpt-5.5",
        apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
        updatedAt: new Date().toISOString()
      };
      await env.MERCHANT_SETTINGS.put(shop, JSON.stringify(updated));
    }

    return new Response(JSON.stringify({ status: "success", message: "Settings saved successfully" }), { headers });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
}

/**
 * Call Master MCP server and parse JSON or data: frames
 */
async function callMasterMcp(payload) {
  const res = await fetch(MASTER_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (text.includes("data: ")) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          return JSON.parse(line.slice(6));
        } catch (_) {}
      }
    }
  }
  return JSON.parse(text);
}

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, X-Shopify-Shop-Domain, Authorization",
    "Access-Control-Allow-Credentials": "true"
  };
}

/**
 * Send error alert to merchant/admin via Resend or Cloudflare Email (never to customer)
 */
async function sendMerchantErrorAlert({ storeDomain, conversationId, userMessage, error, recipientEmail, env }) {
  const targetEmail = recipientEmail || env.ADMIN_ALERT_EMAIL;
  if (!targetEmail) {
    console.error("[Alert] No recipient email configured for error alerts.");
    return;
  }

  const subject = `[Action Required] AI Concierge Error on ${storeDomain}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #dc2626; margin-top: 0;">Storefront AI Concierge Alert</h2>
      <p>An error occurred while serving a shopper on <strong>${storeDomain}</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 140px;">Store Domain:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${storeDomain}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Timestamp:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toUTCString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Conversation ID:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${conversationId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Shopper Message:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${userMessage}</td>
        </tr>
      </table>

      <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; padding: 12px; margin-top: 16px;">
        <h4 style="color: #991b1b; margin: 0 0 6px 0;">Error Details:</h4>
        <pre style="margin: 0; font-size: 13px; color: #7f1d1d; white-space: pre-wrap; word-break: break-all;">${error}</pre>
      </div>

      <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">
        <strong>Note:</strong> This error was NOT shown to the customer. Please verify your API key, billing credits, or store settings in your App Dashboard.
      </p>
    </div>
  `;

  // 1. Cloudflare Native Email Sending binding
  if (env.EMAIL && typeof env.EMAIL.send === 'function') {
    try {
      await env.EMAIL.send({
        to: targetEmail,
        from: "welcome@facetimefy.com",
        subject,
        html,
        text: `AI Concierge Alert for ${storeDomain}:\n${error}\nShopper Message: ${userMessage}`
      });
      console.log(`[Alert] Sent Cloudflare Email to ${targetEmail}`);
      return;
    } catch (e) {
      console.error("[Alert] Failed sending Cloudflare Email:", e);
    }
  }

  // 2. Resend API
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.ALERT_FROM_EMAIL || "onboarding@resend.dev",
          to: targetEmail,
          subject,
          html
        })
      });
      if (res.ok) {
        console.log(`[Alert] Sent Resend email to ${targetEmail}`);
      } else {
        const errText = await res.text();
        console.error("[Alert] Resend API error:", errText);
      }
    } catch (e) {
      console.error("[Alert] Failed sending Resend email:", e);
    }
  }
}

