# BLUEPRINT: CONVERSATION ANALYTICS, CLOUDFLARE PIPELINES & ADMIN UI

> **Objective:** Transform raw, unreadable JSON conversation blobs stored in Cloudflare R2 into human-friendly chat transcripts, customer demand insights, and sales attribution directly inside the Shopify Merchant Admin.

---

## 1. Current State vs. Target State

```
CURRENT STATE (Raw & Manual)
[Shopper Chat] ──► [Worker] ──► [R2 JSON Blobs] ──► Manual Cloudflare Dashboard ──► Hard to Read Raw JSON

TARGET STATE (Automated, Structured & Human-Friendly)
[Shopper Chat] ──► [Worker]
                      ├─► [R2 Archive] (Raw transcripts backup)
                      ├─► [Cloudflare Pipeline] ──► [R2 Iceberg Lake] (Instant SQL querying & reports)
                      └─► [Shopify Admin App] ──► [Human Chat Viewer & Insights UI] (Clean, readable bubbles)
```

---

## 2. Core Pillars of the Solution

### Pillar 1: Human-Readable Conversation Viewer (In Shopify Admin)
- **Problem:** Currently, viewing a conversation requires opening Cloudflare, locating a store folder, opening a file like `conv_1790627048628.json`, and deciphering nested JSON.
- **Solution:** A clean, Polaris-based conversation log inside the Shopify App (`app/routes/app.conversations.jsx` or as a tab in `app._index.jsx`):
  - **Chat Transcript View:** Renders conversations like a standard messaging app (Shopper messages on the right, AI responses on the left).
  - **Filter by Store & Date:** Easily jump to any date, customer session, or keyword.
  - **Status Indicators:** Clear badges showing whether the customer added an item to cart, requested human handoff, or encountered an issue.

### Pillar 2: Cloudflare Pipelines (Stream ➔ SQL ➔ Sink)
- **Problem:** As chat volume scales into thousands of messages per day, scanning individual files in R2 becomes impossible.
- **Solution:** Use Cloudflare Pipelines to continuously process chat events:
  1. **Stream (`chat_events_stream`):** Worker pushes structured event payloads (`message_sent`, `product_viewed`, `cart_added`).
  2. **Pipeline (SQL Transform):** Flattens nested JSON into structured columns (Store Domain, Timestamp, Customer Message, AI Response, Products Shown, Cart Total).
  3. **Sink (`analytics_iceberg_sink`):** Flushes structured Parquet files into an Apache Iceberg table in R2 Data Catalog for instant querying.

### Pillar 3: Customer Demand & "Lost Sales" Radar
- **Problem:** Merchants have no easy way to know what customers wanted to buy but couldn't find.
- **Solution:** A real-time insight table that captures unmet demand:
  - If a shopper asks for *"size 14 red boots"* and the store has zero inventory, the pipeline logs an **Unmet Opportunity** record:
    - Customer Query: *"size 14 red boots"*
    - Category: Footwear
    - Matched Count: `0`
    - Outcome: `Out of Stock` / `Not Carried`
  - Merchant sees a ranked list in Shopify Admin: *"18 customers asked for Size 14 boots this week."*

### Pillar 4: AI Assisted Sales Attribution
- **Problem:** Merchants need proof of ROI showing that the AI shopping concierge actually generates revenue.
- **Solution:** Log every `/cart/add.js` triggered by an AI recommendation:
  - Product ID & Title
  - Cart Value
  - Conversation ID reference
  - Merchant sees total AI-generated revenue directly in App Home.

---

## 3. Data Schema & Architecture

### A. D1 Database Relational Tables (Fast Edge Lookups)

```sql
-- 1. Conversation Index
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  r2_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI Assisted Sales (Revenue Tracking)
CREATE TABLE IF NOT EXISTS ai_assisted_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0.0,
  event_type TEXT NOT NULL, -- 'cart_add' | 'checkout_started'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Demand Insights (Unmet Needs)
CREATE TABLE IF NOT EXISTS customer_demand_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  customer_query TEXT NOT NULL,
  category TEXT NOT NULL,
  matched_items_count INTEGER DEFAULT 0,
  outcome TEXT NOT NULL, -- 'zero_results' | 'out_of_stock' | 'recommended'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### B. Cloudflare Pipeline Stream Schema (`chat_events_stream`)

```json
{
  "fields": [
    { "name": "event_id", "type": "string", "required": true },
    { "name": "shop", "type": "string", "required": true },
    { "name": "conversation_id", "type": "string", "required": true },
    { "name": "role", "type": "string", "required": true },
    { "name": "message", "type": "string", "required": true },
    { "name": "products_recommended", "type": "string", "required": false },
    { "name": "cart_action", "type": "bool", "required": false },
    { "name": "amount", "type": "float64", "required": false }
  ]
}
```

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Edge Worker Endpoints for Conversation Reading
- [ ] **Endpoint: `GET /admin/conversations?shop={shop}`**
  - Returns paginated list of conversations from D1 (`id`, `created_at`, `message_count`, `preview`).
- [ ] **Endpoint: `GET /admin/conversations/:id?shop={shop}`**
  - Fetches the full JSON transcript from R2 (`conversations/{shop}/{id}.json`) and formats it for clean display.
- [ ] **Endpoint: `GET /admin/insights?shop={shop}`**
  - Aggregates top unmet customer queries and total AI-assisted sales from D1.

### Phase 2: Shopify Admin UI Components (Polaris)
- [ ] **Conversation Browser Component:**
  - Sidebar list of recent customer chats sorted by time.
  - Active chat window rendering user messages in blue bubbles and AI responses in neutral bubbles.
- [ ] **Demand Radar Card:**
  - Table of top 5 customer search terms that yielded zero inventory.
- [ ] **Revenue Summary Card:**
  - Total items added to cart via AI with estimated attributed value.

### Phase 3: Cloudflare Pipelines Deployment (Streaming ETL)
- [ ] **Stream Creation:** Set up `chat_events_stream` in Cloudflare account.
- [ ] **Sink Creation:** Connect to R2 Data Catalog with Apache Iceberg formatting.
- [ ] **Pipeline SQL:** Configure continuous transformation and automatic daily partitioning.
- [ ] **Worker Binding:** Add `pipelines` binding in `wrangler.jsonc` to push events via `ctx.waitUntil(env.STREAM.send([event]))`.

---

## 5. Merchant & Admin Experience (How It Feels to Use)

1. **No Cloudflare Logins Needed:** The store owner never touches Cloudflare, R2, or raw code.
2. **Instant Clarity:** Open the Shopify Admin &rarr; Click the Facetimefy App &rarr; Click "Conversations".
3. **Actionable Business Intelligence:**
   - Store owners can read verbatim customer questions to see what real shoppers care about.
   - Merchandisers can immediately order stock for items customers are actively asking for.
