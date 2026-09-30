/**
 * Cloudflare Edge Worker: Storefront AI Concierge & Merchant Settings API
 * 
 * Clean, lightweight, zero-fallback production router:
 * - /admin/validate-key : Live, zero-token validation for OpenAI and Gemini keys
 * - /admin/settings     : Merchant configuration persistence (D1 + KV edge cache)
 * - /chat               : Storefront AI shopping assistant endpoint
 */
import { recordAndAlertError, recordSystemError, dispatchAlertEmail, handleInboundEmail } from "./email.js";
import { buildSystemPrompt, OPENAI_TOOLS, MASTER_MCP_URL } from "./prompt.js";

export default {
  async fetch(request, env, ctx) {
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

          // Strict KV read of basic settings
          const config = await env.MERCHANT_SETTINGS.get(shop, { type: "json" });

          const defaultOpenAiModel = env.DEFAULT_OPENAI_MODEL || "gpt-5.5";
          const defaultGeminiModel = env.DEFAULT_GEMINI_MODEL || "gemini-3.8-flash";

          if (!config) {
            return new Response(JSON.stringify({
              provider_mode: "facetimefy",
              primary_choice: "openai_primary",
              openai_model: defaultOpenAiModel,
              custom_openai_model: "",
              gemini_model: defaultGeminiModel,
              custom_gemini_model: "",
              has_openai_key: false,
              has_gemini_key: false,
              notification_email: "",
              persona_tone: "friendly",
              greeting_message: "",
              system_prompt: ""
            }), { headers });
          }

          // Return settings with secret keys strictly masked
          return new Response(JSON.stringify({
            provider_mode: config.provider_mode || "facetimefy",
            primary_choice: config.primary_choice || "openai_primary",
            openai_model: config.openai_model || defaultOpenAiModel,
            custom_openai_model: config.custom_openai_model || "",
            gemini_model: config.gemini_model || defaultGeminiModel,
            custom_gemini_model: config.custom_gemini_model || "",
            has_openai_key: Boolean(config.openai_api_key),
            has_gemini_key: Boolean(config.gemini_api_key),
            notification_email: config.notification_email || "",
            persona_tone: config.persona_tone || "friendly",
            greeting_message: config.greeting_message || "",
            system_prompt: config.system_prompt || ""
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

          const record = {
            shop,
            provider_mode: payload.provider_mode || "facetimefy",
            primary_choice: payload.primary_choice || existing?.primary_choice || "openai_primary",
            openai_model: payload.openai_model || existing?.openai_model || defaultOpenAiModel,
            custom_openai_model: payload.custom_openai_model || existing?.custom_openai_model || "",
            gemini_model: payload.gemini_model || existing?.gemini_model || defaultGeminiModel,
            custom_gemini_model: payload.custom_gemini_model || existing?.custom_gemini_model || "",
            openai_api_key: openaiKey,
            gemini_api_key: geminiKey,
            notification_email: payload.notification_email || existing?.notification_email || "",
            persona_tone: payload.persona_tone || existing?.persona_tone || "friendly",
            greeting_message: payload.greeting_message || existing?.greeting_message || "",
            system_prompt: payload.system_prompt || existing?.system_prompt || "",
            updated_at: new Date().toISOString()
          };

          // Strict KV write
          await env.MERCHANT_SETTINGS.put(shop, JSON.stringify(record));

          // Direct D1 sync
          if (env.DB) {
            try {
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
                record.notification_email || "",
                record.provider_mode || "facetimefy",
                record.openai_model || "gpt-5.5",
                record.openai_api_key || null,
                record.gemini_api_key || null,
                record.gemini_model || "gemini-3.8-flash",
                record.primary_choice || "openai_primary"
              ).run();
            } catch (dbErr) {
              console.error("[Settings D1 Sync Error]", dbErr);
            }
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
            modelName = (config.openai_model === "custom" && config.custom_openai_model ? config.custom_openai_model : config.openai_model) || "gpt-6-sol";
            if (!apiKey) {
              await recordAndAlertError(env, {
                shop,
                provider: "openai",
                rawError: "Merchant Bring-Your-Own-Key (OpenAI) is missing or unconfigured.",
                context: "Storefront Chat Execution",
                merchantEmail: config.notification_email
              });
              return new Response(JSON.stringify({ error: true }), { headers });
            }
          } else if (providerMode === "gemini") {
            provider = "gemini";
            apiKey = config.gemini_api_key;
            modelName = (config.gemini_model === "custom" && config.custom_gemini_model ? config.custom_gemini_model : config.gemini_model) || "gemini-3.8-flash";
            if (!apiKey) {
              await recordAndAlertError(env, {
                shop,
                provider: "gemini",
                rawError: "Merchant Bring-Your-Own-Key (Gemini) is missing or unconfigured.",
                context: "Storefront Chat Execution",
                merchantEmail: config.notification_email
              });
              return new Response(JSON.stringify({ error: true }), { headers });
            }
          } else {
            provider = "openai";
            apiKey = env.OPENAI_API_KEY;
            modelName = env.DEFAULT_OPENAI_MODEL || "gpt-5.5";
            if (!apiKey) {
              return new Response(JSON.stringify({ error: true }), { headers });
            }
          }

          const convId = body.conversation_id || ("conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7));
          let history = [];
          if (env.CHAT_HISTORY) {
            history = (await env.CHAT_HISTORY.get(convId, { type: "json" })) || [];
          }

          const masterMcpUrl = (env.MASTER_MCP_URL || MASTER_MCP_URL || "").trim();
          const ucpProfileUrl = config?.agent_profile_url || env.UCP_PROFILE_URL || "";

          const activeMcpTools = [
            {
              type: "function",
              function: {
                name: "search_catalog",
                description: "Search products in the store catalog",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Search query" },
                    store_domain: { type: "string", description: "Store domain" }
                  },
                  required: ["query"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "get_product",
                description: "Get full product details including variants and availability",
                parameters: {
                  type: "object",
                  properties: {
                    id: { type: "string", description: "Product ID" },
                    store_domain: { type: "string", description: "Store domain" }
                  },
                  required: ["id"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "lookup_catalog",
                description: "Lookup products or variants by identifiers",
                parameters: {
                  type: "object",
                  properties: {
                    ids: { type: "array", items: { type: "string" }, description: "Array of product or variant IDs" },
                    store_domain: { type: "string", description: "Store domain" }
                  },
                  required: ["ids"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "search_shop_policies_and_faqs",
                description: "Search store policies, FAQs, shipping, returns, and terms",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string", description: "Natural language query about policies or FAQs" },
                    store_domain: { type: "string", description: "Store domain" }
                  },
                  required: ["query"]
                }
              }
            }
          ];

          const systemPrompt = buildSystemPrompt({
            storeDomain: shop,
            agentProfileUrl: ucpProfileUrl,
            customPrompt: config?.system_prompt || ""
          });

          let reply = "";
          let capturedToolResult = null;

          if (provider === "openai") {
            const requestBody = {
              model: modelName,
              messages: [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage }
              ]
            };

            if (masterMcpUrl) {
              requestBody.tools = activeMcpTools;
            }

            const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
              },
              body: JSON.stringify(requestBody)
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
              return new Response(JSON.stringify({ error: true }), { status: aiRes.status, headers });
            }

            const aiData = await aiRes.json();
            const choice = aiData.choices?.[0]?.message;

            // Handle MCP tool invocation
            if (choice?.tool_calls && choice.tool_calls.length > 0 && masterMcpUrl) {
              const toolMessages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage },
                choice
              ];

              for (const tc of choice.tool_calls) {
                const callArgs = JSON.parse(tc.function?.arguments || "{}");
                const { output, captured } = await executeMcpTool(masterMcpUrl, tc.function.name, callArgs, shop);
                if (captured) capturedToolResult = captured;

                toolMessages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: output
                });
              }

              const followUpRes = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: toolMessages
                })
              });

              if (followUpRes.ok) {
                const followUpData = await followUpRes.json();
                reply = followUpData.choices?.[0]?.message?.content || "";
              } else {
                reply = choice.content || "";
              }

            } else {
              reply = choice?.content || "";
            }
          } else if (provider === "gemini") {
            const geminiContents = [
              ...history.map(h => ({
                role: h.role === "assistant" ? "model" : "user",
                parts: [{ text: h.content }]
              })),
              { role: "user", parts: [{ text: userMessage }] }
            ];

            const geminiRequestBody = {
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: geminiContents
            };

            if (masterMcpUrl) {
              geminiRequestBody.tools = [{
                functionDeclarations: [
                  {
                    name: "search_catalog",
                    description: "Search products in the store catalog",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        query: { type: "STRING", description: "Search query" },
                        store_domain: { type: "STRING", description: "Store domain" }
                      },
                      required: ["query"]
                    }
                  },
                  {
                    name: "get_product",
                    description: "Get full product details including variants and availability",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        id: { type: "STRING", description: "Product ID" },
                        store_domain: { type: "STRING", description: "Store domain" }
                      },
                      required: ["id"]
                    }
                  },
                  {
                    name: "lookup_catalog",
                    description: "Lookup products or variants by identifiers",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        ids: { type: "ARRAY", items: { type: "STRING" }, description: "Array of product or variant IDs" },
                        store_domain: { type: "STRING", description: "Store domain" }
                      },
                      required: ["ids"]
                    }
                  },
                  {
                    name: "search_shop_policies_and_faqs",
                    description: "Search store policies, FAQs, shipping, returns, and terms",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        query: { type: "STRING", description: "Natural language query about policies or FAQs" },
                        store_domain: { type: "STRING", description: "Store domain" }
                      },
                      required: ["query"]
                    }
                  }
                ]
              }];
            }

            const aiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(geminiRequestBody)
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
              return new Response(JSON.stringify({ error: true }), { status: aiRes.status, headers });
            }

            const aiData = await aiRes.json();
            const candidate = aiData.candidates?.[0]?.content;
            const functionCalls = candidate?.parts?.filter(p => p.functionCall) || [];

            if (functionCalls.length > 0 && masterMcpUrl) {
              const toolResponses = [];
              for (const p of functionCalls) {
                const fc = p.functionCall;
                const callArgs = fc.args || {};
                const { output, captured } = await executeMcpTool(masterMcpUrl, fc.name, callArgs, shop);
                if (captured) capturedToolResult = captured;

                let parsedOutput = {};
                try { parsedOutput = JSON.parse(output); } catch (_) { parsedOutput = { response: output }; }

                toolResponses.push({
                  functionResponse: {
                    name: fc.name,
                    response: parsedOutput
                  }
                });
              }

              const followUpRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [
                      ...geminiContents,
                      candidate,
                      {
                        role: "user",
                        parts: toolResponses
                      }
                    ]
                  })
                }
              );

              if (followUpRes.ok) {
                const followUpData = await followUpRes.json();
                reply = followUpData.candidates?.[0]?.content?.parts?.[0]?.text || "";
              } else {
                reply = candidate?.parts?.[0]?.text || "";
              }
            } else {
              reply = candidate?.parts?.[0]?.text || "";
            }
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
            role: "assistant",
            ...(capturedToolResult ? {
              data: capturedToolResult,
              products: capturedToolResult.products || capturedToolResult.items || (Array.isArray(capturedToolResult) ? capturedToolResult : undefined)
            } : {})
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
      await recordSystemError(env, {
        subsystem: "worker_router",
        rawError: err?.message || String(err),
        details: { url: request.url, method: request.method }
      });
      return new Response(JSON.stringify({ error: true }), {
        status: 500,
        headers
      });
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
