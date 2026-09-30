/**
 * Shop AI Chat — Client-Side Storefront LiveCommerce Engine
 *
 * CRITICAL RULE: On error, show customer: "Connection error. Our team has been notified, please try again in a few minutes." Never ghost the customer.
 *
 * Architecture:
 *  - Resolvers & Router: Ported directly from COMMERCE-ADD (resolve.ts, route.ts, types.ts)
 *  - UI Presentation: Delegated 100% to window.LiveCommerceUI (live-commerce-ui.js)
 *  - Strict Zero-Fallback Protocol: Real store data only, zero mock/fake data, zero scraping
 *  - Native Shopify cart (/cart.js, /cart/add.js, /cart/change.js)
 */
(function() {
  'use strict';

  /* ==========================================================================
     1. SCHEMA-TOLERANT RESOLVERS & ROUTER (from COMMERCE-ADD)
     ========================================================================== */

  const nk = (k) => String(k || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

  function pickShallow(o, aliases) {
    if (!isObj(o)) return undefined;
    const map = new Map();
    for (const k of Object.keys(o)) map.set(nk(k), k);
    for (const a of aliases) {
      const k = map.get(nk(a));
      if (k !== undefined && o[k] != null && o[k] !== '') return o[k];
    }
    return undefined;
  }

  function pickDeep(o, aliases, maxDepth = 4) {
    const set = new Set(aliases.map(nk));
    const queue = [{ v: o, d: 0 }];
    while (queue.length) {
      const { v, d } = queue.shift();
      if (d > maxDepth) continue;
      if (isObj(v)) {
        for (const k of Object.keys(v)) {
          if (set.has(nk(k)) && v[k] != null && v[k] !== '') return v[k];
        }
        for (const k of Object.keys(v)) {
          const c = v[k];
          if (isObj(c) || Array.isArray(c)) queue.push({ v: c, d: d + 1 });
        }
      } else if (Array.isArray(v)) {
        for (const c of v) {
          if (isObj(c) || Array.isArray(c)) queue.push({ v: c, d: d + 1 });
        }
      }
    }
    return undefined;
  }

  function pick(o, aliases, deep = true) {
    const s = pickShallow(o, aliases);
    return s !== undefined ? s : deep ? pickDeep(o, aliases) : undefined;
  }

  const asString = (v) => {
    if (v == null) return null;
    if (typeof v === 'string') return v.trim() || null;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    return null;
  };

  const asNumber = (v) => {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string') {
      const m = v.replace(/[^0-9.\-]/g, '');
      if (m && m !== '-' && !isNaN(parseFloat(m))) return parseFloat(m);
    }
    return null;
  };

  const asStrings = (v) => {
    if (v == null) return [];
    if (Array.isArray(v)) return v.map(asStrings).flat().filter(Boolean);
    const s = asString(v);
    if (s) return [s];
    if (isObj(v)) return [asString(pickShallow(v, ['message', 'text', 'title', 'detail'])) || ''].filter(Boolean);
    return [];
  };

  function money(n, o) {
    if (n == null) return null;
    const cur = asString(pick(o, ['currency', 'currency_code', 'currencyCode', 'iso_currency'], false)) || window.shopInitialData?.currency || 'USD';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);
    } catch (_) {
      return `$${n.toFixed(2)}`;
    }
  }

  const MEDIA_ALIASES = [
    'image', 'images', 'image_url', 'imageUrl', 'thumbnail', 'thumbnail_url', 'thumbnailUrl',
    'product_image', 'productImage', 'picture', 'pictures', 'photos', 'media_url', 'mediaUrl',
    'hero_image', 'primary_image', 'main_image', 'media', 'url', 'src', 'featured_image'
  ];
  const urlish = (s) => /^(https?:|data:|\/|blob:)/i.test(s);

  function resolveMedia(o) {
    const v = pick(o, MEDIA_ALIASES);
    const out = [];
    const push = (x) => {
      const s = asString(x) || (isObj(x) ? asString(pickShallow(x, ['url', 'image', 'src', 'link', 'href'])) : null);
      if (s && urlish(s) && !out.includes(s)) out.push(s);
    };
    if (Array.isArray(v)) v.forEach(push);
    else if (v !== undefined) push(v);
    return out;
  }

  function resolveUrl(o) {
    const s = asString(pick(o, ['product_url', 'productUrl', 'permalink', 'canonical_url', 'link', 'url', 'handle']));
    if (!s) return null;
    if (urlish(s)) return s;
    if (!s.startsWith('/')) return `/products/${s}`;
    return s;
  }

  function resolveTitle(o) {
    return asString(pick(o, ['title', 'name', 'product_name', 'productName', 'heading', 'display_name', 'displayName', 'item_name', 'label'])) || 'Untitled item';
  }

  function resolveSeller(o) {
    const v = pick(o, ['seller', 'seller_name', 'sellerName', 'merchant', 'merchant_name', 'merchantName', 'merchant_display_name', 'store', 'store_name', 'storeName', 'storefront', 'storefront_name', 'domain', 'brand', 'shop', 'shop_name', 'shop_title', 'shopify_store', 'vendor', 'store_domain', 'sold_by', 'soldBy', 'site', 'site_name']);
    if (isObj(v)) {
      return asString(pickShallow(v, ['name', 'display_name', 'displayName', 'title', 'store_name', 'shop_name']))
        || asString(pickShallow(v, ['domain', 'url', 'hostname']));
    }
    return asString(v) || window.shopInitialData?.shopName || null;
  }

  let PRICE_UNIT = 'auto';
  function unitMode(o, v) {
    if (isObj(o)) {
      const h = pickShallow(o, ['price_unit', 'priceUnit', 'unit', 'amount_unit', 'amountUnit', 'scale', 'minor_units', 'minorUnits', 'in_cents', 'inCents']);
      if (h != null) {
        const s = String(h).toLowerCase();
        if (/cent|minor|subunit|^2$/.test(s)) return 'minor';
        if (/major|whole|dollar|unit|^0$|^1$/.test(s)) return 'major';
      }
    }
    if (PRICE_UNIT !== 'auto') return PRICE_UNIT;
    if (typeof v === 'number') return Number.isInteger(v) ? 'minor' : 'major';
    if (typeof v === 'string') return /^\s*-?\d+\s*$/.test(v) ? 'minor' : 'major';
    return null;
  }

  function priceFrom(v, o) {
    if (v == null) return null;
    const display = isObj(v) ? asString(pickShallow(v, ['display', 'formatted', 'formatted_amount', 'price_display', 'text'])) : null;
    if (display) return display;
    let src = v;
    let cur = o;
    if (isObj(v)) {
      src = pickShallow(v, ['amount', 'value', 'price', 'number']);
      cur = v;
    }
    const n = asNumber(src);
    if (n == null) return null;
    const mode = unitMode(o, src);
    return money(mode === 'minor' ? n / 100 : n, cur);
  }

  function resolvePriceLabel(o) {
    const display = asString(pick(o, ['price_display', 'priceDisplay', 'formatted_price', 'formattedPrice', 'display_price', 'price_string', 'price_text', 'price_formatted']));
    if (display) return display;
    if (isObj(o)) {
      const centKey = Object.keys(o).find(k => /(_|^)(cents?|minor)(_?$)/i.test(k));
      if (centKey) {
        const n = asNumber(o[centKey]);
        if (n != null) return money(n / 100, o);
      }
    }
    const pv = pick(o, ['price', 'current_price', 'currentPrice', 'sale_price', 'salePrice', 'unit_price', 'price_amount', 'best_price', 'amount']);
    if (pv !== undefined) {
      const s = priceFrom(pv, o);
      if (s) return s;
    }
    const min = pick(o, ['min_price', 'price_min', 'from_price', 'starting_price', 'start_price']);
    if (min !== undefined) {
      const s = priceFrom(min, o);
      if (s) return `From ${s}`;
    }
    return null;
  }

  function resolveCompareLabel(o) {
    const display = asString(pick(o, ['compare_at_display', 'compareAtDisplay', 'was_price_display'], false));
    if (display) return display;
    const v = pick(o, ['compare_at', 'compareAt', 'compare_at_price', 'original_price', 'originalPrice', 'list_price', 'listPrice', 'was_price', 'msrp', 'strike_price']);
    return v === undefined ? null : priceFrom(v, o);
  }

  function resolveRating(o) {
    let v = pick(o, ['rating', 'ratings', 'average_rating', 'averageRating', 'avg_rating', 'stars', 'review_rating', 'rating_average', 'overall_rating', 'overallRating', 'product_rating', 'score']);
    if (isObj(v)) v = pickShallow(v, ['average', 'avg', 'value', 'rating', 'score', 'mean']);
    let n = asNumber(v);
    if (n == null) return null;
    if (n > 5) n = n > 50 ? n / 20 : n / 10;
    return Math.round(Math.min(5, Math.max(0, n)) * 10) / 10;
  }

  function resolveReviews(o) {
    let v = pick(o, ['reviews', 'review_count', 'reviewCount', 'reviews_count', 'rating_count', 'ratings_count', 'ratingsCount', 'num_reviews', 'total_reviews']);
    if (v === undefined) {
      const rObj = pickShallow(o, ['rating', 'ratings', 'average_rating', 'averageRating', 'overall_rating', 'overallRating', 'product_rating']);
      if (isObj(rObj)) v = pickShallow(rObj, ['count', 'total', 'number', 'quantity', 'reviews_count']);
    }
    if (isObj(v)) v = pickShallow(v, ['count', 'total', 'number', 'quantity', 'reviews_count']);
    return asNumber(v);
  }

  function resolveBadge(o) {
    const v = pick(o, ['badge', 'badges', 'tag', 'tags', 'promotion', 'promo_label']);
    const list = asStrings(v);
    return list[0] || null;
  }

  function resolveAvailability(o) {
    const v = pick(o, ['availability', 'available', 'in_stock', 'inStock', 'stock_status', 'stockStatus', 'stock', 'inventory_status', 'quantity_available']);
    if (typeof v === 'boolean') return v ? 'In stock' : 'Out of stock';
    if (typeof v === 'number') return v > 0 ? `In stock (${v})` : 'Out of stock';
    return asString(v);
  }

  function resolveDelivery(o) {
    const v = pick(o, ['delivery', 'delivery_method', 'deliveryMethod', 'fulfillment', 'fulfillment_type', 'download', 'downloadable', 'digital', 'license_type', 'format']);
    if (typeof v === 'boolean') return v ? 'Downloadable' : null;
    return asString(v);
  }

  function resolveDescription(o) {
    const v = pick(o, ['description', 'desc', 'summary', 'blurb', 'product_description', 'long_description', 'short_description', 'details', 'body_html']);
    const list = asStrings(v);
    if (list.length) {
      const cleaned = list.join(' ').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      return cleaned || null;
    }
    return null;
  }

  const AVAIL_ALIASES = ['available', 'in_stock', 'inStock', 'stock_status', 'purchasable', 'is_available', 'stock'];
  function resolveAvailTri(v) {
    const a = pickShallow(v || {}, AVAIL_ALIASES);
    if (typeof a === 'boolean') return a;
    if (typeof a === 'number') return a > 0;
    const s = asString(a);
    if (s) return /in.?stock|available|yes|true|ok/i.test(s) ? true : /out.?stock|unavailable|no|false|sold.?out/i.test(s) ? false : null;
    return null;
  }

  function resolveOptions(o) {
    const v = pick(o, ['options', 'option_groups', 'optionGroups', 'variant_options', 'variation_options', 'attributes', 'choices']);
    const arr = Array.isArray(v) ? v : v && isObj(v) ? Object.entries(v).map(([k, val]) => ({ name: k, values: val })) : [];
    return arr.map((g, gi) => {
      const label = asString(pickShallow(g, ['name', 'label', 'option_name', 'title', 'displayName'])) || `Option ${gi + 1}`;
      let vals = pickShallow(g, ['values', 'options', 'items', 'choices', 'option_values']);
      if (!Array.isArray(vals) && isObj(vals)) vals = Object.values(vals);
      if (!Array.isArray(vals) && vals != null) vals = [vals];
      const valArr = Array.isArray(vals) ? vals : [];
      const values = valArr.map(x => {
        const lbl = asString(isObj(x) ? pickShallow(x, ['label', 'value', 'name', 'title']) : x) || '?';
        return {
          label: lbl,
          available: isObj(x) ? resolveAvailTri(x) : null,
          priceLabel: isObj(x) ? resolvePriceLabel(x) : null,
          media: isObj(x) ? resolveMedia(x)[0] || null : null,
          raw: x
        };
      }).filter(v2 => v2.label !== '?');
      return { id: asString(pickShallow(g, ['id', 'code', 'key'])) || `opt${gi}`, label, values, raw: g };
    }).filter(g => g.values.length > 0);
  }

  function resolveVariants(o) {
    const v = pick(o, ['variants', 'variant_list', 'variations', 'skus', 'offers']);
    if (!Array.isArray(v)) return [];
    return v.map((x, i) => {
      let opts = {};
      const ov = pickShallow(x, ['options', 'option_values', 'optionValues', 'attributes']);
      if (Array.isArray(ov)) {
        for (const e of ov) {
          if (isObj(e)) {
            const k = asString(pickShallow(e, ['name', 'label', 'option_name']));
            const val = asString(pickShallow(e, ['value', 'label2', 'val', 'option_value'])) || asString(pickShallow(e, ['value']));
            if (k && val) opts[k] = val;
          }
        }
      } else if (isObj(ov)) {
        for (const [k, val] of Object.entries(ov)) {
          const s = asString(isObj(val) ? pickShallow(val, ['value', 'label']) : val);
          if (s) opts[k] = s;
        }
      }
      return {
        id: asString(pickShallow(x, ['id', 'sku', 'variant_id', 'variantId'])) || `v${i}`,
        label: (asString(pickShallow(x, ['title', 'label', 'name'])) || Object.values(opts).join(' / ')) || `Variant ${i + 1}`,
        options: opts,
        priceLabel: resolvePriceLabel(x),
        availability: resolveAvailability(x),
        media: resolveMedia(x),
        raw: x
      };
    });
  }

  function normalizeProduct(raw, i = 0) {
    const o = isObj(raw) ? raw : { title: String(raw) };
    return {
      id: asString(pick(o, ['id', 'product_id', 'productId', 'sku', 'uid', 'key'], false)) || `p${i}-${Math.random().toString(36).slice(2, 8)}`,
      raw: o,
      title: resolveTitle(o),
      seller: resolveSeller(o),
      priceLabel: resolvePriceLabel(o),
      compareLabel: resolveCompareLabel(o),
      media: resolveMedia(o),
      description: resolveDescription(o),
      rating: resolveRating(o),
      reviews: resolveReviews(o),
      badge: resolveBadge(o),
      availability: resolveAvailability(o),
      url: resolveUrl(o),
      options: resolveOptions(o),
      variants: resolveVariants(o)
    };
  }

  function resolveProducts(raw) {
    let arr = pick(raw, ['products', 'results', 'items', 'product_list', 'productList', 'records', 'entries', 'listings', 'offers', 'search_results', 'searchResults'], false);
    if (!Array.isArray(arr) && isObj(arr)) {
      arr = pick(arr, ['products', 'results', 'items', 'entries', 'listings', 'offers'], false);
    }
    if (!Array.isArray(arr)) {
      const cat = pick(raw, ['catalog', 'data', 'response', 'payload', 'output'], false);
      if (isObj(cat)) {
        arr = pick(cat, ['products', 'results', 'items', 'entries', 'listings', 'offers'], false);
      }
    }
    if (!Array.isArray(arr)) {
      arr = pickDeep(raw, ['products', 'results', 'items', 'entries', 'listings', 'offers'], 4);
    }
    if (Array.isArray(arr)) return arr.map((x, i) => normalizeProduct(x, i));
    const single = pickShallow(raw, ['product', 'item', 'detail', 'product_detail'])
      || (isObj(raw) && isObj(raw.catalog) ? pickShallow(raw.catalog, ['product', 'item', 'detail', 'product_detail']) : null);
    if (isObj(single)) return [normalizeProduct(single)];
    return [];
  }

  function resolveTotals(raw) {
    const v = pick(raw, ['totals', 'total', 'summary', 'amounts', 'price_totals', 'cart_totals'], false) || pickDeep(raw, ['totals'], 3);
    const arr = Array.isArray(v) ? v : v != null ? [v] : [];
    return arr.map((t, i) => {
      if (!isObj(t)) return { label: 'Total', display: String(t), raw: t };
      const label = asString(pickShallow(t, ['label', 'type', 'name', 'title'])) || (i === arr.length - 1 ? 'Total' : `Total ${i + 1}`);
      const display = asString(pickShallow(t, ['display', 'formatted', 'formatted_amount', 'text'])) ||
        priceFrom(pickShallow(t, ['amount', 'value', 'price', 'total']), t) || '—';
      return { label, display, raw: t };
    });
  }

  function resolveCart(raw) {
    const cartObj = isObj(pickShallow(raw, ['cart', 'cart_state', 'cartState', 'bag'])) ? pickShallow(raw, ['cart', 'cart_state', 'cartState', 'bag']) : raw;
    const linesArr = pick(cartObj, ['lines', 'line_items', 'lineItems', 'items', 'cart_items'], false);
    const lines = (Array.isArray(linesArr) ? linesArr : []).map((l, i) => ({
      id: asString(pickShallow(l, ['line_id', 'lineId', 'id', 'variant_id', 'key'])) || `l${i}`,
      raw: l,
      title: resolveTitle(l),
      media: resolveMedia(l)[0] || null,
      qty: asNumber(pickShallow(l, ['quantity', 'qty', 'count', 'units'])) || 1,
      optionsLabel: asStrings(pickShallow(l, ['selected_options', 'options_label', 'variant_title', 'options'])).join(', ') || null,
      priceLabel: resolvePriceLabel(l)
    }));
    return {
      raw,
      lines,
      totals: resolveTotals(cartObj),
      messages: asStrings(pick(cartObj, ['messages', 'message', 'notes', 'warnings'], false)),
      recommendations: resolveProducts(pick(cartObj, ['recommendations', 'recommended', 'related'], false))
    };
  }

  function resolveCheckout(raw) {
    const c = isObj(pickShallow(raw, ['checkout', 'checkout_state', 'checkoutState'])) ? pickShallow(raw, ['checkout', 'checkout_state', 'checkoutState']) : raw;
    const url = asString(pick(c, ['checkout_url', 'checkoutUrl', 'continuation_url', 'continuationUrl', 'continue_url', 'embed_url', 'embedUrl', 'iframe_url', 'iframeUrl', 'url', 'link'], false)) || '/checkout';
    const modeHint = asString(pick(c, ['checkout_mode', 'mode', 'presentation', 'surface'], false))?.toLowerCase() || '';
    let mode = 'external';
    if (/iframe|embed|webview|inline/.test(modeHint)) mode = 'iframe';
    return {
      raw,
      mode,
      url,
      messages: asStrings(pick(c, ['messages', 'message', 'instructions', 'notice', 'warnings'], false)),
      progress: asStrings(pick(c, ['progress', 'steps', 'stage', 'status'], false)),
      buyerActions: (Array.isArray(pick(c, ['required_actions', 'buyer_actions', 'actions'], false))
        ? pick(c, ['required_actions', 'buyer_actions', 'actions'], false)
        : []).map(a => ({ label: asString(isObj(a) ? pickShallow(a, ['label', 'title', 'name']) : a) || 'Continue', raw: a }))
    };
  }

  function resolveOrder(raw) {
    const o = isObj(pickShallow(raw, ['order', 'order_confirmation', 'confirmation'])) ? pickShallow(raw, ['order', 'order_confirmation', 'confirmation']) : raw;
    const detailsSrc = pick(o, ['details', 'summary', 'lines', 'items'], false);
    const details = (Array.isArray(detailsSrc) ? detailsSrc : detailsSrc && isObj(detailsSrc) ? [detailsSrc] : [])
      .map((d, i) => ({
        label: asString(isObj(d) ? pickShallow(d, ['label', 'type', 'name', 'title']) : null) || `Detail ${i + 1}`,
        display: asString(isObj(d) ? pickShallow(d, ['display', 'value', 'amount', 'formatted', 'text']) : d) || '—',
        raw: d
      }));
    return {
      raw,
      id: asString(pick(o, ['order_id', 'orderId', 'order_number', 'orderNumber', 'confirmation_number', 'confirmation_id'], false)),
      message: asStrings(pick(o, ['message', 'confirmation_message', 'summary_message', 'status_message'], false))[0] || null,
      details
    };
  }

  const resolveMessages = (raw) =>
    asStrings(pick(raw, ['messages', 'message', 'notice', 'notes', 'status_message', 'toast'], false));

  const VIEW_HINTS = {
    discovery: 'discovery', search: 'discovery', results: 'discovery', catalog: 'discovery',
    collection: 'discovery', collections: 'discovery', recommendations: 'discovery', shelf: 'discovery',
    product: 'detail', detail: 'detail', productdetail: 'detail', pdp: 'detail', productcard: 'detail',
    cartconfirm: 'cartConfirm', cartconfirmation: 'cartConfirm', addtocart: 'cartConfirm', addtocartresult: 'cartConfirm',
    cart: 'cart', cartstate: 'cart', bag: 'cart',
    checkout: 'checkout', checkoutcontinuation: 'checkout', embeddedcheckout: 'checkout',
    complete: 'complete', completion: 'complete', order: 'complete', ordercomplete: 'complete',
    orderconfirmation: 'complete', confirmation: 'complete',
    message: 'message', toast: 'message', notice: 'message'
  };

  function routeResult(raw, hint) {
    const base = {
      view: 'unknown',
      products: [],
      product: null,
      cart: null,
      checkout: null,
      order: null,
      messages: resolveMessages(raw),
      raw
    };
    if (raw == null) return base;

    if (hint && hint.view) return fill(base, hint.view);

    const declared = pickShallow(raw, ['view', 'ui', 'surface', 'screen', 'render', 'presentation']);
    const declaredS = typeof declared === 'string' ? VIEW_HINTS[nk(declared)] : undefined;
    const typeS = typeof pickShallow(raw, ['type', 'kind', 'result_type', 'resultType']) === 'string'
      ? VIEW_HINTS[nk(String(pickShallow(raw, ['type', 'kind', 'result_type', 'resultType'])))] : undefined;
    if (declaredS) return fill(base, declaredS);
    if (typeS) return fill(base, typeS);

    const orderish =
      (pickShallow(raw, ['order_id', 'orderId', 'order_number', 'orderNumber', 'confirmation_number']) !== undefined) ||
      (pickShallow(raw, ['order', 'order_confirmation']) !== undefined && /complet|confirm|success|placed/i.test(String(pick(raw, ['status', 'state', 'stage'], false) || '')));
    if (orderish) return fill(base, 'complete');

    const checkoutish =
      pickShallow(raw, ['checkout_url', 'checkoutUrl', 'continuation_url', 'continuationUrl', 'embed_url', 'embedUrl', 'iframe_url', 'checkout', 'checkout_state']) !== undefined ||
      nk(String(pickShallow(raw, ['stage', 'state']) || '')) === 'checkout';
    if (checkoutish) return fill(base, 'checkout');

    const hasCart = pickShallow(raw, ['cart', 'cart_state', 'line_items', 'lineItems', 'lines', 'totals', 'bag']) !== undefined;
    if (hasCart) {
      const confirmish = pickShallow(raw, ['added', 'added_item', 'confirmation', 'confirmed', 'success', 'line_added']) !== undefined ||
        /added|confirmed|success/i.test(String(pick(raw, ['status', 'message'], false) || ''));
      return fill(base, confirmish ? 'cartConfirm' : 'cart');
    }

    const single = pickShallow(raw, ['product', 'item', 'product_detail', 'detail']);
    if (single && typeof single === 'object' && !Array.isArray(single) &&
        (pickShallow(single, ['options', 'option_groups', 'variants', 'variations']) !== undefined || pickShallow(single, ['title', 'name', 'description']) !== undefined)) {
      return fill(base, 'detail');
    }

    const products = resolveProducts(raw);
    if (products.length > 0) {
      return fill(base, 'discovery');
    }

    if (base.messages.length) return fill(base, 'message');
    return base;
  }

  function fill(base, view) {
    const r = { ...base, view };
    switch (view) {
      case 'discovery':
        r.products = resolveProducts(base.raw);
        if (!r.products.length) r.view = base.messages.length ? 'message' : 'unknown';
        break;
      case 'detail': {
        const single = pickShallow(base.raw, ['product', 'item', 'product_detail', 'detail']);
        const list = resolveProducts(base.raw);
        r.product = normalizeProduct(single && typeof single === 'object' ? single : (list[0] ? list[0].raw : base.raw));
        break;
      }
      case 'cartConfirm':
      case 'cart':
        r.cart = resolveCart(base.raw);
        break;
      case 'checkout':
        r.checkout = resolveCheckout(base.raw);
        break;
      case 'complete':
        r.order = resolveOrder(base.raw);
        break;
      case 'message':
      case 'unknown':
        break;
    }
    return r;
  }

  function unwrapPayload(raw) {
    if (!raw) return raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          return unwrapPayload(JSON.parse(trimmed));
        } catch (_) {
          return raw;
        }
      }
      return raw;
    }
    if (typeof raw !== 'object') return raw;

    // JSON-RPC 2.0 result envelope
    if (raw.jsonrpc && raw.result !== undefined) {
      return unwrapPayload(raw.result);
    }

    // MCP content array: { content: [{ type: 'text', text: '...' }] }
    if (Array.isArray(raw.content)) {
      for (const item of raw.content) {
        if (item && item.type === 'text' && typeof item.text === 'string') {
          const t = item.text.trim();
          if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
            try {
              const parsed = JSON.parse(t);
              const unwrapped = unwrapPayload(parsed);
              if (unwrapped && typeof unwrapped === 'object') {
                return unwrapped;
              }
            } catch (_) {}
          }
        }
      }
    }

    // Nested tool result / output wrappers
    if (raw.result && typeof raw.result === 'object' && !Array.isArray(raw.result)) {
      const inner = unwrapPayload(raw.result);
      return { ...raw, ...inner };
    }
    if (raw.output && typeof raw.output === 'object' && !Array.isArray(raw.output)) {
      const inner = unwrapPayload(raw.output);
      return { ...raw, ...inner };
    }

    return raw;
  }

  function getBaseWorkerUrl() {
    const configured = window.shopChatConfig?.apiUrl || 'https://chat.facetimefy.com';
    return configured.replace(/\/chat\/?$/, '').replace(/\/+$/, '');
  }

  /* ==========================================================================
     2. STOREFRONT LIVECOMMERCE APPLICATION OBJECT
     ========================================================================== */

  const ShopAIChat = {
    state: {
      stage: 'idle',
      conversationId: null,
      products: [],
      page: 0,
      pages: 1,
      minimized: false,
      cart: null,
      activeProduct: null,
      selectedOptions: {},
      showAll: {},
      toast: null,
      pendingAdd: false,
      lastRaw: null,
      expandedCollections: false,
      isListening: false,
      speechRecognizer: null,
      viewedProducts: [],
      currentProduct: null,
      preferences: {},
      checkoutUrl: null
    },

    elements: {},

    init: async function() {
      const container = document.getElementById('shop-ai-chat-root');
      if (!container) return;

      this.cacheElements(container);
      this.setupEventListeners();
      this.initVoiceRecognition();

      try {
        const storedPrefs = sessionStorage.getItem('shopAiPreferences');
        if (storedPrefs) this.state.preferences = JSON.parse(storedPrefs);
      } catch (_) {}

      await this.syncNativeCart();
      this.trackAnalytics('AgentBubbleShown');

      const storedConvId = sessionStorage.getItem('shopAiConversationId');
      if (storedConvId) {
        this.state.conversationId = storedConvId;
        await this.fetchChatHistory(storedConvId);
      } else {
        this.renderWelcomeScreen();
      }

      this.exposeGlobalBridge();
    },

    cacheElements: function(container) {
      this.elements = {
        container,
        launcher: document.getElementById('shop-ai-launcher'),
        window: document.getElementById('shop-ai-window'),
        closeBtn: document.getElementById('shop-ai-chat-close'),
        dockToggleBtn: document.getElementById('shop-ai-dock-toggle'),
        menuBtn: document.getElementById('shop-ai-menu-btn'),
        dropdownMenu: document.getElementById('shop-ai-dropdown-menu'),
        menuClearBtn: document.getElementById('shop-ai-menu-clear'),
        headerCartBtn: document.getElementById('shop-ai-header-cart'),
        headerCartBadge: document.getElementById('shop-ai-cart-badge'),
        messagesContainer: document.getElementById('shop-ai-messages'),
        inputField: document.getElementById('shop-ai-input-field'),
        sendBtn: document.getElementById('shop-ai-send-btn'),
        floatingBag: document.getElementById('shop-ai-floating-bag'),
        floatingBagBadge: document.getElementById('shop-ai-floating-bag-badge'),
        toast: document.getElementById('shop-ai-toast'),
        // Detail Sheet
        detailSheet: document.getElementById('shop-ai-detail-sheet'),
        detailSheetClose: document.getElementById('shop-ai-sheet-close'),
        detailSheetToggleMode: document.getElementById('shop-ai-sheet-toggle-mode'),
        detailSheetBody: document.getElementById('shop-ai-sheet-body'),
        detailSheetPrice: document.getElementById('shop-ai-sheet-price'),
        detailSheetAddBtn: document.getElementById('shop-ai-sheet-add-btn'),
        detailSheetSeller: document.getElementById('shop-ai-sheet-seller'),
        // Shopping Bag Sheet
        cartSheet: document.getElementById('shop-ai-cart-sheet'),
        cartSheetClose: document.getElementById('shop-ai-cart-close'),
        cartSheetBody: document.getElementById('shop-ai-cart-body'),
        cartSheetSubtotal: document.getElementById('shop-ai-cart-subtotal'),
        cartSheetCheckoutBtn: document.getElementById('shop-ai-cart-checkout-btn')
      };
    },

    setupEventListeners: function() {
      const {
        launcher, closeBtn, dockToggleBtn, menuBtn, dropdownMenu, menuClearBtn,
        headerCartBtn, inputField, sendBtn, floatingBag,
        detailSheetClose, detailSheetAddBtn, cartSheetClose
      } = this.elements;

      launcher.addEventListener('click', () => this.toggleWindow(true));
      closeBtn.addEventListener('click', () => this.toggleWindow(false));

      if (dockToggleBtn) {
        dockToggleBtn.addEventListener('click', () => {
          this.elements.window.classList.toggle('docked-expanded');
        });
      }

      if (menuBtn && dropdownMenu) {
        menuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isShown = dropdownMenu.style.display === 'block';
          dropdownMenu.style.display = isShown ? 'none' : 'block';
        });
        document.addEventListener('click', () => {
          dropdownMenu.style.display = 'none';
        });
      }

      if (menuClearBtn) {
        menuClearBtn.addEventListener('click', () => {
          sessionStorage.removeItem('shopAiConversationId');
          sessionStorage.removeItem('shopAiPreferences');
          this.state.conversationId = null;
          this.state.preferences = {};
          this.elements.messagesContainer.innerHTML = '';
          this.renderWelcomeScreen();
        });
      }

      const submitMessage = () => {
        const text = inputField.value.trim();
        if (text) {
          this.sendUserMessage(text);
          inputField.value = '';
        }
      };

      sendBtn.addEventListener('click', submitMessage);
      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitMessage();
        }
      });

      if (headerCartBtn) {
        headerCartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.openCartSheet();
        });
      }
      if (floatingBag) {
        floatingBag.addEventListener('click', (e) => {
          e.preventDefault();
          this.openCartSheet();
        });
      }
      if (detailSheetClose) {
        detailSheetClose.addEventListener('click', () => this.closeDetailSheet());
      }
      if (cartSheetClose) {
        cartSheetClose.addEventListener('click', () => this.closeCartSheet());
      }

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeDetailSheet();
          this.closeCartSheet();
        }
      });

      window.addEventListener('cart:updated', () => this.syncNativeCart());
    },

    toggleWindow: function(open) {
      if (open) {
        this.trackAnalytics('AgentActive');
        this.elements.window.classList.add('active');
        this.elements.launcher.style.display = 'none';
        setTimeout(() => this.elements.inputField?.focus(), 250);
        this.scrollToBottom();
      } else {
        this.elements.window.classList.remove('active');
        this.elements.launcher.style.display = 'inline-flex';
        this.closeDetailSheet();
        this.closeCartSheet();
      }
    },

    scrollToBottom: function() {
      const container = this.elements.messagesContainer;
      if (container) {
        setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
      }
    },

    /* ==========================================================================
       3. NATIVE SHOPIFY CART SYNC & OPERATIONS (Zero Fakes / Zero Mocks)
       ========================================================================== */

    syncNativeCart: async function() {
      try {
        const res = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
        if (!res.ok) return;
        const cartData = await res.json();
        this.state.cart = resolveCart(cartData);
        this.updateCartBadges(cartData.item_count || 0);
      } catch (_) {}
    },

    updateCartBadges: function(count) {
      const { headerCartBadge, floatingBag, floatingBagBadge } = this.elements;
      if (count > 0) {
        if (headerCartBadge) {
          headerCartBadge.textContent = count;
          headerCartBadge.style.display = 'flex';
        }
        if (floatingBag && floatingBagBadge) {
          floatingBagBadge.textContent = count;
          floatingBag.style.display = 'flex';
        }
      } else {
        if (headerCartBadge) headerCartBadge.style.display = 'none';
        if (floatingBag) floatingBag.style.display = 'none';
      }
    },

    addVariantToCart: async function(variantId, productTitle, price) {
      if (!variantId) return false;
      let cleanId = String(variantId).includes('/') ? String(variantId).split('/').pop() : String(variantId);
      const convId = this.state.conversationId || '';

      if (!/^\d+$/.test(cleanId)) {
        try {
          const res = await fetch(`/products/${cleanId}.js`, { headers: { 'Accept': 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            if (data.variants && data.variants.length > 0) {
              cleanId = String(data.variants[0].id);
            }
          }
        } catch (_) {}
      }

      if (!/^\d+$/.test(cleanId)) return false;

      try {
        const res = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            items: [{
              id: cleanId,
              quantity: 1,
              properties: {
                '_source': 'facetimefy',
                '_assisted_by': 'Facetimefy Concierge',
                '_conversation_id': convId
              }
            }]
          })
        });

        if (res.ok) {
          try {
            await fetch('/cart/update.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({
                attributes: {
                  '_source': 'facetimefy',
                  '_conversation_id': convId,
                  'utm_source': 'facetimefy',
                  'utm_medium': 'concierge'
                }
              })
            });
          } catch (_) {}

          await this.syncNativeCart();
          window.dispatchEvent(new CustomEvent('cart:updated'));
          this.trackAnalytics('AgentAddToCartClick', {
            product_title: productTitle || '',
            price: parseFloat(String(price || 0).replace(/[^0-9.]/g, '')) || 0,
            quantity: 1
          });
          return true;
        }
        return false;
      } catch (err) {
        return false;
      }
    },

    changeCartQuantity: async function(lineKey, quantity) {
      try {
        const res = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ id: lineKey, quantity })
        });
        if (res.ok) {
          const updated = await res.json();
          this.state.cart = resolveCart(updated);
          this.updateCartBadges(updated.item_count || 0);
          window.LiveCommerceUI?.renderCartSheetBody(this.state.cart, this.elements, (id, qty) => this.changeCartQuantity(id, qty));
          window.dispatchEvent(new CustomEvent('cart:updated'));
        }
      } catch (_) {}
    },

    redirectToCheckout: function() {
      this.trackAnalytics('AgentCheckout');
      if (this.state.checkoutUrl) {
        window.location.href = this.state.checkoutUrl;
        return;
      }
      try {
        const checkoutUrl = new URL('/checkout', window.location.origin);
        checkoutUrl.searchParams.set('utm_source', 'facetimefy');
        checkoutUrl.searchParams.set('utm_medium', 'concierge');
        checkoutUrl.searchParams.set('utm_campaign', 'chat_assistant');
        window.location.href = checkoutUrl.toString();
      } catch (_) {
        window.location.href = '/checkout';
      }
    },

    /* ==========================================================================
       4. COLLECTION DISCOVERY & WELCOME SCREEN (Delegated to LiveCommerceUI)
       ========================================================================== */

    discoverCollectionsFromPage: async function() {
      const collections = (window.shopInitialData?.collections || []).filter(c => c && c.handle !== 'frontpage');
      if (collections.length > 0) {
        return collections;
      }
      try {
        const res = await fetch('/collections.json', { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          return (data.collections || []).filter(c => c && c.handle !== 'frontpage').map(c => ({
            id: c.id,
            title: c.title,
            handle: c.handle,
            url: `/collections/${c.handle}`,
            products_count: c.products_count,
            image: c.image ? (c.image.src || c.image) : null
          }));
        }
      } catch (_) {}
      return [];
    },

    handleCollectionClick: function(col) {
      if (!col) return;
      this.sendUserMessage(`Tell me more about ${col.title}`);
    },

    renderWelcomeScreen: async function() {
      const container = this.elements.messagesContainer;
      if (!container) return;

      const storeName = window.shopInitialData?.shopName || 'Store';
      const headerTitle = this.elements.container?.querySelector('.shop-ai-header-title');
      if (headerTitle && !headerTitle.dataset.customized) {
        headerTitle.textContent = `${storeName} AI`;
      }
      if (this.elements.inputField) {
        this.elements.inputField.placeholder = `Message ${storeName} AI...`;
      }

      const collections = await this.discoverCollectionsFromPage();
      this.trackAnalytics('AgentNudgeShown', { collections_count: collections.length });

      window.LiveCommerceUI?.renderWelcomeScreen(container, {
        storeName,
        collections,
        onCollectionClick: async (col) => {
          this.trackAnalytics('AgentResponseClick', { prompt: `Give me more details about ${col.title}` });
          await this.handleCollectionClick(col);
        }
      });
    },

    /* ==========================================================================
       5. CHAT MESSAGING & API DISPATCH
       ========================================================================== */

    sendUserMessage: async function(text) {
      this.trackAnalytics('LiveMessageSent', { message: text });

      this.appendUserMessage(text);
      this.scrollToBottom();

      this.showTypingIndicator();

      const apiUrl = `${getBaseWorkerUrl()}/chat`;
      const storeDomain = window.shopPermanentDomain || window.shopDomain || window.location.hostname;

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Shopify-Shop-Domain': storeDomain
          },
          body: JSON.stringify({
            message: text,
            conversation_id: this.state.conversationId,
            store_domain: storeDomain
          })
        });

        this.removeTypingIndicator();

        if (!response.ok) {
          this.ingest({ message: "Connection error. Our team has been notified, please try again in a few minutes." });
          return;
        }

        const data = await response.json().catch(() => ({ error: true }));
        if (data.error) {
          this.ingest({ message: "Connection error. Our team has been notified, please try again in a few minutes." });
          return;
        }

        if (data.conversation_id) {
          this.state.conversationId = data.conversation_id;
          sessionStorage.setItem('shopAiConversationId', data.conversation_id);
        }

        this.ingest(data, { userQuery: text });

      } catch (_) {
        this.removeTypingIndicator();
        this.ingest({ message: "Connection error. Our team has been notified, please try again in a few minutes." });
      }
    },

    appendUserMessage: function(text) {
      window.LiveCommerceUI?.appendUserMessage(this.elements.messagesContainer, text);
    },

    showTypingIndicator: function() {
      window.LiveCommerceUI?.showTypingIndicator(this.elements.messagesContainer);
      this.scrollToBottom();
    },

    removeTypingIndicator: function() {
      window.LiveCommerceUI?.removeTypingIndicator();
    },

    /* ==========================================================================
       6. LIVECOMMERCE INGESTION & ORCHESTRATION
       ========================================================================== */

    ingest: function(raw, hint) {
      const unwrapped = unwrapPayload(raw);
      this.state.lastRaw = unwrapped;

      const checkoutUrl = asString(pick(unwrapped, ['checkout_url', 'checkoutUrl', 'continuation_url', 'continuationUrl', 'continue_url', 'embed_url', 'embedUrl', 'url'], false));
      if (checkoutUrl && /checkout|cart/i.test(checkoutUrl)) {
        this.state.checkoutUrl = checkoutUrl;
      }

      const routed = routeResult(unwrapped, hint);

      if (routed.view === 'checkout' && this.state.checkoutUrl) {
        this.redirectToCheckout();
        return routed;
      }

      let rawMsg = (unwrapped && typeof unwrapped === 'object' ? unwrapped.message : typeof unwrapped === 'string' ? unwrapped : '') || '';
      const extracted = window.LiveCommerceUI?.extractProductsFromMarkdown(rawMsg, normalizeProduct) || { cleanedText: rawMsg, products: [] };
      const displayMessage = extracted.cleanedText;

      if (extracted.products.length > 0) {
        if (!routed.products || routed.products.length === 0) {
          routed.products = extracted.products;
          if (routed.view === 'unknown' || routed.view === 'message') {
            routed.view = 'discovery';
          }
        } else {
          const existingIds = new Set(routed.products.map(p => p.id || p.title));
          for (const ep of extracted.products) {
            if (!existingIds.has(ep.id || ep.title)) {
              routed.products.push(ep);
            }
          }
        }
      }

      let categoryTitle = '';
      if (hint && hint.userQuery) {
        const m = hint.userQuery.match(/(?:tell me more about|give me more details about|show me|details about|shop)\s+(.+)/i);
        if (m) categoryTitle = m[1].trim();
      }
      if (!categoryTitle && unwrapped && typeof unwrapped === 'object') {
        categoryTitle = unwrapped.collection_title || unwrapped.collection || unwrapped.category || '';
      }

      const container = this.elements.messagesContainer;
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'shop-ai-message assistant';

      // 1. Vertical Product Stack (Exact 4 products edge-to-edge + "Show more" card)
      if (routed.products && routed.products.length > 0) {
        window.LiveCommerceUI?.renderVerticalProductStack(routed.products, assistantMsg, {
          categoryTitle,
          onAdd: (product, btn) => this.handleProductAdd(product, btn, assistantMsg),
          onClick: (product) => this.handleProductClick(product, assistantMsg),
          onScrollNeeded: () => this.scrollToBottom()
        });
      }

      // 2. Assistant summary / explanation text
      if (displayMessage) {
        const textWrap = document.createElement('div');
        textWrap.className = 'shop-ai-message-text';
        textWrap.innerHTML = window.LiveCommerceUI?.formatMarkdown(displayMessage) || displayMessage;
        assistantMsg.appendChild(textWrap);
      }

      // 3. Quick action suggestion chips
      const chips = this.extractSuggestionChips(unwrapped);
      if (chips.length > 0) {
        window.LiveCommerceUI?.renderSuggestionChips(chips, assistantMsg, (chipText) => {
          this.trackAnalytics('AgentResponseClick', { prompt: chipText });
          if (/checkout/i.test(chipText)) {
            this.handleCheckoutFlow();
          } else if (/^Shop\s+(.+)/i.test(chipText)) {
            const matchedTitle = chipText.replace(/^Shop\s+/i, '').trim();
            const col = (window.shopInitialData?.collections || []).find(c => c && c.title.toLowerCase() === matchedTitle.toLowerCase());
            if (col) {
              this.handleCollectionClick(col);
            } else {
              this.sendUserMessage(chipText);
            }
          } else {
            this.sendUserMessage(chipText);
          }
        });
      }

      // 4. Message Action Icons (Copy, Thumbs Up, Thumbs Down)
      window.LiveCommerceUI?.renderMessageActions(assistantMsg, unwrapped.message, (feedback) => {
        this.trackAnalytics('AgentFeedback', { value: feedback });
      });

      container.appendChild(assistantMsg);
      this.scrollToBottom();
      return routed;
    },

    extractSuggestionChips: function(raw) {
      const chips = [];
      const msg = (raw && raw.message) || '';

      if (this.state.cart && this.state.cart.lines && this.state.cart.lines.length > 0) {
        chips.push('Checkout');
      } else if (/checkout/i.test(msg)) {
        chips.push('Checkout');
      }

      const rawChips = pick(raw, ['suggestions', 'chips', 'quick_actions', 'actions', 'follow_ups'], false);
      if (Array.isArray(rawChips) && rawChips.length > 0) {
        rawChips.forEach(c => {
          const s = asString(c) || (isObj(c) ? asString(pickShallow(c, ['label', 'text', 'title'])) : null);
          if (s && !chips.includes(s)) chips.push(s);
        });
      }

      const collections = (window.shopInitialData?.collections || []).filter(c => c && c.handle !== 'frontpage');
      if (collections.length > 0) {
        for (const c of collections) {
          const chipLabel = `Shop ${c.title}`;
          if (!chips.includes(chipLabel) && chips.length < 4) {
            chips.push(chipLabel);
          }
        }
      }

      if (chips.length < 3) {
        chips.push('Explore tattoo designs');
        chips.push('Browse aftercare products');
      }

      return [...new Set(chips)].slice(0, 4);
    },

    handleCheckoutFlow: function() {
      this.trackAnalytics('AgentCheckout');
      if (this.state.checkoutUrl) {
        window.location.href = this.state.checkoutUrl;
        return;
      }
      this.sendUserMessage('Checkout');
    },

    /* ==========================================================================
       7. PRODUCT ACTION HANDLERS
       ========================================================================== */

    handleProductClick: async function(product, assistantMsg) {
      this.trackAnalytics('AgentProductClick', {
        product_id: product.id || '',
        product_title: product.title || '',
        price: product.price || 0
      });

      await this.resolveShopifyProductDetails(product);

      if (product.variants && (product.variants.length > 1 || (product.options && product.options.length > 0))) {
        window.LiveCommerceUI?.renderInStreamVariantPicker(product, assistantMsg, async (p, v, btn, picker) => {
          btn.disabled = true;
          const span = btn.querySelector('span');
          if (span) span.textContent = 'Adding…';

          const variantId = v?.id || p.id;
          const success = await this.addVariantToCart(variantId, p.title, v?.priceLabel || p.priceLabel);

          if (success) {
            picker.remove();
            window.LiveCommerceUI?.renderInStreamCartConfirm(p, v, assistantMsg, () => this.redirectToCheckout(), () => {});
            this.scrollToBottom();
          } else {
            btn.disabled = false;
            if (span) span.textContent = 'Confirm & Add to bag';
          }
        });
        this.scrollToBottom();
      } else {
        this.openDetailSheet(product);
      }
    },

    handleProductAdd: async function(product, addBtn, assistantMsg) {
      addBtn.disabled = true;
      const span = addBtn.querySelector('span');
      if (span) span.textContent = 'Adding…';

      await this.resolveShopifyProductDetails(product);

      if (product.variants && (product.variants.length > 1 || (product.options && product.options.length > 0))) {
        addBtn.disabled = false;
        if (span) span.textContent = 'Add to cart';
        this.handleProductClick(product, assistantMsg);
        return;
      }

      const variantId = product.variants?.[0]?.id || product.id;
      const success = await this.addVariantToCart(variantId, product.title, product.priceLabel);
      if (success) {
        if (span) span.textContent = '✓ Added';
        setTimeout(() => {
          addBtn.disabled = false;
          if (span) span.textContent = 'Add to cart';
        }, 2000);
        window.LiveCommerceUI?.renderInStreamCartConfirm(product, product.variants?.[0] || null, assistantMsg, () => this.redirectToCheckout(), () => {});
        this.scrollToBottom();
      } else {
        addBtn.disabled = false;
        if (span) span.textContent = 'Add to cart';
      }
    },

    resolveShopifyProductDetails: async function(product) {
      if (!product) return product;
      if (product.variants && product.variants.length > 0 && /^\d+$/.test(String(product.variants[0].id).replace(/\D/g, ''))) {
        return product;
      }
      let handle = product.handle;
      if (!handle && product.url) {
        const m = product.url.match(/\/products\/([a-zA-Z0-9_-]+)/);
        if (m) handle = m[1];
      }
      if (!handle && typeof product.id === 'string' && !/^\d+$/.test(product.id)) {
        handle = product.id.replace(/^gid:\/\/shopify\/Product\//, '');
      }
      if (handle) {
        try {
          const res = await fetch(`/products/${handle}.js`, { headers: { 'Accept': 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            if (data.variants && data.variants.length > 0) {
              product.variants = data.variants.map(v => ({
                id: String(v.id),
                label: v.title !== 'Default Title' ? v.title : product.title,
                priceLabel: money(v.price / 100, { currency: window.shopInitialData?.currency || 'USD' }),
                options: v.options,
                available: v.available,
                raw: v
              }));
              if (data.images && data.images.length > 0 && (!product.media || product.media.length === 0)) {
                product.media = data.images;
              }
              if (data.options && data.options.length > 0 && data.options[0].name !== 'Title') {
                product.options = data.options.map(opt => ({
                  id: opt.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
                  label: opt.name,
                  values: (opt.values || []).map(v => ({ label: v }))
                }));
              }
            }
          }
        } catch (_) {}
      }
      return product;
    },

    /* ==========================================================================
       8. DETAIL & CART SHEETS (Delegated to LiveCommerceUI)
       ========================================================================== */

    openDetailSheet: function(product) {
      this.trackAnalytics('AgentProductClick', {
        product_id: product.id || '',
        product_title: product.title || '',
        price: product.price || 0
      });
      this.state.activeProduct = product;
      window.LiveCommerceUI?.openDetailSheet(product, this.elements, async (p, v, addBtn) => {
        addBtn.disabled = true;
        const span = addBtn.querySelector('span');
        if (span) span.textContent = 'Adding…';

        const variantId = v?.id || p.id;
        const success = await this.addVariantToCart(variantId, p.title, v?.priceLabel || p.priceLabel);
        if (success) {
          if (span) span.textContent = '✓ Added to bag';
          setTimeout(() => {
            this.closeDetailSheet();
            addBtn.disabled = false;
            if (span) span.textContent = 'Add to bag';
          }, 800);
        } else {
          addBtn.disabled = false;
          if (span) span.textContent = 'Add to bag';
        }
      });
    },

    closeDetailSheet: function() {
      window.LiveCommerceUI?.closeDetailSheet(this.elements);
    },

    openCartSheet: async function() {
      await this.syncNativeCart();
      window.LiveCommerceUI?.openCartSheet(this.state.cart, this.elements, {
        onQtyChange: (id, qty) => this.changeCartQuantity(id, qty),
        onCheckout: () => this.redirectToCheckout()
      });
    },

    closeCartSheet: function() {
      window.LiveCommerceUI?.closeCartSheet(this.elements);
    },

    /* ==========================================================================
       9. LIVE VOICE DICTATION (Web Speech API)
       ========================================================================== */

    initVoiceRecognition: function() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        if (this.elements.voiceStatus) this.elements.voiceStatus.textContent = 'Voice Unavailable';
        return;
      }

      try {
        const recognizer = new SpeechRecognition();
        recognizer.continuous = false;
        recognizer.interimResults = true;
        recognizer.lang = navigator.language || 'en-US';

        recognizer.onstart = () => {
          this.state.isListening = true;
          this.elements.dockMicBtn?.classList.add('listening');
          if (this.elements.voiceStatus) this.elements.voiceStatus.textContent = 'Listening…';
        };

        recognizer.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(r => r[0].transcript)
            .join('');
          if (this.elements.inputField) {
            this.elements.inputField.value = transcript;
          }
        };

        recognizer.onerror = () => {
          this.stopVoiceDictation();
        };

        recognizer.onend = () => {
          this.stopVoiceDictation();
          const val = this.elements.inputField?.value.trim();
          if (val) {
            this.toggleWindow(true);
            this.sendUserMessage(val);
            if (this.elements.inputField) this.elements.inputField.value = '';
          }
        };

        this.state.speechRecognizer = recognizer;
      } catch (_) {}
    },

    toggleVoiceDictation: function() {
      if (!this.state.speechRecognizer) return;
      if (this.state.isListening) {
        this.state.speechRecognizer.stop();
      } else {
        try {
          this.state.speechRecognizer.start();
        } catch (_) {}
      }
    },

    stopVoiceDictation: function() {
      this.state.isListening = false;
      this.elements.dockMicBtn?.classList.remove('listening');
      if (this.elements.voiceStatus) this.elements.voiceStatus.textContent = 'Voice Ready';
    },

    /* ==========================================================================
       10. TELEMETRY & CHAT HISTORY
       ========================================================================== */

    trackAnalytics: function(eventType, metadata = {}) {
      try {
        if (typeof window.dispatchSmartEvent === 'function') {
          window.dispatchSmartEvent(eventType, {
            conversation_id: this.state.conversationId || '',
            ...metadata
          });
          return;
        }
        const storeDomain = window.shopPermanentDomain || window.shopDomain || window.location.hostname;
        const apiUrl = `${getBaseWorkerUrl()}/analytics/event`;

        if (typeof fetch === 'function') {
          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              event_type: eventType,
              store_domain: storeDomain,
              conversation_id: this.state.conversationId || '',
              page_url: window.location.pathname || '/',
              ...metadata
            }),
            keepalive: true
          }).catch(() => {});
        }
      } catch (_) {}
    },

    fetchChatHistory: async function(conversationId) {
      const apiUrl = `${getBaseWorkerUrl()}/chat?conversation_id=` + encodeURIComponent(conversationId);
      try {
        const res = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
          this.renderWelcomeScreen();
          return;
        }
        const data = await res.json();
        if (!data.messages || data.messages.length === 0) {
          this.renderWelcomeScreen();
          return;
        }

        this.elements.messagesContainer.innerHTML = '';
        data.messages.forEach(m => {
          if (m.role === 'user') {
            this.appendUserMessage(m.content);
          } else if (m.role === 'assistant') {
            this.ingest({ message: m.content });
          }
        });
        this.scrollToBottom();
      } catch (_) {
        this.renderWelcomeScreen();
      }
    },

    exposeGlobalBridge: function() {
      const self = this;
      window.LiveCommerce = {
        ingest: (raw, hint) => self.ingest(raw, hint),
        act: (intent) => {
          if (!intent) return;
          if (intent.type === 'open_cart') self.openCartSheet();
          if (intent.type === 'checkout') self.redirectToCheckout();
          if (intent.type === 'close') self.toggleWindow(false);
          if (intent.type === 'refresh_cart') self.syncNativeCart();
        },
        snapshot: () => ({
          stage: self.state.stage,
          conversationId: self.state.conversationId,
          cart: self.state.cart,
          activeProduct: self.state.activeProduct,
          lastRaw: self.state.lastRaw
        }),
        reset: () => {
          self.state.conversationId = null;
          sessionStorage.removeItem('shopAiConversationId');
          self.renderWelcomeScreen();
        }
      };
      window.LiveCommerceState = window.LiveCommerce.snapshot();
    }
  };

  // DOM ready mount
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ShopAIChat.init());
  } else {
    ShopAIChat.init();
  }
})();
