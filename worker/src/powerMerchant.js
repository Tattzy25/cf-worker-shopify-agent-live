// @ts-nocheck
import { recordAndAlertError } from "./email.js";

/**
 * Validates a Power Merchant MCP Server endpoint over Streamable HTTP / SSE.
 * Performs protocol handshake and tools/list discovery.
 */
export async function handleValidateMcp(request, env, headers) {
  try {
    const body = await request.json();
    const serverUrl = body.url?.trim();
    const customHeaders = body.headers || {};
    const shop = body.shop || null;
    const bodyEmail = body.notification_email || null;

    if (!serverUrl || !serverUrl.startsWith("http")) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid MCP server URL. Must begin with http:// or https://" }),
        { status: 400, headers }
      );
    }

    const fetchHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...customHeaders
    };

    // Query MCP tools list directly via standard JSON-RPC 2.0 (Pure JSON, Zero SSE)
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

    const data = await mcpRes.json().catch(() => ({}));
    const tools = data.result?.tools || [];

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
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Could not connect to server. Check the URL and try again."
      }),
      { headers }
    );
  }
}


