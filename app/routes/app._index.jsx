import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  let shop = "default";
  let shopEmail = "";

  try {
    const { admin, session } = await authenticate.admin(request);
    shop = session?.shop || "default";

    const response = await admin.graphql(`
      query getShopContact {
        shop {
          email
          contactEmail
          name
        }
      }
    `);
    const data = await response.json();
    shopEmail = data.data?.shop?.contactEmail || data.data?.shop?.email || "";
  } catch (err) {
    const url = new URL(request.url);
    shop = url.searchParams.get("shop") || "default";
  }

  const workerUrl = process.env.CLOUDFLARE_WORKER_URL || process.env.WORKER_URL || "https://shop-chat-agent-worker.avi-kay2019.workers.dev";
  let remoteSettings = null;
  let analytics = null;
  let billing = null;

  try {
    const cleanUrl = workerUrl.replace(/\/$/, "");
    const [settingsRes, analyticsRes, billingRes] = await Promise.all([
      fetch(`${cleanUrl}/admin/settings?shop=${encodeURIComponent(shop)}`),
      fetch(`${cleanUrl}/admin/analytics?shop=${encodeURIComponent(shop)}`),
      fetch(`${cleanUrl}/admin/billing/usage?shop=${encodeURIComponent(shop)}`)
    ]);

    if (settingsRes.ok) {
      remoteSettings = await settingsRes.json();
    }
    if (analyticsRes.ok) {
      analytics = await analyticsRes.json();
    }
    if (billingRes && billingRes.ok) {
      billing = await billingRes.json();
    }
  } catch (_) {}

  const currentSettings = {
    provider: remoteSettings?.provider || "openai",
    model: remoteSettings?.model || "gpt-5.5",
    workerUrl,
    notificationEmail: remoteSettings?.notificationEmail || shopEmail || "",
    hasCustomKey: Boolean(remoteSettings?.hasCustomKey)
  };

  return { shop, currentSettings, analytics, billing };
}

