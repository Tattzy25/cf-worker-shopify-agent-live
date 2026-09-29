/**
 * Smart Events Client Dispatcher
 * Storefront AI Shopping Concierge
 * 
 * Routes storefront events to:
 * 1. Cloudflare Worker Edge (/analytics/event -> Analytics Engine & D1)
 * 2. Microsoft Clarity (window.clarity)
 * 3. Shopify Analytics & Web Pixels (window.Shopify.analytics.publish)
 */
(function() {
  'use strict';

  function getBaseWorkerUrl() {
    if (window.shopChatConfig && window.shopChatConfig.apiUrl) {
      return window.shopChatConfig.apiUrl.replace(/\/+$/, '');
    }
    return 'https://chat.facetimefy.com';
  }

  let cachedStoreDomain = null;

  function getStoreDomain() {
    if (cachedStoreDomain) return cachedStoreDomain;
    try {
      const stored = sessionStorage.getItem('shop_well_known_domain');
      if (stored) {
        cachedStoreDomain = stored;
        return stored;
      }
    } catch (_) {}

    // Async warm well-known discovery
    fetch('/.well-known/ucp', { headers: { 'Accept': 'application/json' } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        const ucp = data.ucp || data;
        const shoppingService = ucp.services?.['dev.ucp.shopping']?.find(s => s.transport === 'mcp') || ucp.services?.['dev.ucp.shopping']?.[0];
        let domain = null;
        if (shoppingService?.endpoint) {
          try { domain = new URL(shoppingService.endpoint).hostname; } catch (_) {}
        }
        if (!domain && ucp.supported_versions) {
          const firstVerUrl = Object.values(ucp.supported_versions)[0];
          if (firstVerUrl) {
            try { domain = new URL(firstVerUrl).hostname; } catch (_) {}
          }
        }
        if (domain) {
          cachedStoreDomain = domain;
          try { sessionStorage.setItem('shop_well_known_domain', domain); } catch (_) {}
        }
      })
      .catch(() => {});

    cachedStoreDomain = window.location.hostname;
    return cachedStoreDomain;
  }

  function getActiveConversationId() {
    try {
      return sessionStorage.getItem('shopAiConversationId') || '';
    } catch (_) {
      return '';
    }
  }

  /**
   * Main dispatch function exposed globally
   * @param {string} eventType - Smart Event name (e.g., 'AgentActive', 'AgentAddToCartClick')
   * @param {Object} metadata - Optional properties (price, product_id, product_title, etc.)
   */
  function dispatchSmartEvent(eventType, metadata = {}) {
    if (!eventType) return;

    const storeDomain = getStoreDomain();
    const conversationId = metadata.conversation_id || getActiveConversationId();
    const pageUrl = window.location.pathname + window.location.search;

    const payload = {
      event_type: eventType,
      store_domain: storeDomain,
      conversation_id: conversationId,
      page_url: pageUrl,
      timestamp: Date.now(),
      ...metadata
    };

    // 1. Dispatch to Microsoft Clarity if available
    try {
      if (typeof window.clarity === 'function') {
        window.clarity('event', eventType);

        if (eventType === 'AgentActive') {
          window.clarity('set', 'agent_assisted', 'true');
        }
        if (conversationId) {
          window.clarity('set', 'conversation_id', conversationId);
        }
        if (payload.price != null && payload.price > 0) {
          window.clarity('set', 'assisted_value', String(payload.price));
        }
      }
    } catch (clarityErr) {
      console.warn('[Clarity Dispatch] Non-blocking warning:', clarityErr);
    }

    // 2. Dispatch to Shopify Analytics & Custom DOM Event
    try {
      if (window.Shopify && window.Shopify.analytics && typeof window.Shopify.analytics.publish === 'function') {
        window.Shopify.analytics.publish(eventType, payload);
      }
      window.dispatchEvent(new CustomEvent('shop_ai:event', { detail: payload }));
      window.dispatchEvent(new CustomEvent(`shop_ai:${eventType}`, { detail: payload }));
    } catch (_) {}

    // 3. Dispatch to Cloudflare Worker Edge (/analytics/event)
    try {
      const apiUrl = `${getBaseWorkerUrl()}/analytics/event`;
      const bodyJson = JSON.stringify(payload);

      // Prefer fetch with keepalive: true
      if (typeof fetch === 'function') {
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: bodyJson,
          keepalive: true
        }).catch(() => {
          // Fallback to sendBeacon on network failure if available
          if (navigator && typeof navigator.sendBeacon === 'function') {
            try {
              navigator.sendBeacon(apiUrl, bodyJson);
            } catch (_) {}
          }
        });
      } else if (navigator && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(apiUrl, bodyJson);
      }
    } catch (edgeErr) {
      console.warn('[Edge Dispatch] Non-blocking warning:', edgeErr);
    }
  }

  // Expose globally
  window.dispatchSmartEvent = dispatchSmartEvent;

  // Track initial launcher availability once DOM is ready
  function initBubbleTracker() {
    if (document.getElementById('shop-ai-launcher')) {
      dispatchSmartEvent('AgentBubbleShown');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBubbleTracker);
  } else {
    initBubbleTracker();
  }
})();
