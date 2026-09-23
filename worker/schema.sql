-- D1 Database Schema for Shop Chat Agent

CREATE TABLE IF NOT EXISTS merchants (
  shop TEXT PRIMARY KEY,
  notification_email TEXT NOT NULL,
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-5.5',
  api_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  r2_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT,
  user_message TEXT,
  error TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Assisted Sales & Product Recommendations
CREATE TABLE IF NOT EXISTS ai_assisted_sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0.0,
  event_type TEXT NOT NULL, -- 'recommended' | 'clicked' | 'added_to_cart'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer Demand & Support Inquiry Insights
CREATE TABLE IF NOT EXISTS customer_demand_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  customer_query TEXT NOT NULL,
  category TEXT NOT NULL, -- 'product_search' | 'shipping_policy' | 'returns_policy' | 'sizing' | 'faq'
  matched_items_count INTEGER DEFAULT 0, -- 0 indicates unmet demand / out of stock
  outcome TEXT NOT NULL, -- 'added_to_cart' | 'zero_results' | 'policy_answered'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_shop ON conversations(shop);
CREATE INDEX IF NOT EXISTS idx_error_logs_shop ON error_logs(shop);
CREATE INDEX IF NOT EXISTS idx_ai_sales_shop ON ai_assisted_sales(shop, event_type);
CREATE INDEX IF NOT EXISTS idx_demand_shop ON customer_demand_insights(shop, matched_items_count);
