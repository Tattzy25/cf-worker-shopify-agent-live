/**
 * Cloudflare Pipelines Integration Module
 *
 * Dedicated streaming producer for the `power_merchant` stream:
 * - Fire-and-forget ingestion via ctx.waitUntil()
 * - Strictly matches the power_merchant stream schema:
 *   [shop, event_type, power_model, provider, servers_count, tools_count, mcp_servers, status, details]
 * - Continuous ETL sink flushes to R2 bucket as uncompressed JSON
 * - Internal failures log to system_error_logs table (NEVER sent to merchant/customer)
 */
import { recordSystemError } from "./email.js";

/**
 * Streams a settings / configuration update event to Cloudflare Pipelines
 */
export function streamSettingsEvent(env, ctx, {
  shop,
  powerModel = "",
  provider = "openai",
  mcpServers = [],
  details = {}
}) {
  if (!env?.POWER_MERCHANT_STREAM || !ctx?.waitUntil) return;

  const record = {
    shop,
    event_type: "settings_saved",
    power_model: powerModel,
    provider,
    servers_count: mcpServers.length,
    tools_count: mcpServers.reduce((acc, s) => acc + (s.tools?.length || 0), 0),
    mcp_servers: mcpServers,
    status: "ready",
    details: {
      saved_at: new Date().toISOString(),
      ...details
    }
  };

  ctx.waitUntil(
    env.POWER_MERCHANT_STREAM.send([record]).catch((err) => {
      recordSystemError(env, {
        subsystem: "pipeline_settings",
        rawError: err,
        details: { shop }
      });
    })
  );
}

/**
 * Streams an MCP tool call execution event to Cloudflare Pipelines
 */
export function streamToolCallEvent(env, ctx, {
  shop,
  modelName = "",
  provider = "openai",
  serversCount = 0,
  toolsCount = 0,
  conversationId = null,
  toolCalls = [],
  status = "success",
  details = {}
}) {
  if (!env?.POWER_MERCHANT_STREAM || !ctx?.waitUntil) return;

  const record = {
    shop,
    event_type: "mcp_tool_called",
    power_model: modelName,
    provider,
    servers_count: serversCount,
    tools_count: toolsCount,
    mcp_servers: null,
    status,
    details: {
      conversation_id: conversationId,
      tools_used: toolCalls.map(t => t.function?.name || t.name || String(t)),
      ...details
    }
  };

  ctx.waitUntil(
    env.POWER_MERCHANT_STREAM.send([record]).catch((err) => {
      recordSystemError(env, {
        subsystem: "pipeline_tool_call",
        rawError: err,
        details: { shop, conversationId }
      });
    })
  );
}
