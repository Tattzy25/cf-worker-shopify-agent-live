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
import { handleValidateMcp } from "./powerMerchant.js";
import { streamSettingsEvent, streamToolCallEvent } from "./pipeline.js";

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
      // ROUTE: Live On-The-Spot MCP Server Validation & Tool Discovery
      // POST /admin/validate-mcp (delegated to powerMerchant.js)
      // -------------------------------------------------------------
      if (url.pathname === "/admin/validate-mcp") {
        return await handleValidateMcp(request, env, headers);
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

          // R2 Isolated Merchant Folder: Read MCP servers from merchants/${shop}/mcp_servers.json
          let mcpServers = [];
          if (env.CONVERSATIONS_BUCKET) {
            try {
              const r2Obj = await env.CONVERSATIONS_BUCKET.get(`merchants/${shop}/mcp_servers.json`);
              if (r2Obj) {
                mcpServers = await r2Obj.json();
              }
            } catch (_) {}
          }
          if (!mcpServers.length && config?.mcp_servers) {
            mcpServers = config.mcp_servers;
          }

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
              power_model: "",
              custom_power_model: "",
              has_power_key: false,
              has_openai_key: false,
              has_gemini_key: false,
              notification_email: "",
              persona_tone: "friendly",
              greeting_message: "",
              system_prompt: "",
              mcp_servers: mcpServers
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
            power_model: config.power_model || "",
            custom_power_model: config.custom_power_model || "",
            has_power_key: Boolean(config.power_api_key),
            has_openai_key: Boolean(config.openai_api_key),
            has_gemini_key: Boolean(config.gemini_api_key),
            notification_email: config.notification_email || "",
            persona_tone: config.persona_tone || "friendly",
            greeting_message: config.greeting_message || "",
            system_prompt: config.system_prompt || "",
            mcp_servers: mcpServers
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

          const powerKey = payload.power_api_key !== undefined
            ? (payload.power_api_key?.trim() || null)
            : (existing?.power_api_key || null);

          let mcpServers = [];
          if (payload.mcp_servers !== undefined) {
            try {
              mcpServers = typeof payload.mcp_servers === "string" ? JSON.parse(payload.mcp_servers) : payload.mcp_servers;
            } catch (_) {}
          } else if (existing?.mcp_servers) {
            mcpServers = existing.mcp_servers;
          }

          // 1. Save isolated MCP configuration directly to R2 under merchant folder
          if (env.CONVERSATIONS_BUCKET && mcpServers) {
            await env.CONVERSATIONS_BUCKET.put(
              `merchants/${shop}/mcp_servers.json`,
              JSON.stringify(mcpServers, null, 2),
              {
                httpMetadata: { contentType: "application/json" },
                customMetadata: { shop, updated_at: new Date().toISOString() }
              }
            );
          }

          const record = {
            shop,
            provider_mode: payload.provider_mode || "facetimefy",
            primary_choice: payload.primary_choice || existing?.primary_choice || "openai_primary",
            openai_model: payload.openai_model || existing?.openai_model || defaultOpenAiModel,
            custom_openai_model: payload.custom_openai_model || existing?.custom_openai_model || "",
            gemini_model: payload.gemini_model || existing?.gemini_model || defaultGeminiModel,
            custom_gemini_model: payload.custom_gemini_model || existing?.custom_gemini_model || "",
            power_model: payload.power_model || existing?.power_model || "",
            custom_power_model: payload.custom_power_model || existing?.custom_power_model || "",
            power_api_key: powerKey,
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

          // Cloudflare Pipelines: Stream configuration event into R2
          streamSettingsEvent(env, ctx, {
            shop,
            powerModel: payload.power_model || "",
            provider: payload.power_model?.startsWith("gemini-") ? "gemini" : "openai",
            mcpServers
          });

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

          // Power Merchant: Directly serve from database/KV if configured
          if (config?.power_model) {
            const raw = config.power_model === "custom" && config.custom_power_model 
              ? config.custom_power_model 
              : config.power_model;
            const isGemini = raw.startsWith("gemini-");
            provider = isGemini ? "gemini" : "openai";
            apiKey = config.power_api_key;
            modelName = raw;
            if (!apiKey) {
              await recordAndAlertError(env, {
                shop,
                provider,
                rawError: `Power Merchant API Key for ${provider} (${modelName}) is missing or unconfigured.`,
                context: "Storefront Chat Execution",
                merchantEmail: config?.notification_email
              });
              return new Response(JSON.stringify({ error: true }), { headers });
            }
          } else if (providerMode === "openai") {
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

          // R2 Isolated Merchant Folder: Load MCP servers and tools
          let mcpServers = [];
          if (env.CONVERSATIONS_BUCKET) {
            try {
              const r2Obj = await env.CONVERSATIONS_BUCKET.get(`merchants/${shop}/mcp_servers.json`);
              if (r2Obj) {
                mcpServers = await r2Obj.json();
              }
            } catch (_) {}
          }
          if (!mcpServers.length && config?.mcp_servers) {
            mcpServers = config.mcp_servers;
          }

          // Map active MCP tools
          const activeMcpTools = [];
          const mcpToolMap = new Map();
          for (const s of mcpServers) {
            if (s.status === "ready" && Array.isArray(s.tools)) {
              for (const t of s.tools) {
                if (t.name) {
                  activeMcpTools.push({
                    type: "function",
                    function: {
                      name: t.name,
                      description: t.description || "",
                      parameters: t.inputSchema || { type: "object", properties: {} }
                    }
                  });
                  mcpToolMap.set(t.name, { url: s.url, headers: s.headers || {} });
                }
              }
            }
          }

          const systemPrompt = buildSystemPrompt({
            storeDomain: shop,
            agentProfileUrl: config?.agent_profile_url || "",
            customPrompt: config?.system_prompt || ""
          });

          let reply = "";

          if (provider === "openai") {
            const requestBody = {
              model: modelName,
              messages: [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage }
              ]
            };

            if (activeMcpTools.length > 0) {
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
            if (choice?.tool_calls && choice.tool_calls.length > 0) {
              const toolMessages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage },
                choice
              ];

              for (const tc of choice.tool_calls) {
                const target = mcpToolMap.get(tc.function?.name);
                let toolOutput = "";
                if (target) {
                  try {
                    const mcpRes = await fetch(target.url, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...target.headers
                      },
                      body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: 1,
                        method: "tools/call",
                        params: {
                          name: tc.function.name,
                          arguments: JSON.parse(tc.function.arguments || "{}")
                        }
                      })
                    });
                    const mcpData = await mcpRes.json();
                    toolOutput = JSON.stringify(mcpData?.result || mcpData?.error || mcpData);
                  } catch (tErr) {
                    toolOutput = JSON.stringify({ error: String(tErr) });
                  }
                } else {
                  toolOutput = JSON.stringify({ error: "Tool not found" });
                }

                toolMessages.push({
                  role: "tool",
                  tool_call_id: tc.id,
                  content: toolOutput
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

              // Cloudflare Pipelines: Stream tool execution event into R2
              streamToolCallEvent(env, ctx, {
                shop,
                modelName,
                provider,
                serversCount: mcpServers.length,
                toolsCount: activeMcpTools.length,
                conversationId: convId,
                toolCalls: choice.tool_calls
              });
            } else {
              reply = choice?.content || "";
            }
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
              return new Response(JSON.stringify({ error: true }), { status: aiRes.status, headers });
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

        // Subscribed Event: ERROR_ALERT
        if (body?.type === "ERROR_ALERT") {
          if (env.DB) {
            await env.DB.prepare(`
              INSERT INTO error_logs (shop, conversation_id, user_message, error, created_at)
              VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `).bind(
              body.shop || "system",
              body.conversationId || null,
              body.context || "Error Alert",
              body.rawError || "Unknown error"
            ).run().catch((dbErr) => console.error("[Queue D1 Log Error]", dbErr));
          }

          if (body.sendEmail !== false && env.EMAIL) {
            await dispatchAlertEmail(env, {
              shop: body.shop,
              provider: body.provider,
              rawError: body.rawError,
              context: body.context,
              conversationId: body.conversationId,
              merchantEmail: body.merchantEmail
            }).catch((emailErr) => console.error("[Queue Alert Email Error]", emailErr));
          }
        }

        message.ack();
      } catch (err) {
        const body = message.body;
        await recordSystemError(env, {
          subsystem: "queue_consumer",
          rawError: err?.message || String(err),
          details: { messageId: message.id, type: body?.type }
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
