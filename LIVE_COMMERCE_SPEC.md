# STOREFRONT AI SHOPPING CONCIERGE: IN-STREAM LIVECOMMERCE SPECIFICATION

## 1. System Vision & Architecture
The Storefront AI Shopping Concierge brings the rich, responsive `LiveCommerce` engine directly into the merchant's storefront chat stream. 
All interactions—product discovery, card browsing, variant configuration, cart additions, and checkout handoff—occur seamlessly **inside the chat interface** (`#shop-ai-messages`), preserving the native store experience without intrusive external floating elements.

---

## 2. Customer Interaction Lifecycle

```
[ Storefront Shopper ]
       │
       ▼
1. Unobtrusive Circular Launcher (Expands on hover to "Shop with AI")
       │ (Taps launcher)
       ▼
2. Chat Window Opens (Warm store welcome, quick collection chips)
       │ (Shopper browses or asks about products)
       ▼
3. Edge Request to Cloudflare Worker (/chat -> OpenAI gpt-5.5 + Master MCP)
       │ (Calls search_catalog / lookup_catalog)
       ▼
4. In-Stream LiveCommerce Stream:
   ├── Assistant Text: Pure conversational advice and guidance (Zero markdown table pipes)
   └── Rich LiveCommerce Stream (Inside Chat):
       ├── "● RESULTS · N items" Header with pulse indicator
       ├── 1-row Snap Carousel of LiveCommerce Cards:
       │   ├── Aspect-square image thumbnail (with gradient fallback)
       │   ├── 2-line clamped title & seller/brand name
       │   ├── Star rating & review counts
       │   ├── Formatted price & compare-at price
       │   └── White "+ Add to cart" / "Options" button
       └── Quick Follow-up Suggestion Chips
       │
       ▼ (Shopper clicks "+ Add to cart" or card)
5. In-Stream Variant & Options Selection:
   ├── If multiple options (size, color, travel tin vs full size):
   │   Renders dynamic option chips directly in the chat feed
   └── Shopper selects options and taps "Confirm"
       │
       ▼
6. Native Shopify Cart Integration:
   ├── Dispatches `{ id: variantId, quantity: 1 }` directly to Shopify `/cart/add.js`
   ├── Updates native Shopify header cart badge and chat cart counter
   └── Renders In-Stream Cart Confirmation Card:
       "✓ Added to bag" · Product Title · Selected Variant · Price
       [ Continue browsing ]    [ Checkout ]
       │
       ▼ (Shopper clicks [ Checkout ] or types "checkout")
7. Instant Direct Checkout:
   ├── Immediate handoff to Shopify native `/checkout`
   └── Zero requests for customer email or phone in chat (Shopify natively collects buyer info).
```

---

## 3. UI Component Specifications (Inside Chat Window)

### 3.1. Floating Launcher Button
* **Default State:** Ultra-compact circular ball (`48px x 48px`, border-radius 50%) with a white sparkle icon. Never overlaps native Shopify checkout buttons (Shop Pay, PayPal).
* **Hover State:** Smoothly transitions into the full pill (`Shop with AI`) with shimmer animation.
* **Open State:** Smooth spring animation opening the chat dialog.

### 3.2. In-Stream Product Card (`LiveCommerce.tsx` Parity)
* **Container:** White rounded card (`border-radius: 12px; background: #fafafa; padding: 8px; color: #18181b;`).
* **Thumbnail:** Aspect-square container with image cover or initials gradient fallback.
* **Badge:** Tone-aware badge (`SALE`, `NEW`, `IN STOCK`).
* **Title:** 2-line clamped title, font size 11.5px, font weight 600.
* **Seller / Brand:** Subtle store or vendor label (`text-[9.5px] text-zinc-500`).
* **Rating:** 5-star graphical bar with review count.
* **Price:** Bold primary price and strikethrough compare-at price.
* **Action:** "+ Add to cart" pill button.

### 3.3. In-Stream Carousel / Shelf
* Displays products horizontally with smooth swipe / snap-scrolling and hidden scrollbars.
* Header displays `● RESULTS · N items` with pulsing dot.
* Page dots and controls for multi-item exploration.

### 3.4. In-Stream Variant Picker
* Displays when a product with multiple variants is selected.
* Dynamically groups options (e.g. Size, Scent, Color).
* Option pills with price deltas and availability status.
* Full-width "Confirm" button to add the specific variant.

### 3.5. Direct Checkout Handoff
* Merchant and Shopify own checkout.
* The chat AI never prompts for email, phone number, or address.
* Checkout triggers direct redirect to native `/checkout`.

---

## 4. Telemetry & D1 Database Synchronization

1. **`merchants` Table:** Automatically links active shop domain (e.g. `nba0ey-th.myshopify.com`) to merchant alert email and AI config.
2. **`customer_demand_insights` Table:** Logs customer product queries, category trends, and unmet demand (zero-match queries) for merchant intelligence.
3. **`ai_assisted_sales` Table:** Records product clicks and cart additions with accurate pricing.
4. **`analytics` Table:** Aggregates daily assisted revenue, conversations, and cart additions so D1 Studio metrics match real-time events.
5. **Analytics Engine:** Streams real-time edge telemetry for performance and status tracking.
