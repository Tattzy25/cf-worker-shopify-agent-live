/**
 * Cloudflare Edge Worker: Storefront AI Concierge & Merchant Settings API
 * 
 * Clean, lightweight, zero-fallback production router:
 * - /admin/validate-key : Live, zero-token validation for OpenAI and Gemini keys
 * - /admin/settings     : Merchant configuration persistence (D1 + KV edge cache)
 * - /chat               : Storefront AI shopping assistant endpoint
 */
import { recordAndAlertError, dispatchAlertEmail, handleInboundEmail } from "./email.js";
import { buildSystemPrompt, OPENAI_TOOLS, MASTER_MCP_URL } from "./prompt.js";

export default {
  async fetch(request, env) {
    // 1. CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request)
      });
    }

    const url = new URL(request.url);
    const headers = {
      ...getCorsHeaders(request),
      "Content-Type": "application/json"
    };

    try {
      // -------------------------------------------------------------
      // ROUTE: Live On-The-Spot API Key Validation
      // POST /admin/validate-key
      // -------------------------------------------------------------
      if (url.pathname === "/admin/validate-key" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const { provider, key, shop: bodyShop, notification_email: bodyEmail } = body;
        const shop = bodyShop || request.headers.get("X-Shopify-Shop-Domain") || url.searchParams.get("shop") || null;

        if (!key || typeof key !== "string" || key.trim().length === 0) {
          return new Response(
            JSON.stringify({ valid: false, error: "API key cannot be empty" }),
            { status: 400, headers }
          );
        }

        const trimmedKey = key.trim();

        // Validate OpenAI Key
        if (provider === "openai") {
          try {
            const res = await fetch("https://api.openai.com/v1/models", {
              headers: { Authorization: `Bearer ${trimmedKey}` }
            });

            if (res.ok) {
              return new Response(JSON.stringify({ valid: true }), { headers });
            }

            const errorData = await res.json().catch(() => null);
            const upstreamError = errorData?.error?.message || errorData?.error || `OpenAI returned HTTP ${res.status}`;

            await recordAndAlertError(env, {
              shop,
              provider: "openai",
              rawError: upstreamError,
              context: "OpenAI Key Validation",
              merchantEmail: bodyEmail,
              sendEmail: false
            });

            return new Response(
              JSON.stringify({
                valid: false,
                error: upstreamError
              }),
              { headers }
            );
          } catch (err) {
            await recordAndAlertError(env, {
              shop,
              provider: "network",
              rawError: err?.message || String(err),
              context: "OpenAI Network Connection Failure",
              sendEmail: false
            });
            return new Response(
              JSON.stringify({ valid: false, error: "Failed to connect to OpenAI service" }),
              { headers }
            );
          }
        }

        // Validate Google Gemini Key
        if (provider === "gemini") {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`
            );

            if (res.ok) {
              return new Response(JSON.stringify({ valid: true }), { headers });
            }

            const errorData = await res.json().catch(() => null);
            const upstreamError = errorData?.error?.message || errorData?.message || `Google Gemini returned HTTP ${res.status}`;

            await recordAndAlertError(env, {
              shop,
              provider: "gemini",
              rawError: upstreamError,
              context: "Google Gemini Key Validation",
              merchantEmail: bodyEmail,
              sendEmail: false
            });

            return new Response(
              JSON.stringify({
                valid: false,
                error: upstreamError
              }),
              { headers }
            );
          } catch (err) {
            await recordAndAlertError(env, {
              shop,
              provider: "network",
              rawError: err?.message || String(err),
              context: "Google Gemini Network Connection Failure",
              sendEmail: false
            });
            return new Response(
              JSON.stringify({ valid: false, error: "Failed to connect to Google Gemini service" }),
              { headers }
            );
          }
        }

        return new Response(
          JSON.stringify({ valid: false, error: "Unsupported provider" }),
          { status: 400, headers }
        );
      }

      // -------------------------------------------------------------
      // ROUTE: Live On-The-Spot MCP Server Validation & Tool Discovery
      // POST /admin/validate-mcp
      // -------------------------------------------------------------
      if (url.pathname === "/admin/validate-mcp" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const { url: serverUrl, headers: customHeaders, shop: bodyShop, notification_email: bodyEmail } = body;
        const shop = bodyShop || request.headers.get("X-Shopify-Shop-Domain") || url.searchParams.get("shop") || null;

        if (!serverUrl || typeof serverUrl !== "string" || !serverUrl.startsWith("http")) {
          return new Response(
            JSON.stringify({ valid: false, error: "Please enter a valid HTTP(S) server URL" }),
            { status: 400, headers }
          );
        }

        try {
          const fetchHeaders = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
          };
          if (customHeaders && typeof customHeaders === "object") {
            Object.assign(fetchHeaders, customHeaders);
          }

          // Query MCP tools list via JSON-RPC 2.0
          const mcpRes = await fetch(serverUrl, {
            method: "POST",
            headers: fetchHeaders,
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "tools/list",
              params: {}
            })
          });

          if (!mcpRes.ok) {
            const upstreamError = `MCP server returned HTTP ${mcpRes.status}`;
            await recordAndAlertError(env, {
              shop,
              provider: "mcp",
              rawError: upstreamError,
              context: "MCP Server Validation",
              merchantEmail: bodyEmail,
              sendEmail: false
            });

            if (env.ANALYTICS_ENGINE_CHAT) {
              try {
                env.ANALYTICS_ENGINE_CHAT.writeDataPoint({
                  indexes: [shop || "unknown"],
                  blobs: ["mcp_validation", serverUrl, "error", upstreamError],
                  doubles: [0, 1]
                });
              } catch (_) {}
            }

            return new Response(
              JSON.stringify({
                valid: false,
                error: upstreamError
              }),
              { headers }
            );
          }

          const resText = await mcpRes.text();
          let tools = [];

          // Handle SSE streamable HTTP output (event: message \n data: {...})
          if (resText.includes("data:")) {
            const dataLines = resText.split("\n").filter(l => l.startsWith("data:"));
            for (const line of dataLines) {
              try {
                const parsed = JSON.parse(line.replace(/^data:\s*/, ""));
                if (parsed.result?.tools) {
                  tools = parsed.result.tools;
                  break;
                }
              } catch (_) {}
            }
          } else {
            try {
              const parsed = JSON.parse(resText);
              if (parsed.result?.tools) tools = parsed.result.tools;
            } catch (_) {}
          }

          if (env.ANALYTICS_ENGINE_CHAT) {
            try {
              env.ANALYTICS_ENGINE_CHAT.writeDataPoint({
                indexes: [shop || "unknown"],
                blobs: ["mcp_validation", serverUrl, "success", String(tools.length)],
                doubles: [tools.length, 1]
              });
            } catch (_) {}
          }

          // Asynchronous Queue Offload: Enqueue background tool cache sync
          if (env.FTC_QUEUE && shop) {
            try {
              await env.FTC_QUEUE.send({
                type: "MCP_SYNC",
                shop,
                serverUrl,
                customHeaders: customHeaders || {},
                serverId: body.id || null
              });
            } catch (_) {}
          }

          return new Response(
            JSON.stringify({
              valid: true,
              tools
            }),
            { headers }
          );
        } catch (err) {
          const errMsg = `Failed to connect to MCP server: ${err?.message || String(err)}`;
          await recordAndAlertError(env, {
            shop,
            provider: "mcp",
            rawError: errMsg,
            context: "MCP Network Connection Failure",
            merchantEmail: bodyEmail,
            sendEmail: false
          });

          if (env.ANALYTICS_ENGINE_CHAT) {
            try {
              env.ANALYTICS_ENGINE_CHAT.writeDataPoint({
                indexes: [shop || "unknown"],
                blobs: ["mcp_validation", serverUrl, "error", errMsg],
                doubles: [0, 1]
              });
            } catch (_) {}
          }

          return new Response(
            JSON.stringify({
              valid: false,
              error: errMsg
            }),
            { headers }
          );
        }
      }

      // -------------------------------------------------------------
      // ROUTE: Merchant Settings (Save & Load via KV)
      // /admin/settings
      // -------------------------------------------------------------
      if (url.pathname === "/admin/settings") {
        // GET: Load Settings for Shop
        if (request.method === "GET") {
          const shop = url.searchParams.get("shop") || request.headers.get("X-Shopify-Shop-Domain");
          if (!shop) {
            return new Response(JSON.stringify({ error: "Missing store identifier" }), { status: 400, headers });
          }

          // Strict KV read
          const config = await env.MERCHANT_SETTINGS.get(shop, { type: "json" });

          const defaultOpenAiModel = env.DEFAULT_OPENAI_MODEL || "gpt-5.5";
          const defaultGeminiModel = env.DEFAULT_GEMINI_MODEL || "gemini-3.8-flash";

          if (!config) {
            return new Response(JSON.stringify({
              provider_mode: "facetimefy",
              primary_choice: "openai_primary",
              openai_model: defaultOpenAiModel,
              gemini_model: defaultGeminiModel,
              has_openai_key: false,
              has_gemini_key: false,
              notification_email: "",
              persona_tone: "friendly",
              greeting_message: "",
              system_prompt: "",
              mcp_servers: []
            }), { headers });
          }

          // Return settings with secret keys strictly masked
          return new Response(JSON.stringify({
            provider_mode: config.provider_mode || "facetimefy",
            primary_choice: config.primary_choice || "openai_primary",
            openai_model: config.openai_model || defaultOpenAiModel,
            gemini_model: config.gemini_model || defaultGeminiModel,
            has_openai_key: Boolean(config.openai_api_key),
            has_gemini_key: Boolean(config.gemini_api_key),
            notification_email: config.notification_email || "",
            persona_tone: config.persona_tone || "friendly",
            greeting_message: config.greeting_message || "",
            system_prompt: config.system_prompt || "",
            mcp_servers: config.mcp_servers || []
          }), { headers });
        }

        // POST: Save Settings
        if (request.method === "POST") {
          const payload = await request.json();
          const shop = payload.shop || request.headers.get("X-Shopify-Shop-Domain") || url.searchParams.get("shop");
          if (!shop) {
            return new Response(JSON.stringify({ error: "Missing store identifier" }), { status: 400, headers });
          }

          // Strict KV read of existing config
          const existing = await env.MERCHANT_SETTINGS.get(shop, { type: "json" });

          const defaultOpenAiModel = env.DEFAULT_OPENAI_MODEL || "gpt-5.5";
          const defaultGeminiModel = env.DEFAULT_GEMINI_MODEL || "gemini-3.8-flash";

          const openaiKey = payload.openai_api_key !== undefined
            ? (payload.openai_api_key?.trim() || null)
            : (existing?.openai_api_key || null);

          const geminiKey = payload.gemini_api_key !== undefined
            ? (payload.gemini_api_key?.trim() || null)
            : (existing?.gemini_api_key || null);

          let mcpServers = existing?.mcp_servers || [];
          if (payload.mcp_servers !== undefined) {
            try {
              mcpServers = typeof payload.mcp_servers === "string" ? JSON.parse(payload.mcp_servers) : payload.mcp_servers;
            } catch (_) {}
          }

          const record = {
            shop,
            provider_mode: payload.provider_mode || "facetimefy",
            primary_choice: payload.primary_choice || existing?.primary_choice || "openai_primary",
            openai_model: payload.openai_model || existing?.openai_model || defaultOpenAiModel,
            gemini_model: payload.gemini_model || existing?.gemini_model || defaultGeminiModel,
            openai_api_key: openaiKey,
            gemini_api_key: geminiKey,
            notification_email: payload.notification_email || existing?.notification_email || "",
            persona_tone: payload.persona_tone || existing?.persona_tone || "friendly",
            greeting_message: payload.greeting_message || existing?.greeting_message || "",
            system_prompt: payload.system_prompt || existing?.system_prompt || "",
            mcp_servers: mcpServers,
            updated_at: new Date().toISOString()
          };

          // Strict KV write
          await env.MERCHANT_SETTINGS.put(shop, JSON.stringify(record));

          // Queue Producer: Offload asynchronous D1 sync
          if (env.FTC_QUEUE) {
            await env.FTC_QUEUE.send({
              type: "MERCHANT_SETTINGS_SYNC",
              shop,
              data: record
            });
          }

          return new Response(JSON.stringify({ success: true, saved: true }), { headers });
        }
      }

      // -------------------------------------------------------------
      // ROUTE: Storefront AI Chat Endpoint
      // GET /chat (history) | POST /chat (messaging)
      // -------------------------------------------------------------
      if (url.pathname === "/chat" || url.pathname === "/apps/ftc/chat" || url.pathname === "/apps/facetimefy/chat") {
        if (request.method === "GET") {
          const conversationId = url.searchParams.get("conversation_id");
          if (!conversationId || !env.CHAT_HISTORY) {
            return new Response(JSON.stringify({ messages: [] }), { headers });
          }
          const history = (await env.CHAT_HISTORY.get(conversationId, { type: "json" })) || [];
          return new Response(JSON.stringify({ messages: history }), { headers });
        }

        if (request.method === "POST") {
          const body = await request.json().catch(() => ({}));
          const userMessage = body.message?.trim();
          const shop = body.store_domain || request.headers.get("X-Shopify-Shop-Domain") || url.searchParams.get("shop") || "default";

          if (!userMessage) {
            return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers });
          }

          let config = null;
          if (env.MERCHANT_SETTINGS) {
            config = await env.MERCHANT_SETTINGS.get(shop, { type: "json" });
          }

          const providerMode = config?.provider_mode || "facetimefy";
          let provider = "openai";
          let apiKey = env.OPENAI_API_KEY;
          let modelName = env.DEFAULT_OPENAI_MODEL || "gpt-5.5";

          if (providerMode === "openai") {
            provider = "openai";
            apiKey = config.openai_api_key;
            modelName = config.openai_model || "gpt-5.5";
            if (!apiKey) {
              await recordAndAlertError(env, {
                shop,
                provider: "openai",
                rawError: "Merchant Bring-Your-Own-Key (OpenAI) is missing or unconfigured.",
                context: "Storefront Chat Execution",
                merchantEmail: config.notification_email
              });
              return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 500, headers });
            }
          } else if (providerMode === "gemini") {
            provider = "gemini";
            apiKey = config.gemini_api_key;
            modelName = config.gemini_model || "gemini-3.8-flash";
            if (!apiKey) {
              await recordAndAlertError(env, {
                shop,
                provider: "gemini",
                rawError: "Merchant Bring-Your-Own-Key (Gemini) is missing or unconfigured.",
                context: "Storefront Chat Execution",
                merchantEmail: config.notification_email
              });
              return new Response(JSON.stringify({ error: "Service unavailable" }), { status: 500, headers });
            }
          } else {
            provider = "openai";
            apiKey = env.OPENAI_API_KEY;
            modelName = env.DEFAULT_OPENAI_MODEL || "gpt-5.5";
            if (!apiKey) {
              return new Response(JSON.stringify({ error: "Platform key unconfigured" }), { status: 500, headers });
            }
          }

          const convId = body.conversation_id || ("conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7));
          let history = [];
          if (env.CHAT_HISTORY) {
            history = (await env.CHAT_HISTORY.get(convId, { type: "json" })) || [];
          }

          const systemPrompt = buildSystemPrompt({
            storeDomain: shop,
            agentProfileUrl: config?.agent_profile_url || "",
            customPrompt: config?.system_prompt || ""
          });

          let reply = "";

          if (provider === "openai") {
            const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: modelName,
                messages: [
                  { role: "system", content: systemPrompt },
                  ...history,
                  { role: "user", content: userMessage }
                ]
              })
            });

            if (!aiRes.ok) {
              const errBody = await aiRes.text().catch(() => "");
              await recordAndAlertError(env, {
                shop,
                provider: "openai",
                rawError: `OpenAI API error (${aiRes.status}): ${errBody}`,
                context: "Storefront Chat Completion",
                merchantEmail: config?.notification_email
              });
              return new Response(JSON.stringify({ error: "Failed to generate response" }), { status: 502, headers });
            }

            const aiData = await aiRes.json();
            reply = aiData.choices?.[0]?.message?.content || "";
          } else if (provider === "gemini") {
            const aiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: systemPrompt }] },
                  contents: [
                    ...history.map(h => ({
                      role: h.role === "assistant" ? "model" : "user",
                      parts: [{ text: h.content }]
                    })),
                    { role: "user", parts: [{ text: userMessage }] }
                  ]
                })
              }
            );

            if (!aiRes.ok) {
              const errBody = await aiRes.text().catch(() => "");
              await recordAndAlertError(env, {
                shop,
                provider: "gemini",
                rawError: `Gemini API error (${aiRes.status}): ${errBody}`,
                context: "Storefront Chat Completion",
                merchantEmail: config?.notification_email
              });
              return new Response(JSON.stringify({ error: "Failed to generate response" }), { status: 502, headers });
            }

            const aiData = await aiRes.json();
            reply = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }

          history.push({ role: "user", content: userMessage });
          history.push({ role: "assistant", content: reply });

          if (env.CHAT_HISTORY) {
            await env.CHAT_HISTORY.put(convId, JSON.stringify(history), { expirationTtl: 604800 });
          }

          if (env.CONVERSATIONS_BUCKET) {
            const r2Key = `conversations/${shop}/${convId}.json`;
            await env.CONVERSATIONS_BUCKET.put(r2Key, JSON.stringify({
              shop,
              conversation_id: convId,
              messages: history,
              updated_at: new Date().toISOString()
            })).catch(() => {});
          }

          if (env.DB) {
            await env.DB.prepare(`
              INSERT INTO conversations (id, shop, message_count, r2_key, updated_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                message_count = excluded.message_count,
                updated_at = CURRENT_TIMESTAMP
            `).bind(convId, shop, history.length, `conversations/${shop}/${convId}.json`).run().catch(() => {});
          }

          if (env.ANALYTICS_ENGINE_CHAT) {
            try {
              env.ANALYTICS_ENGINE_CHAT.writeDataPoint({
                indexes: [shop],
                blobs: ["chat_turn", provider, "success", modelName],
                doubles: [1, 0, 1]
              });
            } catch (_) {}
          }

          return new Response(JSON.stringify({
            conversation_id: convId,
            message: reply,
            role: "assistant"
          }), { headers });
        }
      }

      // -------------------------------------------------------------
      // ROUTE: Smart Events & Storefront Analytics Telemetry
      // POST /analytics/event
      // -------------------------------------------------------------
      if (url.pathname === "/analytics/event" || url.pathname === "/apps/ftc/analytics/event" || url.pathname === "/apps/facetimefy/analytics/event") {
        if (request.method === "POST") {
          const payload = await request.json().catch(() => ({}));
          const shop = payload.store_domain || request.headers.get("X-Shopify-Shop-Domain") || "default";

          if (env.ANALYTICS_ENGINE_CHAT && payload.event_type) {
            try {
              env.ANALYTICS_ENGINE_CHAT.writeDataPoint({
                indexes: [shop],
                blobs: [
                  String(payload.event_type || ""),
                  String(payload.conversation_id || ""),
                  String(payload.page_url || ""),
                  String(payload.product_title || "")
                ],
                doubles: [Number(payload.price || 0), 1]
              });
            } catch (_) {}
          }

          return new Response(JSON.stringify({ received: true }), { headers });
        }
      }

      // Default Health Check
      return new Response(JSON.stringify({ status: "ready", worker: "shop-chat-agent-worker" }), { headers });
    } catch (err) {
      console.error("[Worker Unhandled Error]", err);
      const url = new URL(request.url);
      const shop = url.searchParams.get("shop") || request.headers.get("X-Shopify-Shop-Domain") || null;
      await recordAndAlertError(env, {
        shop,
        provider: "internal",
        rawError: err?.message || String(err),
        context: "Worker Router Unhandled"
      });
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers
      });
    }
  },

  /**
   * Cloudflare Queue Consumer Handler
   * Consumes messages from the "facetimefy" queue with auto-retry and DLQ fallback
   */
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        const body = message.body;

        // Subscribed Event: MERCHANT_SETTINGS_SYNC
        if (body?.type === "MERCHANT_SETTINGS_SYNC" && env.DB) {
          const { shop, data } = body;
          await env.DB.prepare(`
            INSERT INTO merchants (
              shop,
              notification_email,
              provider,
              model,
              api_key,
              gemini_api_key,
              gemini_model,
              primary_choice,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(shop) DO UPDATE SET
              notification_email = CASE WHEN excluded.notification_email != '' THEN excluded.notification_email ELSE merchants.notification_email END,
              provider = excluded.provider,
              model = excluded.model,
              api_key = excluded.api_key,
              gemini_api_key = excluded.gemini_api_key,
              gemini_model = excluded.gemini_model,
              primary_choice = excluded.primary_choice,
              updated_at = CURRENT_TIMESTAMP
          `).bind(
            shop,
            data.notification_email || "",
            data.provider_mode || "facetimefy",
            data.openai_model || "gpt-5.5",
            data.openai_api_key || null,
            data.gemini_api_key || null,
            data.gemini_model || "gemini-3.8-flash",
            data.primary_choice || "openai_primary"
          ).run();
        }

        message.ack();
      } catch (err) {
        console.error(`[Queue Error] Failed processing message ${message.id}:`, err);
        const body = message.body;
        await recordAndAlertError(env, {
          shop: body?.shop || null,
          provider: "queue",
          rawError: err?.message || String(err),
          context: `Background D1 Sync (Message ${message.id})`
        });
        message.retry();
      }
    }
  },

  async email(message, env, ctx) {
    await handleInboundEmail(message, env, ctx);
  }
};

/**
 * CORS helper
 */
function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Shopify-Shop-Domain",
    "Access-Control-Max-Age": "86400"
  };
}
