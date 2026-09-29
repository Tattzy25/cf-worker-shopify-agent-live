# USAGE-BASED BILLING ARCHITECTURE: WORKERS ANALYTICS ENGINE & D1

> **STRICT COMPLIANCE NOTICE**
> - **ZERO-FALLBACK PROTOCOL:** If a merchant configures BYOK, execute EXCLUSIVELY on their key. If the key is invalid, throw immediately. NEVER silently fall back to platform keys or charge platform usage.
> - **USAGE-BASED BILLING (NON-BYOK):** When a merchant chooses NOT to BYOK, execution is handled by platform keys and billed per usage.
> - **5x MINIMUM MARKUP:** Raw upstream model API costs (OpenAI / Gemini) are marked up by a minimum multiplier of **5.0x** (`env.BILLING_MARKUP_MULTIPLIER`).
> - **LOWEST POSSIBLE DISPLAY UNIT:** Merchants are never shown frightening aggregate cost ratios or raw markup margins. Pricing is displayed in the lowest digestible micro-unit (e.g. `"$0.0025 / message"`).
> - **ZERO HARDCODING:** All rates and pricing structures are dynamically resolved via the Model Pricing Registry (`worker/src/pricing.js`).

---

## 1. Cloudflare Workers Analytics Engine Implementation

Following Cloudflare's official SaaS usage-based billing recipe, every AI chat turn is written to the Analytics Engine dataset `shop_chat_analytics` (`env.ANALYTICS_ENGINE_CHAT`), indexed strictly by the merchant store domain for isolated per-customer sampling.

### `writeDataPoint` Specification

```javascript
env.ANALYTICS_ENGINE_CHAT.writeDataPoint({
  indexes: [storeDomain], // index1: Customer/Merchant ID (enables per-tenant sampling)
  blobs: [
    "platform_usage",     // blob1: Event type for billing queries
    storeDomain,          // blob2: Store domain (myshopifyDomain)
    model,                // blob3: Model identifier (e.g., 'gpt-5.5', 'gemini-3.6-flash')
    billingMode,          // blob4: 'platform_usage' | 'byok'
    conversationId,       // blob5: Conversation ID
    provider,             // blob6: 'openai' | 'gemini'
    displayUnitRate,      // blob7: Human-readable unit rate (e.g., '$0.0025/msg')
    status                // blob8: 'success' | 'error'
  ],
  doubles: [
    1,                    // double1: Canonical count (1 turn) for sum(_sample_interval * double1)
    latencyMs,            // double2: Execution latency in milliseconds
    totalTokens,          // double3: Combined prompt + completion tokens
    billedCost            // double4: Final billed amount in USD (e.g., 0.0025)
  ]
});
```

---

## 2. Analytics Engine SQL Queries for Billing & Observability

### Monthly Customer Usage & Billing Total

```sql
SELECT
  index1 AS customer_id,
  blob3 AS model,
  blob4 AS billing_mode,
  sum(_sample_interval) AS total_turns,
  sum(_sample_interval * double3) AS total_tokens,
  sum(_sample_interval * double4) AS total_billed_usd
FROM
  shop_chat_analytics
WHERE
  index1 = 'facetimefy.myshopify.com'
  AND blob1 = 'platform_usage'
  AND timestamp >= toDateTime('2026-09-01 00:00:00')
  AND timestamp < toDateTime('2026-10-01 00:00:00')
GROUP BY customer_id, model, billing_mode
```

### Daily Usage Breakdown

```sql
SELECT
  index1 AS customer_id,
  toStartOfInterval(timestamp, INTERVAL '1' DAY) AS date,
  blob3 AS model,
  sum(_sample_interval) AS request_count,
  sum(_sample_interval * double4) AS daily_billed_usd
FROM
  shop_chat_analytics
WHERE
  index1 = 'facetimefy.myshopify.com'
  AND blob1 = 'platform_usage'
  AND timestamp >= toDateTime('2026-09-01 00:00:00')
GROUP BY customer_id, date, model
ORDER BY date ASC
```

---

## 3. D1 Persistence Schema (`merchant_usage_billing`)

To allow instant dashboard rendering inside Shopify Admin without relying on external analytics dashboards, all usage events are also recorded in Cloudflare D1:

```sql
CREATE TABLE IF NOT EXISTS merchant_usage_billing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  billing_mode TEXT NOT NULL, -- 'platform_usage' | 'byok'
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  raw_cost REAL DEFAULT 0.0,
  billed_cost REAL DEFAULT 0.0,
  display_rate TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_shop ON merchant_usage_billing(shop, created_at);
```

---

## 4. Model Pricing Registry & 5x Markup Formula

| Model | Raw Input / 1M | Raw Output / 1M | Raw Virtual Try-On | 5x Billed / 1M Input | 5x Billed / 1M Output | Lowest Display Unit (Merchant) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`gemini-3.6-flash`** | \$0.075 | \$0.30 | N/A | \$0.375 | \$1.50 | **\$0.0025 / message** |
| **`gpt-4o-mini`** | \$0.15 | \$0.60 | N/A | \$0.75 | \$3.00 | **\$0.005 / message** |
| **`gpt-5.5`** | \$2.50 | \$10.00 | N/A | \$12.50 | \$50.00 | **\$0.025 / message** |
| **`gemini-2.5-pro`** | \$1.25 | \$5.00 | N/A | \$6.25 | \$25.00 | **\$0.015 / message** |
| **`gpt-image-2.5-sunburst`** | N/A | N/A | \$0.04 / img | N/A | N/A | **\$0.20 / virtual try-on** |

### Mathematical Formulation

$$\text{Raw Cost} = \left(\frac{\text{Prompt Tokens}}{1,000,000} \times \text{Input Rate}\right) + \left(\frac{\text{Completion Tokens}}{1,000,000} \times \text{Output Rate}\right) + (\text{Images} \times \text{Image Rate})$$

$$\text{Billed Cost} = \text{Raw Cost} \times \max(5.0, \text{env.BILLING\_MARKUP\_MULTIPLIER})$$

$$\text{Display Rate} = \text{Formatted unit price in lowest digestible form (e.g. \"\$0.0025 / message\")}$$
