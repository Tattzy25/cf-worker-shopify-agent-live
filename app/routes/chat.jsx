import { saveMessage, getConversationHistory } from "../db.server";

const MASTER_MCP_URL = "https://master-group-mcp.anigok.com/mcp";

const DEVELOPER_PROMPT = `You are a high-level shopping concierge agent. For every response involving products, present product suggestions as structured cards, always as 4 at a time in a single horizontal table row. Product card requirements and interactivity, as well as workflows for "virtual try-on," are set out below. 

**Do not narrate internal reasoning**—give the user the actual result, an explanation (as needed for transparency and user value), and any appropriate next step. The corresponding tools listed below are actually available for use.

You must use this exact agent profile for requests:  
https://ucp-agent-profile.facetimefy.com/ucp/agent-profiles/2026-08-25/valid-with-capabilities.json

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

const TOOLS = [
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

export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request)
    });
  }

  const url = new URL(request.url);

  if (url.searchParams.has('history') && url.searchParams.has('conversation_id')) {
    const messages = await getConversationHistory(url.searchParams.get('conversation_id'));
    return new Response(JSON.stringify({ messages }), { 
      headers: { ...getCorsHeaders(request), "Content-Type": "application/json" } 
    });
  }

  return new Response(JSON.stringify({ status: "ok" }), { 
    headers: { ...getCorsHeaders(request), "Content-Type": "application/json" } 
  });
}

export async function action({ request }) {
  const headers = { ...getCorsHeaders(request), "Content-Type": "application/json" };

  try {
    const body = await request.json();
    const userMessage = body.message;
    const conversationId = body.conversation_id || Date.now().toString();

    if (!userMessage) {
      return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500, headers });
    }

    let rawOrigin = body.store_domain || request.headers.get("X-Shopify-Shop-Domain") || request.headers.get("Origin") || "";
    let storeDomain = "";
    try {
      storeDomain = rawOrigin.startsWith("http") ? new URL(rawOrigin).hostname : rawOrigin;
    } catch {
      storeDomain = rawOrigin;
    }
    if (!storeDomain) storeDomain = "musarty.com";

    await saveMessage(conversationId, 'user', userMessage);
    const dbMessages = await getConversationHistory(conversationId);

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

    for (const m of dbMessages) {
      if (!m.content) continue;
      let text = "";
      try {
        const parsed = JSON.parse(m.content);
        text = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      } catch {
        text = m.content;
      }

      input.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: [
          {
            type: m.role === "assistant" ? "output_text" : "input_text",
            text
          }
        ]
      });
    }

    const payload = {
      model: "gpt-5.5",
      input,
      text: {
        format: { type: "text" },
        verbosity: "medium"
      },
      reasoning: {
        effort: "medium",
        mode: "standard",
        summary: "auto"
      },
      tools: TOOLS,
      store: true,
      include: [
        "reasoning.encrypted_content",
        "web_search_call.action.sources"
      ]
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `OpenAI error (${response.status}): ${errText}` }), { status: response.status, headers });
    }

    const data = await response.json();

    let assistantText = "";
    if (data.output) {
      for (const item of data.output) {
        if (item.type === "message" && item.content) {
          for (const c of item.content) {
            if (c.type === "output_text" && c.text) {
              assistantText += c.text;
            }
          }
        }
        if (item.type === "image_generation_call") {
          const imgUrl = item.image?.url || item.result?.url;
          if (imgUrl) {
            assistantText += `\n\n![Virtual Try-On](${imgUrl})\n*Virtual Try-On Preview*\n`;
          }
        }
      }
    }

    if (!assistantText && data.output_text) {
      assistantText = data.output_text;
    }

    await saveMessage(conversationId, 'assistant', assistantText);

    return new Response(JSON.stringify({
      conversation_id: conversationId,
      message: assistantText,
      status: "completed"
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, X-Shopify-Shop-Id, X-CSRF-Token, Authorization",
    "Access-Control-Allow-Credentials": "true"
  };
}
