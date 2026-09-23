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
    moderation: "low"
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

      // Route: Merchant Direct Email Dispatch (POST /admin/send-email)
      if (url.pathname === "/admin/send-email" && request.method === "POST") {
        const body = await request.json();
        const to = body.to;
        if (!to) {
          return new Response(JSON.stringify({ error: "Missing recipient 'to' email" }), { status: 400, headers });
        }

        const subject = body.subject || "[Facetimefy AI Concierge] Merchant System Overview & Verification";
        const text = body.text || "Overview of the Storefront AI Concierge infrastructure.";
        const html = body.html || `<p>${text}</p>`;

        if (!env.EMAIL || typeof env.EMAIL.send !== "function") {
          return new Response(JSON.stringify({ error: "Cloudflare EMAIL binding not configured" }), { status: 500, headers });
        }

        try {
          const emailRes = await env.EMAIL.send({
            to,
            from: "error@urgent.facetimefy.com",
            subject,
            html,
            text
          });
          return new Response(JSON.stringify({
            status: "success",
            method: "cloudflare_email_service",
            from: "error@urgent.facetimefy.com",
            to,
            messageId: emailRes?.messageId || "dispatched"
          }), { headers });
        } catch (emailErr) {
          console.error("[Email] Failed to send via Cloudflare Email binding:", emailErr);
          return new Response(JSON.stringify({
            status: "error",
            error: emailErr.message || String(emailErr)
          }), { status: 500, headers });
        }
      }

      // Route: Storefront Telemetry Events (POST /analytics/event)
      if (url.pathname === "/analytics/event" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const country = request.headers.get("cf-ipcountry") || "";
        const storeDomain = resolveStoreDomain(request, body);

        // Fetch merchant settings so we associate the actual merchant AI provider/model dynamically if not in payload
        const merchantConfig = await getMerchantConfig(storeDomain, env);

        // 1. Write to Analytics Engine
        recordAnalyticsEvent(env, {
          eventType: body.event_type || body.eventType || "",
          storeDomain,
          country,
          pageUrl: body.page_url || body.pathname || "",
          conversationId: body.conversation_id || "",
          provider: body.provider || merchantConfig.provider || "",
          itemOrModel: body.item || body.product_id || body.product_title || merchantConfig.model || "",
          status: body.status || "",
          latencyMs: Number(body.latency_ms) || 0,
          priceOrValue: Number(body.price) || 0,
          quantityOrDepth: Number(body.quantity) || 0
        });

        // 2. Persist to D1 Relational Tables for Merchant Business Metrics
        if (env.DB && ctx && ctx.waitUntil) {
          const eventType = body.event_type || body.eventType || "";
          
          // AI Assisted Sales
          if (eventType === "AgentAddToCartClick" || eventType === "AgentProductClick") {
            ctx.waitUntil(
              env.DB.prepare(`
                INSERT INTO ai_assisted_sales (shop, conversation_id, product_id, product_title, price, event_type)
                VALUES (?, ?, ?, ?, ?, ?)
              `).bind(
                storeDomain,
                body.conversation_id || "",
                body.product_id || "",
                body.item || body.product_title || "",
                Number(body.price) || 0,
                eventType === "AgentAddToCartClick" ? "added_to_cart" : "clicked"
              ).run().catch(e => console.error("[D1] Error logging assisted sale:", e))
            );
          }

          // Customer Demand & Support Insights
          if (eventType === "AgentZeroResults" || eventType === "AgentFaqResolved") {
            ctx.waitUntil(
              env.DB.prepare(`
                INSERT INTO customer_demand_insights (shop, conversation_id, customer_query, category, matched_items_count, outcome)
                VALUES (?, ?, ?, ?, ?, ?)
              `).bind(
                storeDomain,
                body.conversation_id || "",
                body.query || body.item || "",
                body.category || "",
                Number(body.matched_count) || 0,
                body.status || ""
              ).run().catch(e => console.error("[D1] Error logging demand insight:", e))
            );
          }
        }

        return new Response(JSON.stringify({ status: "recorded" }), { headers });
      }

      // Route: Admin Analytics Overview (GET /admin/analytics?shop=...)
      if (url.pathname === "/admin/analytics" && request.method === "GET") {
        const shop = url.searchParams.get("shop") || "all";
        let stats = {
          shop,
          summary: {
            assisted_revenue: 0,
            cart_adds: 0,
            support_inquiries_resolved: 0,
            support_hours_saved: 0,
            total_conversations: 0,
            total_messages: 0,
            total_errors: 0
          },
          top_sold_products: [],
          missed_opportunities: [],
          support_inquiries: [],
          recent_conversations: [],
          recent_errors: []
        };

        if (env.DB) {
          try {
            // Conversions & Assisted Sales
            const salesSummary = shop !== "all"
              ? await env.DB.prepare(`SELECT COALESCE(SUM(price), 0) as rev, COUNT(*) as adds FROM ai_assisted_sales WHERE shop = ? AND event_type = 'added_to_cart'`).bind(shop).first()
              : await env.DB.prepare(`SELECT COALESCE(SUM(price), 0) as rev, COUNT(*) as adds FROM ai_assisted_sales WHERE event_type = 'added_to_cart'`).first();

            stats.summary.assisted_revenue = salesSummary?.rev || 0;
            stats.summary.cart_adds = salesSummary?.adds || 0;

            // Top AI-Sold Products
            const topProducts = shop !== "all"
              ? await env.DB.prepare(`SELECT product_title, COUNT(*) as cart_adds, COALESCE(SUM(price), 0) as total_revenue FROM ai_assisted_sales WHERE shop = ? AND event_type = 'added_to_cart' GROUP BY product_title ORDER BY cart_adds DESC LIMIT 5`).bind(shop).all()
              : await env.DB.prepare(`SELECT product_title, COUNT(*) as cart_adds, COALESCE(SUM(price), 0) as total_revenue FROM ai_assisted_sales WHERE event_type = 'added_to_cart' GROUP BY product_title ORDER BY cart_adds DESC LIMIT 5`).all();

            stats.top_sold_products = topProducts?.results || [];

            // Missed Opportunities (Unmet Demand: matched_items_count = 0)
            const missedOps = shop !== "all"
              ? await env.DB.prepare(`SELECT customer_query, COUNT(*) as request_count, MAX(created_at) as last_requested FROM customer_demand_insights WHERE shop = ? AND matched_items_count = 0 GROUP BY customer_query ORDER BY request_count DESC LIMIT 5`).bind(shop).all()
              : await env.DB.prepare(`SELECT customer_query, COUNT(*) as request_count, MAX(created_at) as last_requested FROM customer_demand_insights WHERE matched_items_count = 0 GROUP BY customer_query ORDER BY request_count DESC LIMIT 5`).all();

            stats.missed_opportunities = missedOps?.results || [];

            // Customer Support Inquiries
            const supportStats = shop !== "all"
              ? await env.DB.prepare(`SELECT category, COUNT(*) as count FROM customer_demand_insights WHERE shop = ? AND outcome = 'policy_answered' GROUP BY category ORDER BY count DESC`).bind(shop).all()
              : await env.DB.prepare(`SELECT category, COUNT(*) as count FROM customer_demand_insights WHERE outcome = 'policy_answered' GROUP BY category ORDER BY count DESC`).all();

            stats.support_inquiries = supportStats?.results || [];
            const totalSupportInquiries = stats.support_inquiries.reduce((acc, curr) => acc + (curr.count || 0), 0);
            stats.summary.support_inquiries_resolved = totalSupportInquiries;
            stats.summary.support_hours_saved = Number((totalSupportInquiries * 0.083).toFixed(1)); // ~5 mins saved per inquiry

            // Conversations & Errors
            const convStats = shop !== "all" 
              ? await env.DB.prepare(`SELECT COUNT(*) as conv_count, COALESCE(SUM(message_count), 0) as msg_count FROM conversations WHERE shop = ?`).bind(shop).first()
              : await env.DB.prepare(`SELECT COUNT(*) as conv_count, COALESCE(SUM(message_count), 0) as msg_count FROM conversations`).first();
            
            const errStats = shop !== "all"
              ? await env.DB.prepare(`SELECT COUNT(*) as err_count FROM error_logs WHERE shop = ?`).bind(shop).first()
              : await env.DB.prepare(`SELECT COUNT(*) as err_count FROM error_logs`).first();

            const recentConvs = shop !== "all"
              ? await env.DB.prepare(`SELECT id, message_count, updated_at FROM conversations WHERE shop = ? ORDER BY updated_at DESC LIMIT 5`).bind(shop).all()
              : await env.DB.prepare(`SELECT id, shop, message_count, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 5`).all();

            const recentErrs = shop !== "all"
              ? await env.DB.prepare(`SELECT id, user_message, error, created_at FROM error_logs WHERE shop = ? ORDER BY id DESC LIMIT 5`).bind(shop).all()
              : await env.DB.prepare(`SELECT id, shop, user_message, error, created_at FROM error_logs ORDER BY id DESC LIMIT 5`).all();

            stats.summary.total_conversations = convStats?.conv_count || 0;
            stats.summary.total_messages = convStats?.msg_count || 0;
            stats.summary.total_errors = errStats?.err_count || 0;
            stats.recent_conversations = recentConvs?.results || [];
            stats.recent_errors = recentErrs?.results || [];
          } catch (dbErr) {
            console.error("[Admin Analytics] D1 query failed:", dbErr);
          }
        }

        return new Response(JSON.stringify(stats, null, 2), { headers });
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
  const startTime = Date.now();
  const body = await request.json();
  const userMessage = body.message;
  const conversationId = body.conversation_id || `conv_${Date.now()}`;

  if (!userMessage) {
    return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers });
  }

  // Resolve Store Domain
  const storeDomain = resolveStoreDomain(request, body);

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
    // Send separate alert to merchant (strictly to their notificationEmail, NO FALLBACKS)
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(sendMerchantErrorAlert({
        storeDomain,
        conversationId,
        userMessage,
        error: err.message || String(err),
        recipientEmail: merchantConfig.notificationEmail,
        env
      }));
    }

    // Analytics Engine: Record error
    const country = request.headers.get("cf-ipcountry") || "";
    recordAnalyticsEvent(env, {
      eventType: "error",
      storeDomain,
      country,
      pageUrl: "/chat",
      conversationId,
      provider: merchantConfig.provider || "",
      itemOrModel: merchantConfig.model || "",
      status: err.name || "error",
      latencyMs: Date.now() - startTime,
      priceOrValue: 0,
      quantityOrDepth: history.length
    });

    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers });
  }

  // Save updated history
  history.push({ role: "assistant", content: assistantText });

  // 1. Save in KV for ultra-fast edge access
  if (env.CHAT_HISTORY) {
    await env.CHAT_HISTORY.put(conversationId, JSON.stringify(history.slice(-20)), { expirationTtl: 86400 * 7 });
  }

  // 2. Save full conversation JSON in R2 bucket
  const r2Key = `conversations/${storeDomain}/${conversationId}.json`;
  if (env.CONVERSATIONS_BUCKET) {
    const r2Payload = {
      shop: storeDomain,
      conversationId,
      messageCount: history.length,
      messages: history,
      updatedAt: new Date().toISOString()
    };
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(
        env.CONVERSATIONS_BUCKET.put(r2Key, JSON.stringify(r2Payload, null, 2), {
          httpMetadata: { contentType: "application/json" }
        }).catch(e => console.error("[R2] Error writing conversation:", e))
      );
    }
  }

  // 3. Index conversation in D1 database
  if (env.DB && ctx && ctx.waitUntil) {
    ctx.waitUntil(
      env.DB.prepare(`
        INSERT INTO conversations (id, shop, message_count, r2_key, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          message_count = excluded.message_count,
          r2_key = excluded.r2_key,
          updated_at = CURRENT_TIMESTAMP
      `).bind(conversationId, storeDomain, history.length, r2Key).run()
        .catch(e => console.error("[D1] Error updating conversation row:", e))
    );
  }

  // 4. Record Analytics Engine data point (AgentTurn)
  const country = request.headers.get("cf-ipcountry") || "";
  recordAnalyticsEvent(env, {
    eventType: "AgentTurn",
    storeDomain,
    country,
    pageUrl: "/chat",
    conversationId,
    provider: merchantConfig.provider || "",
    itemOrModel: merchantConfig.model || "",
    status: assistantText ? "completed" : "empty_response",
    latencyMs: Date.now() - startTime,
    priceOrValue: 0,
    quantityOrDepth: history.length
  });

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

  // Fallback to D1 database if not cached in KV
  if (!config && env.DB) {
    try {
      const row = await env.DB.prepare("SELECT * FROM merchants WHERE shop = ?").bind(shopDomain).first();
      if (row) {
        config = {
          provider: row.provider,
          model: row.model,
          apiKey: row.api_key,
          notificationEmail: row.notification_email
        };
        if (env.MERCHANT_SETTINGS) {
          await env.MERCHANT_SETTINGS.put(shopDomain, JSON.stringify(config));
        }
      }
    } catch (e) {
      console.error("[D1] Error fetching merchant from DB:", e);
    }
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
        model: config.model || (env.OPENAI_API_KEY ? "gpt-5.5" : "gemini-3.6-flash"),
        notificationEmail: config.notificationEmail
      };
    }

    // Merchant chose their own key (BYOK) - strictly use their key (ZERO FALLBACK)
    if (!config.apiKey) {
      throw new Error(`No API key configured for ${shopDomain}. Configure your key in the app admin.`);
    }

    return {
      provider: config.provider || "openai",
      apiKey: config.apiKey,
      model: config.model || (config.provider === "gemini" ? "gemini-3.6-flash" : "gpt-5.5"),
      notificationEmail: config.notificationEmail
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
      hasCustomKey: Boolean(config.apiKey),
      notificationEmail: config.notificationEmail || ""
    } : { provider: "openai", model: "gpt-5.5", hasCustomKey: false, notificationEmail: "" };

    return new Response(JSON.stringify(safeConfig), { headers });
  }

  if (request.method === "POST") {
    const payload = await request.json();
    const { shop, provider, apiKey, model, notificationEmail } = payload;
    if (!shop) {
      return new Response(JSON.stringify({ error: "Missing shop parameter" }), { status: 400, headers });
    }

    // 1. Persist to D1 Database
    if (env.DB) {
      try {
        await env.DB.prepare(`
          INSERT INTO merchants (shop, notification_email, provider, model, api_key, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(shop) DO UPDATE SET
            notification_email = CASE WHEN excluded.notification_email != '' THEN excluded.notification_email ELSE merchants.notification_email END,
            provider = excluded.provider,
            model = excluded.model,
            api_key = COALESCE(excluded.api_key, merchants.api_key),
            updated_at = CURRENT_TIMESTAMP
        `).bind(shop, notificationEmail || "", provider || "openai", model || "gpt-5.5", apiKey || null).run();
      } catch (e) {
        console.error("[D1] Error saving merchant to D1:", e);
      }
    }

    // 2. Persist to KV for ultra-fast edge lookup
    if (env.MERCHANT_SETTINGS) {
      const existing = (await env.MERCHANT_SETTINGS.get(shop, { type: "json" })) || {};
      const updated = {
        provider: provider || existing.provider || "openai",
        model: model || existing.model || "gpt-5.5",
        apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
        notificationEmail: notificationEmail !== undefined && notificationEmail !== "" ? notificationEmail : existing.notificationEmail,
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
 * Send error alert strictly to merchant (NO FALLBACKS)
 */
async function sendMerchantErrorAlert({ storeDomain, conversationId, userMessage, error, recipientEmail, env }) {
  // Always record error in D1 error_logs table
  if (env.DB) {
    try {
      await env.DB.prepare(
        "INSERT INTO error_logs (shop, conversation_id, user_message, error) VALUES (?, ?, ?, ?)"
      ).bind(storeDomain, conversationId || "unknown", userMessage || "", String(error)).run();
    } catch (e) {
      console.error("[D1] Error recording error_log:", e);
    }
  }

  // STRICT ZERO FALLBACK: Only send to this specific merchant's verified store email
  const targetEmail = recipientEmail;
  if (!targetEmail) {
    console.error(`[Alert] No notification email for merchant ${storeDomain}. Error logged to D1 table only.`);
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
      const emailRes = await env.EMAIL.send({
        to: targetEmail,
        from: "error@urgent.facetimefy.com",
        subject,
        html,
        text: `AI Concierge Alert for ${storeDomain}:\n${error}\nShopper Message: ${userMessage}`
      });
      console.log(`[Alert] Sent Cloudflare Email to ${targetEmail} (id: ${emailRes?.messageId || "ok"})`);
      return;
    } catch (e) {
      console.error("[Alert] Failed sending Cloudflare Email:", e);
    }
  }
}

/**
 * Resolve store domain from headers, body, or origin
 */
function resolveStoreDomain(request, body = {}) {
  let rawOrigin = body.store_domain || request.headers.get("X-Shopify-Shop-Domain") || request.headers.get("Origin") || "";
  let storeDomain = "";
  try {
    storeDomain = rawOrigin.startsWith("http") ? new URL(rawOrigin).hostname : rawOrigin;
  } catch {
    storeDomain = rawOrigin;
  }
  return storeDomain || "";
}

/**
 * Record an event to Cloudflare Analytics Engine (dataset: shop_chat_analytics).
 * 
 * Strict Schema Order:
 * blobs: [
 *   blob1: event_type       (e.g., 'AgentBubbleShown', 'AgentActive', 'AgentTurn', 'AgentProductClick', 'AgentAddToCartClick', 'AgentCheckout', 'error')
 *   blob2: store_domain     (e.g., 'facetimefy.myshopify.com')
 *   blob3: country          (e.g., 'US', 'GB' from request 'cf-ipcountry' header)
 *   blob4: page_url         (e.g., '/products/cool-shirt')
 *   blob5: conversation_id  (e.g., 'conv_123456')
 *   blob6: provider         (e.g., 'openai', 'gemini', 'storefront')
 *   blob7: item_or_model    (e.g., 'gpt-5.5', 'gemini-3.6-flash', product title/id)
 *   blob8: status           (e.g., 'success', 'error', 'clicked', 'added')
 * ]
 * doubles: [
 *   double1: 1              (Count: ALWAYS 1 so SUM(_sample_interval * double1) works accurately with sampling)
 *   double2: latency_ms     (Response time / latency in ms, or 0)
 *   double3: price_or_value (Monetary price/value in dollars, or 0)
 *   double4: quantity_or_depth (Product quantity or conversation turn depth)
 * ]
 * indexes: [storeDomain]    (Fast index for filtering per store)
 */
function recordAnalyticsEvent(env, {
  eventType = "",
  storeDomain = "",
  country = "",
  pageUrl = "",
  conversationId = "",
  provider = "",
  itemOrModel = "",
  status = "",
  latencyMs = 0,
  priceOrValue = 0,
  quantityOrDepth = 0
}) {
  const analytics = env.ANALYTICS_ENGINE_CHAT || env.ANALYTICS;
  if (!analytics || typeof analytics.writeDataPoint !== "function") return;

  try {
    analytics.writeDataPoint({
      indexes: [String(storeDomain || "")],
      blobs: [
        String(eventType || ""),
        String(storeDomain || ""),
        String(country || ""),
        String(pageUrl || ""),
        String(conversationId || ""),
        String(provider || ""),
        String(itemOrModel || ""),
        String(status || "")
      ],
      doubles: [
        1, // double1: canonical event count for SUM(_sample_interval * double1)
        Number(latencyMs) || 0,
        Number(priceOrValue) || 0,
        Number(quantityOrDepth) || 0
      ]
    });
  } catch (err) {
    console.error("[Analytics Engine] Error writing data point:", err);
  }
}