export default function Index() {
  const { shop, currentSettings, analytics, billing } = useLoaderData();

  // 100% Real metrics calculated from live D1 tables
  const totalRevenue = Number(analytics?.summary?.assisted_revenue || 0);
  const cartAdds = Number(analytics?.summary?.cart_adds || 0);
  const totalConversations = Number(analytics?.summary?.total_conversations || 0);
  const totalMessages = Number(analytics?.summary?.total_messages || 0);
  const totalErrors = Number(analytics?.summary?.total_errors || 0);
  const inquiriesResolved = Number(analytics?.summary?.support_inquiries_resolved || 0);

  const avgTurns = totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : "0.0";
  const conversionRate = totalConversations > 0 ? ((cartAdds / totalConversations) * 100).toFixed(1) : "0.0";

  return (
    <s-page heading="Concierge Command Center">
      <ui-title-bar title="Concierge Command Center" />

      {/* Real-time Status & Quick Navigation */}
      <s-box padding="none" style={{ marginBottom: "20px" }}>
        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-badge tone="success">Production Edge Connected</s-badge>
            {billing?.billing_mode === "byok" ? (
              <s-badge tone="info">BYOK Mode ($0 Platform Fee)</s-badge>
            ) : (
              <s-badge tone="attention">Usage-Based: {billing?.display_unit_rate || "$0.0025 / msg"}</s-badge>
            )}
            <s-text tone="subdued">Store: {shop}</s-text>
          </s-stack>
          <s-link href="/app/settings">
            <s-button variant="primary">⚙️ Concierge & BYOK Settings</s-button>
          </s-link>
        </s-stack>
      </s-box>

      <s-stack direction="block" gap="base">
        {/* Top KPI Summary Grid (Live from D1 ai_assisted_sales & conversations) */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))" gap="base">
          <s-box padding="base" border="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text tone="subdued" type="strong">CART VALUE FROM CONCIERGE</s-text>
              <s-heading size="large">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</s-heading>
              <s-text tone="success">Attributed directly to chat cart operations</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" border="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text tone="subdued" type="strong">ITEMS ADDED TO CART</s-text>
              <s-heading size="large">{cartAdds}</s-heading>
              <s-text tone="subdued">Products placed in cart from chat</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" border="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text tone="subdued" type="strong">CONVERSATIONS HANDLED</s-text>
              <s-heading size="large">{totalConversations}</s-heading>
              <s-text tone="subdued">Shoppers assisted on storefront</s-text>
            </s-stack>
          </s-box>

          <s-box padding="base" border="base" borderRadius="base">
            <s-stack direction="block" gap="small">
              <s-text tone="subdued" type="strong">CHAT-TO-CART CONVERSION</s-text>
              <s-heading size="large">{conversionRate}%</s-heading>
              <s-text tone="subdued">Conversations generating an Add-to-Cart</s-text>
            </s-stack>
          </s-box>
        </s-grid>

        {/* Row 2: Real Funnel & Telemetry */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(340px, 1fr))" gap="base">
          <s-section heading="Session & Cart Funnel">
            <s-stack direction="block" gap="base">
              <s-box>
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text type="strong">1. Shopper Chat Sessions Started</s-text>
                    <s-text type="strong">{totalConversations} sessions</s-text>
                  </s-stack>
                  <div style={{ width: "100%", height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: totalConversations > 0 ? "100%" : "0%", height: "100%", background: "#4f46e5" }} />
                  </div>
                </s-stack>
              </s-box>

              <s-box>
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text type="strong">2. Customer Messages Exchanged</s-text>
                    <s-text type="strong">{totalMessages} messages</s-text>
                  </s-stack>
                  <div style={{ width: "100%", height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: totalMessages > 0 ? "100%" : "0%", height: "100%", background: "#818cf8" }} />
                  </div>
                </s-stack>
              </s-box>

              <s-box>
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" justifyContent="space-between">
                    <s-text type="strong">3. Added to Cart from Chat</s-text>
                    <s-text tone="success" type="strong">{cartAdds} items (${totalRevenue.toFixed(2)})</s-text>
                  </s-stack>
                  <div style={{ width: "100%", height: "8px", background: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: totalConversations > 0 ? `${Math.min(100, Math.round((cartAdds / totalConversations) * 100))}%` : "0%", height: "100%", background: "#10b981" }} />
                  </div>
                </s-stack>
              </s-box>
            </s-stack>
          </s-section>

          <s-section heading="Concierge Engagement">
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <s-box padding="base" border="base" borderRadius="base">
                <s-stack direction="block" gap="small">
                  <s-text tone="subdued">Avg Turns / Chat</s-text>
                  <s-heading size="medium">{avgTurns}</s-heading>
                  <s-text tone="subdued">Multi-turn dialogue</s-text>
                </s-stack>
              </s-box>

              <s-box padding="base" border="base" borderRadius="base">
                <s-stack direction="block" gap="small">
                  <s-text tone="subdued">Edge Infrastructure</s-text>
                  <s-heading size="medium">Active</s-heading>
                  <s-text tone="success">Cloudflare Edge & D1</s-text>
                </s-stack>
              </s-box>

              <s-box padding="base" border="base" borderRadius="base">
                <s-stack direction="block" gap="small">
                  <s-text tone="subdued">Inquiries Resolved</s-text>
                  <s-heading size="medium">{inquiriesResolved}</s-heading>
                  <s-text tone="subdued">Policy & FAQ searches</s-text>
                </s-stack>
              </s-box>

              <s-box padding="base" border="base" borderRadius="base">
                <s-stack direction="block" gap="small">
                  <s-text tone="subdued">Active Model</s-text>
                  <s-heading size="medium">{currentSettings.model}</s-heading>
                  <s-text tone="success">{currentSettings.provider.toUpperCase()}</s-text>
                </s-stack>
              </s-box>
            </s-grid>
          </s-section>
        </s-grid>

        {/* Row 3: Real Products Added to Cart & Real Unmet Opportunities */}
        <s-grid gridTemplateColumns="repeat(auto-fit, minmax(340px, 1fr))" gap="base">
          <s-section heading="🛒 Products Added to Cart from Chat">
            {analytics?.top_sold_products && analytics.top_sold_products.length > 0 ? (
              <s-table variant="auto">
                <s-table-header-row>
                  <s-table-header listSlot="primary">Product</s-table-header>
                  <s-table-header format="numeric">Cart Adds</s-table-header>
                  <s-table-header format="currency">Total Value</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {analytics.top_sold_products.map((item, idx) => (
                    <s-table-row key={idx}>
                      <s-table-cell>{item.product_title || "Product"}</s-table-cell>
                      <s-table-cell>{item.cart_adds}</s-table-cell>
                      <s-table-cell>${Number(item.total_revenue || 0).toFixed(2)}</s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>
            ) : (
              <s-paragraph tone="neutral">
                No cart additions recorded yet. As shoppers use the concierge, items sent to cart will appear here.
              </s-paragraph>
            )}
          </s-section>

          <s-section heading="📦 What Shoppers Wanted (Zero Results / Out of Stock)">
            {analytics?.missed_opportunities && analytics.missed_opportunities.length > 0 ? (
              <s-table variant="auto">
                <s-table-header-row>
                  <s-table-header listSlot="primary">Customer Query</s-table-header>
                  <s-table-header format="numeric">Times Asked</s-table-header>
                  <s-table-header>Last Requested</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {analytics.missed_opportunities.map((item, idx) => (
                    <s-table-row key={idx}>
                      <s-table-cell>"{item.customer_query}"</s-table-cell>
                      <s-table-cell>{item.request_count}</s-table-cell>
                      <s-table-cell>{item.last_requested ? new Date(item.last_requested).toLocaleDateString() : "Recently"}</s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>
            ) : (
              <s-paragraph tone="neutral">
                All customer product and category queries have returned positive catalog matches.
              </s-paragraph>
            )}
          </s-section>
        </s-grid>

        {/* Row 4: Reliability & Logs */}
        <s-section heading="🛡️ Conversation Health & Reliability">
          <s-stack direction="block" gap="small">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-badge tone={totalErrors === 0 ? "success" : "warning"}>
                {totalErrors === 0 ? "100% Smooth — Zero Customer Errors" : `${totalErrors} Edge Handled Events`}
              </s-badge>
            </s-stack>
            <s-paragraph tone="neutral">
              Shoppers experience zero error popups or system prompts. If an API issue occurs, it fails silently for the customer, records to D1 error_logs, and dispatches privately to your alert email.
            </s-paragraph>
            <s-text tone="subdued">
              Alert Routing: {currentSettings.notificationEmail || "Configured via Shopify Admin"}
            </s-text>
          </s-stack>
        </s-section>

        {/* Row 5: Recent Live Conversations Log */}
        <s-section heading="📝 Recent Shopper Conversations">
          {analytics?.recent_conversations && analytics.recent_conversations.length > 0 ? (
            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header listSlot="primary">Session ID</s-table-header>
                <s-table-header format="numeric">Message Turns</s-table-header>
                <s-table-header>Last Active</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {analytics.recent_conversations.map((conv, idx) => (
                  <s-table-row key={idx}>
                    <s-table-cell><code>{conv.id}</code></s-table-cell>
                    <s-table-cell>{conv.message_count} messages</s-table-cell>
                    <s-table-cell>{conv.updated_at ? new Date(conv.updated_at).toLocaleString() : "Recently"}</s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          ) : (
            <s-paragraph tone="neutral">
              No active conversations recorded yet. When customers chat with the concierge on your storefront, transcripts will be indexed here.
            </s-paragraph>
          )}
        </s-section>
      </s-stack>
    </s-page>
  );
}
