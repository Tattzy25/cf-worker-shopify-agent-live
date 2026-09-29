# EVENT ROUTING SPECIFICATION & D1 SCHEMA MAPPING

This document defines the complete event routing architecture for the **Storefront AI Shopping Concierge**, mapping storefront telemetry directly into Cloudflare D1 tables (`facetimefy`) and Cloudflare Analytics Engine.

---

## 1. D1 Database Schema (`facetimefy`)

The database consists of 6 primary relational tables:

```sql
-- 1. Daily Aggregated Store Performance
CREATE TABLE analytics (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  date TEXT NOT NULL,
  conversations INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0,
  avg_order_value INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Merchant Configuration & BYOK
CREATE TABLE merchants (
  shop TEXT PRIMARY KEY,
  notification_email TEXT,
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-5.5',
  api_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  custom_prompt TEXT,
  agent_profile_url TEXT
);

-- 3. AI Assisted Sales & Conversions
CREATE TABLE ai_assisted_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0.0,
  event_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customer Demand, Zero-Results & Support Insights
CREATE TABLE customer_demand_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  customer_query TEXT NOT NULL,
  category TEXT NOT NULL,
  matched_items_count INTEGER DEFAULT 0,
  outcome TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Active & Historical Conversation Index
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  r2_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Diagnostics & Error Logs (Sanitized, Zero Raw Keys)
CREATE TABLE error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT,
  user_message TEXT,
  error TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. Event Routing Matrix

| Smart Event | Trigger Point in Storefront | Dispatched To | D1 Target Table & Mutation |
| :--- | :--- | :--- | :--- |
| **`AgentBubbleShown`** | Launcher pill mounts on storefront | Clarity + Worker | `analytics.conversations` (available sessions) |
| **`AgentActive`** | Customer opens chat window | Clarity + Worker | `conversations` (UPSERT session ID, `message_count = 0`), tags Clarity session `agent_assisted: true` |
| **`AgentNudgeShown`** | Proactive greeting or collection carousel renders | Clarity + Worker | Telemetry Engine (`ANALYTICS_ENGINE_CHAT`) |
| **`LiveMessageSent`** | Shopper sends message in chat | Clarity + Worker | `conversations` (`message_count = message_count + 1`, `updated_at = NOW()`) |
| **`AgentProductClick`** | Shopper clicks product thumbnail or title link | Clarity + Worker | `ai_assisted_sales` (`event_type = 'clicked'`) |
| **`AgentAddToCartClick`** | Shopper clicks "+ Add to cart" or detail sheet "Add to bag" | Clarity + Worker | `ai_assisted_sales` (`event_type = 'added_to_cart'`) + `analytics` (sales count + revenue) |
| **`AgentCheckout`** | Shopper proceeds to checkout | Clarity + Worker | `ai_assisted_sales` (`event_type = 'checkout_initiated'`) |
| **`AgentZeroResults`** | Search returns zero catalog matches | Worker | `customer_demand_insights` (`matched_items_count = 0`, `outcome = 'unmet_demand'`) |
| **`AgentFaqResolved`** | Shop policy or FAQ answered | Worker | `customer_demand_insights` (`outcome = 'policy_answered'`) |
| **`AgentFeedback`** | Thumbs up / thumbs down clicked | Clarity + Worker | Telemetry Engine (`ANALYTICS_ENGINE_CHAT`) |

---

## 3. Architecture & File Structure

```text
├── EVENT_ROUTING.md                              # This specification
├── worker/
│   └── src/
│       ├── index.js                              # Main Worker entrypoint
│       ├── routes/
│       │   └── events.js                         # Modular event router (D1 + Analytics Engine)
│       └── prompt.js                             # Master MCP prompt & tool declarations
└── extensions/
    └── chat-bubble/
        ├── blocks/
        │   └── chat-interface.liquid             # Storefront embed & config injection
        └── assets/
            ├── events.js                         # Client-side Smart Event dispatcher (Clarity + Edge)
            ├── chat.js                           # Storefront chat UI & LiveCommerce engine
            └── chat.css                          # Storefront stylesheet
```
