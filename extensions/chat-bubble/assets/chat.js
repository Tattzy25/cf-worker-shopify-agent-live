/**
 * Shop AI Chat — Client-Side Storefront LiveCommerce Engine
 *
 * Merges COMMERCE-ADD (resolve.ts, route.ts, types.ts, LiveCommerce.tsx)
 * with the Shopify Storefront App Extension.
 *
 * Strict Zero-Fallback Protocol:
 *  - 100% real store data & live Master MCP tool output.
 *  - Zero mock, zero simulation, zero fake data.
 *  - Native Shopify cart (/cart.js, /cart/add.js, /cart/change.js).
 *  - Silent error trapping on storefront without polluting customer DOM.
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
    const v = pick(o, ['seller', 'seller_name', 'sellerName', 'merchant', 'merchant_name', 'merchantName', 'store', 'store_name', 'brand', 'vendor']);
    if (isObj(v)) {
      return asString(pickShallow(v, ['name', 'display_name', 'title', 'store_name'])) || asString(pickShallow(v, ['domain', 'url']));
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
    if (typeof v === 'number') return Number.isInteger(v) && v > 500 ? 'minor' : 'major';
    if (typeof v === 'string') return /^\s*-?\d+\s*$/.test(v) && parseInt(v, 10) > 500 ? 'minor' : 'major';
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
    const v = pick(o, ['compare_at', 'compareAt', 'compare_at_price', 'original_price', 'list_price', 'was_price', 'msrp']);
    return v === undefined ? null : priceFrom(v, o);
  }

  function resolveRating(o) {
    let v = pick(o, ['rating', 'ratings', 'average_rating', 'averageRating', 'stars', 'score']);
    if (isObj(v)) v = pickShallow(v, ['average', 'avg', 'value', 'rating', 'score']);
    let n = asNumber(v);
    if (n == null) return null;
    if (n > 5) n = n > 50 ? n / 20 : n / 10;
    return Math.round(Math.min(5, Math.max(0, n)) * 10) / 10;
  }

  function resolveReviews(o) {
    let v = pick(o, ['reviews', 'review_count', 'reviewCount', 'rating_count', 'ratings_count', 'total_reviews']);
    if (isObj(v)) v = pickShallow(v, ['count', 'total', 'number', 'quantity']);
    return asNumber(v);
  }

  function resolveBadge(o) {
    const v = pick(o, ['badge', 'badges', 'tag', 'tags', 'promotion']);
    const list = asStrings(v);
    return list[0] || null;
  }

  function resolveAvailability(o) {
    const v = pick(o, ['availability', 'available', 'in_stock', 'inStock', 'stock_status', 'inventory_status']);
    if (typeof v === 'boolean') return v ? 'In stock' : 'Out of stock';
    if (typeof v === 'number') return v > 0 ? `In stock (${v})` : 'Out of stock';
    return asString(v);
  }

  function resolveDescription(o) {
    const v = pick(o, ['description', 'desc', 'summary', 'product_description', 'short_description', 'details', 'body_html']);
    const list = asStrings(v);
    if (list.length) {
      // Clean HTML tags if any
      const cleaned = list.join(' ').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      return cleaned || null;
    }
    return null;
  }

  function resolveOptions(o) {
    const v = pick(o, ['options', 'option_groups', 'optionGroups', 'variant_options', 'attributes']);
    const arr = Array.isArray(v) ? v : v && isObj(v) ? Object.entries(v).map(([k, val]) => ({ name: k, values: val })) : [];
    return arr.map((g, gi) => {
      const label = asString(pickShallow(g, ['name', 'label', 'option_name', 'title'])) || `Option ${gi + 1}`;
      let vals = pickShallow(g, ['values', 'options', 'items', 'choices', 'option_values']);
      if (!Array.isArray(vals) && isObj(vals)) vals = Object.values(vals);
      if (!Array.isArray(vals) && vals != null) vals = [vals];
      const valArr = Array.isArray(vals) ? vals : [];
      const values = valArr.map(x => {
        const lbl = asString(isObj(x) ? pickShallow(x, ['label', 'value', 'name', 'title']) : x) || '?';
        return {
          label: lbl,
          priceLabel: isObj(x) ? resolvePriceLabel(x) : null,
          media: isObj(x) ? resolveMedia(x)[0] || null : null,
          raw: x
        };
      }).filter(v2 => v2.label !== '?');
      return { id: asString(pickShallow(g, ['id', 'code', 'key'])) || `opt${gi}`, label, values, raw: g };
    }).filter(g => g.values.length > 0);
  }

  function resolveVariants(o) {
    const v = pick(o, ['variants', 'variant_list', 'variations', 'skus']);
    if (!Array.isArray(v)) return [];
    return v.map((x, i) => {
      let opts = {};
      const ov = pickShallow(x, ['options', 'option_values', 'optionValues', 'attributes']);
      if (Array.isArray(ov)) {
        for (const e of ov) {
          if (isObj(e)) {
            const k = asString(pickShallow(e, ['name', 'label', 'option_name']));
            const val = asString(pickShallow(e, ['value', 'label2', 'val'])) || asString(pickShallow(e, ['value']));
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
        label: asString(pickShallow(x, ['title', 'label', 'name'])) || Object.values(opts).join(' / ') || `Variant ${i + 1}`,
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
    let arr = pick(raw, ['products', 'results', 'items', 'product_list', 'productList', 'records', 'listings', 'search_results'], false);
    if (!Array.isArray(arr) && isObj(arr)) {
      arr = pick(arr, ['products', 'results', 'items', 'listings'], false);
    }
    if (!Array.isArray(arr)) {
      const cat = pick(raw, ['catalog', 'data', 'response', 'payload'], false);
      if (isObj(cat)) {
        arr = pick(cat, ['products', 'results', 'items', 'listings'], false);
      }
    }
    if (!Array.isArray(arr)) {
      arr = pickDeep(raw, ['products', 'results', 'items', 'listings'], 4);
    }
    if (Array.isArray(arr)) return arr.map((x, i) => normalizeProduct(x, i));
    const single = pickShallow(raw, ['product', 'item', 'detail', 'product_detail']);
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
    const c = isObj(pickShallow(raw, ['checkout', 'checkout_state'])) ? pickShallow(raw, ['checkout', 'checkout_state']) : raw;
    const url = asString(pick(c, ['checkout_url', 'checkoutUrl', 'continue_url', 'url', 'link'], false)) || '/checkout';
    return {
      raw,
      url,
      messages: asStrings(pick(c, ['messages', 'message', 'instructions'], false))
    };
  }

  const VIEW_HINTS = {
    discovery: 'discovery', search: 'discovery', results: 'discovery', catalog: 'discovery',
    collection: 'discovery', shelf: 'discovery',
    product: 'detail', detail: 'detail', pdp: 'detail',
    cartconfirm: 'cartConfirm', addtocart: 'cartConfirm',
    cart: 'cart', bag: 'cart',
    checkout: 'checkout',
    message: 'message'
  };

  function routeResult(raw, hint) {
    const base = {
      view: 'unknown',
      products: [],
      product: null,
      cart: null,
      checkout: null,
      messages: asStrings(pick(raw, ['messages', 'message', 'notice'], false)),
      raw
    };
    if (raw == null) return base;

    if (hint && hint.view) return fill(base, hint.view);

    const declared = pickShallow(raw, ['view', 'ui', 'surface', 'render']);
    const declaredS = typeof declared === 'string' ? VIEW_HINTS[nk(declared)] : undefined;
    if (declaredS) return fill(base, declaredS);

    const products = resolveProducts(raw);
    if (products.length > 0) {
      if (products.length === 1 && pickShallow(raw, ['product', 'item', 'detail'])) {
        return fill(base, 'detail');
      }
      return fill(base, 'discovery');
    }

    const hasCart = pickShallow(raw, ['cart', 'line_items', 'lineItems', 'lines']);
    if (hasCart) {
      const confirmish = /added|success|confirmed/i.test(String(pick(raw, ['status', 'message'], false) || ''));
      return fill(base, confirmish ? 'cartConfirm' : 'cart');
    }

    if (pick(raw, ['checkout_url', 'checkoutUrl', 'continue_url'], false)) {
      return fill(base, 'checkout');
    }

    if (base.messages.length) return fill(base, 'message');
    return base;
  }

  function fill(base, view) {
    const r = { ...base, view };
    switch (view) {
      case 'discovery':
        r.products = resolveProducts(base.raw);
        break;
      case 'detail': {
        const single = pickShallow(base.raw, ['product', 'item', 'detail']);
        const list = resolveProducts(base.raw);
        r.product = normalizeProduct(single || (list[0] ? list[0].raw : base.raw));
        break;
      }
      case 'cartConfirm':
      case 'cart':
        r.cart = resolveCart(base.raw);
        break;
      case 'checkout':
        r.checkout = resolveCheckout(base.raw);
        break;
    }
    return r;
  }

  function getBaseWorkerUrl() {
    const configured = window.shopChatConfig?.apiUrl || 'https://chat.facetimefy.com';
    return configured.replace(/\/chat\/?$/, '').replace(/\/+$/, '');
  }

  function extractProductsFromMarkdown(text) {
    if (!text || typeof text !== 'string') return { cleanedText: text || '', products: [] };
    const products = [];

    // 1. Normalize glued table boundaries (e.g., text.| Product or ||---|)
    let normalized = text
      .replace(/([.!?])\s*\|/g, '$1\n\n|')
      .replace(/\|\|+/g, '|\n|')
      .replace(/\r\n/g, '\n');

    const lines = normalized.split('\n');
    const nonTableLines = [];
    const tableBlocks = [];
    let currentTable = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const hasPipes = trimmed.includes('|');
      const isDivider = hasPipes && /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(trimmed);

      if (hasPipes || (currentTable.length > 0 && (trimmed.startsWith('!') || /^Quantity:\s*\d+/i.test(trimmed) || /^Variant ID:/i.test(trimmed) || /^\$[\d,.]+/i.test(trimmed)))) {
        currentTable.push(trimmed);
      } else {
        if (currentTable.length > 0) {
          tableBlocks.push([...currentTable]);
          currentTable = [];
        }
        // Don't push standalone residue lines that were right below a table
        if (!/^Variant ID:\s*`?gid:\/\/shopify/i.test(trimmed) && !/^Quantity:\s*\d+/i.test(trimmed)) {
          nonTableLines.push(line);
        }
      }
    }
    if (currentTable.length > 0) {
      tableBlocks.push(currentTable);
    }

    // 2. Parse each table block
    for (const block of tableBlocks) {
      // Split each line into cells
      const matrix = [];
      for (const rawRow of block) {
        if (/^\|?(\s*:?-+:?\s*\|)+\s*$/.test(rawRow)) continue; // skip divider rows
        if (!rawRow.includes('|')) {
          // Single cell continuation
          if (matrix.length > 0) {
            matrix[matrix.length - 1].push(rawRow);
          }
          continue;
        }
        const cells = rawRow.split('|').map(c => c.trim()).filter((c, idx, arr) => {
          if (idx === 0 && c === '') return false;
          if (idx === arr.length - 1 && c === '') return false;
          return true;
        });
        if (cells.length > 0) {
          matrix.push(cells);
        }
      }

      if (matrix.length === 0) continue;

      const headerRow = matrix[0] || [];
      const numCols = Math.max(...matrix.map(r => r.length));

      // Check if transposed table (comparison table where each COLUMN is a product)
      // Condition: Column count > 1 and headers are actual product titles, NOT generic words
      const genericWords = /^(product|preview|image|title|price|details?|actions?|buy|link|item|best for|sizes?|scent)$/i;
      const isTransposed = numCols > 1 && headerRow.some(h => h.length > 3 && !genericWords.test(h));

      if (isTransposed) {
        // Each column c is 1 product!
        for (let c = 0; c < numCols; c++) {
          const title = (headerRow[c] || '').replace(/^!/, '').trim();
          if (!title || genericWords.test(title)) continue;

          let media = [];
          let priceLabel = '';
          let description = '';
          let variantId = '';

          for (let r = 1; r < matrix.length; r++) {
            const cell = matrix[r][c] || '';
            if (!cell) continue;

            // Media
            const imgMatch = cell.match(/<img[^>]+src=["']([^"']+)["']/i) || cell.match(/!\[([^\]]*)\]\(([^)]+)\)/) || cell.match(/(https?:\/\/[^\s\)\|\"'>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s\)\|\"'>]*)?)/i);
            if (imgMatch) {
              const src = imgMatch[1] || imgMatch[2];
              if (src && !media.includes(src)) media.push(src);
            }

            // Price
            const pMatch = cell.match(/(\$[\d,.]+(?:\s*[-–]\s*\$?[\d,.]+)?(?:\s*[A-Z]{3})?)/i);
            if (pMatch && !priceLabel) {
              priceLabel = pMatch[1].trim();
            }

            // Variant ID
            const vMatch = cell.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/i) || cell.match(/ID:\s*`?([0-9]+)/i);
            if (vMatch) {
              variantId = vMatch[1];
            }

            // Description / notes
            if (!cell.startsWith('$') && !cell.startsWith('!') && !cell.includes('http') && cell.length > 15 && cell !== title) {
              description = description ? `${description} · ${cell}` : cell;
            }
          }

          products.push(normalizeProduct({
            id: variantId || `p-col-${c}`,
            title,
            image: media[0] || null,
            images: media,
            price_display: priceLabel || null,
            description: description || null,
            variants: variantId ? [{ id: variantId, label: title, priceLabel, options: {} }] : []
          }, products.length));
        }
      } else {
        // Standard row-based or single-item cart confirmation table
        for (let r = 0; r < matrix.length; r++) {
          const row = matrix[r];
          const fullRowText = row.join(' | ');

          // Check if it's a cart confirmation item
          if (row.length === 1 && r === 0) {
            const title = row[0].replace(/^!/, '').trim();
            if (title && !genericWords.test(title)) {
              let priceLabel = '';
              let variantId = '';
              for (let subR = 1; subR < matrix.length; subR++) {
                const subText = matrix[subR].join(' ');
                const pMatch = subText.match(/(\$[\d,.]+(?:\s*[-–]\s*\$?[\d,.]+)?(?:\s*[A-Z]{3})?)/i);
                if (pMatch && !priceLabel) priceLabel = pMatch[1].trim();
                const vMatch = subText.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/i);
                if (vMatch) variantId = vMatch[1];
              }
              products.push(normalizeProduct({
                id: variantId || `p-cart-0`,
                title,
                price_display: priceLabel || null,
                variants: variantId ? [{ id: variantId, label: title, priceLabel, options: {} }] : []
              }, 0));
              break;
            }
          }

          if (r === 0 && row.some(c => genericWords.test(c))) {
            continue; // Header row
          }

          let title = '';
          let media = [];
          let priceLabel = '';
          let description = '';
          let variantId = '';

          const pMatch = fullRowText.match(/(\$[\d,.]+(?:\s*[-–]\s*\$?[\d,.]+)?(?:\s*[A-Z]{3})?)/i);
          if (pMatch) priceLabel = pMatch[1].trim();

          const vMatch = fullRowText.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/i);
          if (vMatch) variantId = vMatch[1];

          for (const cell of row) {
            const imgMatch = cell.match(/<img[^>]+src=["']([^"']+)["']/i) || cell.match(/!\[([^\]]*)\]\(([^)]+)\)/) || cell.match(/(https?:\/\/[^\s\)\|\"'>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s\)\|\"'>]*)?)/i);
            if (imgMatch) {
              const src = imgMatch[1] || imgMatch[2];
              if (src && !media.includes(src)) media.push(src);
            }

            const cleanCell = cell.replace(/<[^>]*>/g, '').replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').trim();
            if (!title && cleanCell && cleanCell.length > 2 && cleanCell.length < 90 && !cleanCell.startsWith('$') && !cleanCell.startsWith('!')) {
              if (!genericWords.test(cleanCell)) {
                title = cleanCell;
              }
            } else if (cleanCell.length > 20 && cleanCell !== title) {
              description = cleanCell;
            }
          }

          if (title || media.length > 0) {
            products.push(normalizeProduct({
              id: variantId || `p-row-${r}`,
              title: title || 'Store Product',
              image: media[0] || null,
              images: media,
              price_display: priceLabel || null,
              description: description || null,
              variants: variantId ? [{ id: variantId, label: title, priceLabel, options: {} }] : []
            }, products.length));
          }
        }
      }
    }

    // 3. Clean up non-table lines: strip any residual table syntax, pipes, and dashes
    const cleanedLines = nonTableLines.filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (trimmed.includes('|')) return false;
      if (/^[-=_*]{3,}$/.test(trimmed)) return false;
      if (/^Variant ID:\s*`?gid:\/\/shopify/i.test(trimmed)) return false;
      if (/^Quantity:\s*\d+/i.test(trimmed)) return false;
      return true;
    });

    const cleanedText = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return { cleanedText, products };
  }

  /* ==========================================================================
     2. STOREFRONT LIVECOMMERCE APPLICATION OBJECT
     ========================================================================== */

  const ShopAIChat = {
    state: {
      stage: 'idle',
      conversationId: null,
      cart: null,
      activeProduct: null,
      selectedOptions: {},
      lastRaw: null,
      expandedCollections: false,
      isListening: false,
      speechRecognizer: null
    },

    elements: {},

    init: async function() {
      const container = document.getElementById('shop-ai-chat-root');
      if (!container) return;

      this.cacheElements(container);
      this.setupEventListeners();
      this.initVoiceRecognition();

      // Sync real Shopify cart count immediately
      await this.syncNativeCart();

      // Fire AgentBubbleShown event on launch
      this.trackAnalytics('AgentBubbleShown');

      // Check existing conversation or render welcome screen
      const storedConvId = sessionStorage.getItem('shopAiConversationId');
      if (storedConvId) {
        this.state.conversationId = storedConvId;
        await this.fetchChatHistory(storedConvId);
      } else {
        this.renderWelcomeScreen();
      }

      // Expose global bridge per COMMERCE-ADD specs
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
        // Sheets
        detailSheet: document.getElementById('shop-ai-detail-sheet'),
        detailSheetClose: document.getElementById('shop-ai-sheet-close'),
        detailSheetBody: document.getElementById('shop-ai-sheet-body'),
        detailSheetPrice: document.getElementById('shop-ai-sheet-price'),
        detailSheetAddBtn: document.getElementById('shop-ai-sheet-add-btn'),
        detailSheetSeller: document.getElementById('shop-ai-sheet-seller'),
        cartSheet: document.getElementById('shop-ai-cart-sheet'),
        cartSheetClose: document.getElementById('shop-ai-cart-sheet-close'),
        cartSheetBody: document.getElementById('shop-ai-cart-sheet-body'),
        cartSheetSubtotal: document.getElementById('shop-ai-cart-subtotal'),
        cartSheetCheckout: document.getElementById('shop-ai-cart-sheet-checkout')
      };
    },

    setupEventListeners: function() {
      const {
        launcher, closeBtn, dockToggleBtn, menuBtn, dropdownMenu, menuClearBtn,
        headerCartBtn, inputField, sendBtn, floatingBag,
        detailSheetClose, detailSheetAddBtn, cartSheetClose, cartSheetCheckout
      } = this.elements;

      // Toggle Window
      launcher.addEventListener('click', () => this.toggleWindow(true));
      closeBtn.addEventListener('click', () => this.toggleWindow(false));

      // Window Size Expand / Dock Toggle
      if (dockToggleBtn) {
        dockToggleBtn.addEventListener('click', () => {
          this.elements.window.classList.toggle('docked-expanded');
        });
      }

      // Dropdown Menu
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
          this.state.conversationId = null;
          this.elements.messagesContainer.innerHTML = '';
          this.renderWelcomeScreen();
        });
      }

      // Input send
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

      // Cart Sheets
      if (headerCartBtn) {
        headerCartBtn.addEventListener('click', () => this.openCartSheet());
      }
      if (floatingBag) {
        floatingBag.addEventListener('click', () => this.openCartSheet());
      }
      if (cartSheetClose) {
        cartSheetClose.addEventListener('click', () => this.closeCartSheet());
      }
      if (detailSheetClose) {
        detailSheetClose.addEventListener('click', () => this.closeDetailSheet());
      }
      if (detailSheetAddBtn) {
        detailSheetAddBtn.addEventListener('click', () => this.onDetailAddClick());
      }
      if (cartSheetCheckout) {
        cartSheetCheckout.addEventListener('click', () => this.redirectToCheckout());
      }

      // Listen for native cart updates from other parts of the store
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

      // If cleanId is not purely numeric (e.g. it was a product handle or slug), resolve variant ID from Shopify
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
          // Stamp cart attributes
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
          this.renderCartSheetBody();
          window.dispatchEvent(new CustomEvent('cart:updated'));
        }
      } catch (_) {}
    },

    redirectToCheckout: function() {
      this.trackAnalytics('AgentCheckout');
      // Stamp URL with Facetimefy attribution and redirect
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
       4. WELL-KNOWN DISCOVERY & CLICKABLE CATEGORY CAROUSEL (media_1790664441190.png)
       ========================================================================== */

    discoverWellKnown: async function() {
      if (this.state.wellKnownData) return this.state.wellKnownData;
      try {
        const stored = sessionStorage.getItem('shop_well_known_manifest');
        if (stored) {
          this.state.wellKnownData = JSON.parse(stored);
          return this.state.wellKnownData;
        }
      } catch (_) {}

      try {
        const res = await fetch('/.well-known/ucp', { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          const ucp = data.ucp || data;

          let canonicalDomain = null;
          const shoppingService = ucp.services?.['dev.ucp.shopping']?.find(s => s.transport === 'mcp') || ucp.services?.['dev.ucp.shopping']?.[0];
          if (shoppingService?.endpoint) {
            try { canonicalDomain = new URL(shoppingService.endpoint).hostname; } catch (_) {}
          }
          if (!canonicalDomain && ucp.supported_versions) {
            const firstVerUrl = Object.values(ucp.supported_versions)[0];
            if (firstVerUrl) {
              try { canonicalDomain = new URL(firstVerUrl).hostname; } catch (_) {}
            }
          }

          const gpayInfo = ucp.payment_handlers?.['com.google.pay']?.[0]?.config?.merchant_info;
          const merchantName = gpayInfo?.merchant_name || '';

          const result = {
            storeDomain: canonicalDomain || window.location.hostname,
            merchantName: merchantName,
            mcpEndpoint: shoppingService?.endpoint || null
          };

          this.state.wellKnownData = result;
          try { sessionStorage.setItem('shop_well_known_manifest', JSON.stringify(result)); } catch (_) {}
          return result;
        }
      } catch (_) {}

      const fallback = {
        storeDomain: window.location.hostname,
        merchantName: window.shopInitialData?.shopName || '',
        mcpEndpoint: null
      };
      this.state.wellKnownData = fallback;
      return fallback;
    },

    discoverCollectionsFromPage: async function() {
      // 100% dynamic discovery from current page — ZERO database persistence
      let collections = (window.shopInitialData?.collections || []).filter(c => c && c.handle !== 'frontpage');
      if (collections.length > 0 && collections.some(c => c.image)) {
        return collections;
      }

      try {
        const res = await fetch('/collections.json', { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          const fetched = (data.collections || []).filter(c => c && c.handle !== 'frontpage').map(c => ({
            id: c.id,
            title: c.title,
            handle: c.handle,
            url: `/collections/${c.handle}`,
            products_count: c.products_count,
            image: c.image ? (c.image.src || c.image) : null
          }));

          if (fetched.length > 0) {
            // Fill any missing images with first product image from that collection
            for (const col of fetched.slice(0, 8)) {
              if (!col.image) {
                try {
                  const pRes = await fetch(`/collections/${col.handle}/products.json?limit=1`);
                  if (pRes.ok) {
                    const pData = await pRes.json();
                    if (pData.products?.[0]?.images?.[0]?.src) {
                      col.image = pData.products[0].images[0].src;
                    }
                  }
                } catch (_) {}
              }
            }
            return fetched;
          }
        }
      } catch (_) {}

      return collections;
    },

    renderWelcomeScreen: async function() {
      const container = this.elements.messagesContainer;
      container.innerHTML = '';

      const wrap = document.createElement('div');
      wrap.className = 'shop-ai-welcome-card';

      // Discovered merchant name from .well-known/ucp or page initial data
      const wellKnown = await this.discoverWellKnown();
      const storeName = wellKnown.merchantName || window.shopInitialData?.shopName || 'Store';

      // Dynamically update header and placeholder
      const headerTitle = this.elements.container?.querySelector('.shop-ai-header-title');
      if (headerTitle && !headerTitle.dataset.customized) {
        headerTitle.textContent = `${storeName} AI`;
      }
      if (this.elements.inputField) {
        this.elements.inputField.placeholder = `Message ${storeName} AI...`;
      }

      const heading = document.createElement('h3');
      heading.className = 'shop-ai-welcome-title';
      heading.textContent = `Welcome to ${storeName} 👋`;
      wrap.appendChild(heading);

      const sub = document.createElement('p');
      sub.className = 'shop-ai-welcome-sub';
      sub.textContent = 'Ask me anything you are interested in.';
      wrap.appendChild(sub);

      // Category / Collection Carousel (Discovered dynamically from page — ZERO database)
      const collections = await this.discoverCollectionsFromPage();
      this.trackAnalytics('AgentNudgeShown', { collections_count: collections.length });

      if (collections.length > 0) {
        const shelfWrap = document.createElement('div');
        shelfWrap.className = 'shop-ai-category-shelf-wrap';

        const shelf = document.createElement('div');
        shelf.className = 'shop-ai-category-shelf lc-no-sb';

        collections.forEach(col => {
          const card = document.createElement('div');
          card.className = 'shop-ai-category-card';
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');

          const thumb = document.createElement('div');
          thumb.className = 'shop-ai-category-thumb';
          if (col.image) {
            const img = document.createElement('img');
            img.src = col.image;
            img.alt = col.title;
            img.loading = 'lazy';
            thumb.appendChild(img);
          } else {
            thumb.textContent = '🛍️';
          }
          card.appendChild(thumb);

          const title = document.createElement('div');
          title.className = 'shop-ai-category-title';
          title.textContent = col.title;
          card.appendChild(title);

          // Clicking category card asks the assistant
          card.addEventListener('click', () => {
            this.trackAnalytics('AgentResponseClick', { prompt: `Tell me more about ${col.title}` });
            this.sendUserMessage(`Tell me more about ${col.title}`);
          });

          shelf.appendChild(card);
        });

        shelfWrap.appendChild(shelf);

        // Scroll right button
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'shop-ai-category-scroll-btn';
        scrollBtn.innerHTML = '&#8250;';
        scrollBtn.setAttribute('aria-label', 'Scroll categories');
        scrollBtn.addEventListener('click', () => {
          shelf.scrollBy({ left: 160, behavior: 'smooth' });
        });
        shelfWrap.appendChild(scrollBtn);

        wrap.appendChild(shelfWrap);
      }

      container.appendChild(wrap);
    },

    /* ==========================================================================
       5. CHAT MESSAGING & API DISPATCH
       ========================================================================== */

    sendUserMessage: async function(text) {
      const container = this.elements.messagesContainer;

      // Track LiveMessageSent
      this.trackAnalytics('LiveMessageSent', { message: text });

      // 1. Append user message bubble (Screenshot 2: dark bubble on right)
      this.appendUserMessage(text);
      this.scrollToBottom();

      // 2. Show typing indicator
      this.showTypingIndicator();

      // 3. API Dispatch to Cloudflare Worker (using well-known discovered domain)
      const apiUrl = `${getBaseWorkerUrl()}/chat`;
      const wellKnown = await this.discoverWellKnown();
      const storeDomain = wellKnown.storeDomain || window.location.hostname;

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
          // STRICT ZERO CUSTOMER-FACING ERRORS: silently clear indicator
          return;
        }

        const data = await response.json();
        if (data.error) {
          return;
        }

        if (data.conversation_id) {
          this.state.conversationId = data.conversation_id;
          sessionStorage.setItem('shopAiConversationId', data.conversation_id);
        }

        // 4. Ingest and route response through LiveCommerce engine
        this.ingest(data);

      } catch (_) {
        this.removeTypingIndicator();
      }
    },

    appendUserMessage: function(text) {
      const container = this.elements.messagesContainer;
      const el = document.createElement('div');
      el.className = 'shop-ai-message user';
      el.textContent = text;
      container.appendChild(el);
    },

    showTypingIndicator: function() {
      this.removeTypingIndicator();
      const container = this.elements.messagesContainer;
      const ind = document.createElement('div');
      ind.className = 'shop-ai-typing-indicator';
      ind.id = 'shop-ai-typing';
      ind.innerHTML = '<span></span><span></span><span></span>';
      container.appendChild(ind);
      this.scrollToBottom();
    },

    removeTypingIndicator: function() {
      const ind = document.getElementById('shop-ai-typing');
      if (ind) ind.remove();
    },

    /* ==========================================================================
       6. LIVECOMMERCE INGEST & DISPLAY (Exact Screenshots 2, 3, 4 Parity)
       ========================================================================== */

    ingest: function(raw, hint) {
      this.state.lastRaw = raw;

      // Extract products from any raw markdown tables and strip table syntax from text
      let rawMsg = (raw && typeof raw === 'object' ? raw.message : typeof raw === 'string' ? raw : '') || '';
      const extracted = extractProductsFromMarkdown(rawMsg);
      const displayMessage = extracted.cleanedText;

      const routed = routeResult(raw, hint);

      // Supply or merge extracted products so visual cards always render
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

      const container = this.elements.messagesContainer;
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'shop-ai-message assistant';

      // 1. If products returned (In-stream LiveCommerce Carousel & Cards)
      if (routed.products && routed.products.length > 0) {
        const prodSec = this.createLiveCommerceShelf(routed.products, displayMessage || rawMsg, assistantMsg);
        assistantMsg.appendChild(prodSec);
      }

      // 2. Assistant summary / explanation text (Cleaned text without the table!)
      if (displayMessage) {
        const textWrap = document.createElement('div');
        textWrap.className = 'shop-ai-message-text';
        textWrap.innerHTML = this.formatMarkdown(displayMessage);
        assistantMsg.appendChild(textWrap);
      }

      // 3. Quick action suggestion chips (Screenshots 3 & 4)
      const chips = this.extractSuggestionChips(raw);
      if (chips.length > 0) {
        const chipsWrap = document.createElement('div');
        chipsWrap.className = 'shop-ai-suggestion-chips';
        chips.forEach(chipText => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'shop-ai-chip';
          chip.textContent = chipText;
          chip.addEventListener('click', () => {
            this.trackAnalytics('AgentResponseClick', { prompt: chipText });
            if (/checkout/i.test(chipText)) {
              this.handleCheckoutFlow();
            } else {
              this.sendUserMessage(chipText);
            }
          });
          chipsWrap.appendChild(chip);
        });
        assistantMsg.appendChild(chipsWrap);
      }

      // 4. Message Action Icons (Screenshot 4: Copy, Thumbs Up, Thumbs Down)
      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'shop-ai-message-actions';

      // Copy Button
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'shop-ai-action-btn';
      copyBtn.title = 'Copy response';
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      `;
      copyBtn.addEventListener('click', () => {
        const textToCopy = raw.message || assistantMsg.innerText;
        navigator.clipboard?.writeText(textToCopy).then(() => {
          copyBtn.classList.add('active');
          setTimeout(() => copyBtn.classList.remove('active'), 1500);
        });
      });
      actionsWrap.appendChild(copyBtn);

      // Thumbs Up
      const thumbUpBtn = document.createElement('button');
      thumbUpBtn.type = 'button';
      thumbUpBtn.className = 'shop-ai-action-btn';
      thumbUpBtn.title = 'Helpful';
      thumbUpBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
        </svg>
      `;
      thumbUpBtn.addEventListener('click', () => {
        thumbUpBtn.classList.toggle('active');
        this.trackAnalytics('AgentFeedback', { value: 'thumb_up' });
      });
      actionsWrap.appendChild(thumbUpBtn);

      // Thumbs Down
      const thumbDownBtn = document.createElement('button');
      thumbDownBtn.type = 'button';
      thumbDownBtn.className = 'shop-ai-action-btn';
      thumbDownBtn.title = 'Not helpful';
      thumbDownBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
        </svg>
      `;
      thumbDownBtn.addEventListener('click', () => {
        thumbDownBtn.classList.toggle('active');
        this.trackAnalytics('AgentFeedback', { value: 'thumb_down' });
      });
      actionsWrap.appendChild(thumbDownBtn);

      assistantMsg.appendChild(actionsWrap);

      container.appendChild(assistantMsg);
      this.scrollToBottom();
      return routed;
    },

    createLiveCommerceShelf: function(products, queryHint, assistantMsg) {
      const shelf = document.createElement('div');
      shelf.className = 'shop-ai-lc-shelf';

      // Header row with pulsating indicator
      const header = document.createElement('div');
      header.className = 'shop-ai-lc-header';

      let topic = 'RESULTS';
      if (queryHint) {
        const boldMatch = queryHint.match(/\*\*([^*]+)\*\*/);
        if (boldMatch) topic = boldMatch[1].toUpperCase();
      }

      header.innerHTML = `
        <span class="shop-ai-lc-header-title">
          <i class="shop-ai-lc-dot"></i>
          <span>${topic}</span>
        </span>
        <span class="shop-ai-lc-count">${products.length} ${products.length === 1 ? 'item' : 'items'}</span>
      `;
      shelf.appendChild(header);

      // Horizontal snap carousel
      const carousel = document.createElement('div');
      carousel.className = 'shop-ai-lc-carousel lc-no-sb';

      products.forEach(product => {
        carousel.appendChild(this.createLiveCommerceCard(product, assistantMsg));
      });

      shelf.appendChild(carousel);
      return shelf;
    },

    createLiveCommerceCard: function(product, assistantMsg) {
      const card = document.createElement('div');
      card.className = 'shop-ai-lc-card';

      // Badge if present
      if (product.badge) {
        const badge = document.createElement('span');
        badge.className = 'shop-ai-lc-badge';
        badge.textContent = product.badge;
        card.appendChild(badge);
      }

      // Thumbnail
      const thumb = document.createElement('div');
      thumb.className = 'shop-ai-lc-thumb';
      const imgSrc = product.media && product.media[0] ? product.media[0] : null;
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = product.title || '';
        img.loading = 'lazy';
        thumb.appendChild(img);
      } else {
        const initials = (product.title || 'Store')
          .split(/\s+/)
          .slice(0, 2)
          .map(w => w[0] || '')
          .join('')
          .toUpperCase() || '•';
        thumb.textContent = initials;
      }
      card.appendChild(thumb);

      // Title
      const title = document.createElement('div');
      title.className = 'shop-ai-lc-title';
      title.textContent = product.title || 'Product';
      card.appendChild(title);

      // Seller / Brand
      const seller = document.createElement('div');
      seller.className = 'shop-ai-lc-seller';
      seller.textContent = product.seller || window.shopInitialData?.shopName || '';
      card.appendChild(seller);

      // Star rating if present
      if (product.rating != null) {
        const starsWrap = document.createElement('div');
        starsWrap.className = 'shop-ai-lc-stars';
        const ratingPct = Math.min(100, Math.max(0, (product.rating / 5) * 100));
        starsWrap.innerHTML = `
          <span class="stars-bg">★★★★★<span class="stars-fill" style="width: ${ratingPct}%">★★★★★</span></span>
          ${product.reviews != null ? `<span class="reviews-count">(${product.reviews})</span>` : ''}
        `;
        card.appendChild(starsWrap);
      }

      // Price Row
      const priceRow = document.createElement('div');
      priceRow.className = 'shop-ai-lc-price-row';
      const currentPrice = document.createElement('span');
      currentPrice.className = 'shop-ai-lc-price';
      currentPrice.textContent = product.priceLabel || '—';
      priceRow.appendChild(currentPrice);

      if (product.compareLabel) {
        const compare = document.createElement('s');
        compare.className = 'shop-ai-lc-compare';
        compare.textContent = product.compareLabel;
        priceRow.appendChild(compare);
      }
      card.appendChild(priceRow);

      // "+ Add to bag" Button
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'shop-ai-lc-btn-add';
      addBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Add to bag</span>
      `;

      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        addBtn.disabled = true;
        addBtn.querySelector('span').textContent = 'Adding…';

        await this.resolveShopifyProductDetails(product);

        // If product has options or multiple variants, render in-stream variant picker
        if (product.variants.length > 1 || (product.options && product.options.length > 0)) {
          addBtn.disabled = false;
          addBtn.querySelector('span').textContent = 'Add to bag';
          this.renderInStreamVariantPicker(product, assistantMsg);
          return;
        }

        // Single variant: directly add to native cart
        const variantId = product.variants[0]?.id || product.id;
        const success = await this.addVariantToCart(variantId, product.title, product.priceLabel);
        if (success) {
          addBtn.querySelector('span').textContent = '✓ Added';
          setTimeout(() => {
            addBtn.disabled = false;
            addBtn.querySelector('span').textContent = 'Add to bag';
          }, 2000);
          this.renderInStreamCartConfirm(product, product.variants[0] || null, assistantMsg);
        } else {
          addBtn.disabled = false;
          addBtn.querySelector('span').textContent = 'Add to bag';
        }
      });

      card.appendChild(addBtn);

      // Clicking card also allows viewing/selecting options
      card.addEventListener('click', async () => {
        this.trackAnalytics('AgentProductClick', {
          product_id: product.id || '',
          product_title: product.title || '',
          price: product.price || 0
        });
        await this.resolveShopifyProductDetails(product);
        if (product.variants.length > 1 || (product.options && product.options.length > 0)) {
          this.renderInStreamVariantPicker(product, assistantMsg);
        }
      });

      return card;
    },

    renderInStreamVariantPicker: function(product, assistantMsg) {
      // Remove any previously open picker in this message
      const existing = assistantMsg.querySelector('.shop-ai-lc-variant-card');
      if (existing) existing.remove();

      const picker = document.createElement('div');
      picker.className = 'shop-ai-lc-variant-card';

      // Header with product details
      const header = document.createElement('div');
      header.className = 'shop-ai-lc-variant-header';
      const thumbSrc = product.media && product.media[0] ? product.media[0] : '';
      header.innerHTML = `
        ${thumbSrc ? `<img src="${thumbSrc}" class="shop-ai-lc-variant-thumb" alt="${product.title || ''}">` : ''}
        <div class="shop-ai-lc-variant-info">
          <div class="shop-ai-lc-variant-title">${product.title || ''}</div>
          <div class="shop-ai-lc-variant-price" id="shop-ai-picker-price">${product.priceLabel || '—'}</div>
        </div>
        <button type="button" class="shop-ai-header-btn" style="width:24px;height:24px;font-size:12px;" aria-label="Close">✕</button>
      `;
      header.querySelector('button').addEventListener('click', () => picker.remove());
      picker.appendChild(header);

      let selectedOptions = {};
      if (product.variants.length > 0) {
        selectedOptions = { ...product.variants[0].options };
      }

      const updateSelectedPrice = () => {
        const keys = Object.keys(selectedOptions);
        if (keys.length > 0 && product.variants.length > 0) {
          const matched = product.variants.find(v => keys.every(k => v.options[k] === selectedOptions[k]));
          if (matched && matched.priceLabel) {
            const priceEl = picker.querySelector('#shop-ai-picker-price');
            if (priceEl) priceEl.textContent = matched.priceLabel;
          }
        }
      };

      // Option groups (e.g. Size, Scent, Color)
      if (product.options && product.options.length > 0) {
        product.options.forEach(opt => {
          const grp = document.createElement('div');
          grp.className = 'shop-ai-lc-options-group';

          const lbl = document.createElement('div');
          lbl.className = 'shop-ai-lc-opt-label';
          lbl.textContent = opt.label;
          grp.appendChild(lbl);

          const chipsWrap = document.createElement('div');
          chipsWrap.className = 'shop-ai-lc-opt-chips';

          opt.values.forEach(val => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `shop-ai-lc-opt-chip ${selectedOptions[opt.label] === val.label ? 'active' : ''}`;
            chip.textContent = val.label;
            chip.addEventListener('click', () => {
              selectedOptions[opt.label] = val.label;
              chipsWrap.querySelectorAll('.shop-ai-lc-opt-chip').forEach(c => c.classList.remove('active'));
              chip.classList.add('active');
              updateSelectedPrice();
            });
            chipsWrap.appendChild(chip);
          });

          grp.appendChild(chipsWrap);
          picker.appendChild(grp);
        });
      }

      // Confirm button
      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'shop-ai-lc-confirm-btn';
      confirmBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Confirm & Add to bag</span>
      `;

      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.querySelector('span').textContent = 'Adding…';

        // Find matched variant
        let chosenVariant = product.variants[0] || null;
        const keys = Object.keys(selectedOptions);
        if (keys.length > 0 && product.variants.length > 0) {
          const found = product.variants.find(v => keys.every(k => v.options[k] === selectedOptions[k]));
          if (found) chosenVariant = found;
        }

        const variantId = chosenVariant?.id || product.id;
        const success = await this.addVariantToCart(variantId, product.title, chosenVariant?.priceLabel || product.priceLabel);

        if (success) {
          picker.remove();
          this.renderInStreamCartConfirm(product, chosenVariant, assistantMsg);
        } else {
          confirmBtn.disabled = false;
          confirmBtn.querySelector('span').textContent = 'Confirm & Add to bag';
        }
      });

      picker.appendChild(confirmBtn);

      // Insert directly below the shelf or text in assistantMsg
      assistantMsg.appendChild(picker);
      this.scrollToBottom();
    },

    renderInStreamCartConfirm: function(product, variant, assistantMsg) {
      // Remove any prior confirmation cards
      const existing = assistantMsg.querySelector('.shop-ai-lc-confirm-card');
      if (existing) existing.remove();

      const confirm = document.createElement('div');
      confirm.className = 'shop-ai-lc-confirm-card';

      const variantTitle = variant?.label || variant?.title || '';
      const priceText = variant?.priceLabel || product.priceLabel || '';

      confirm.innerHTML = `
        <div class="shop-ai-lc-confirm-top">
          <div class="shop-ai-lc-confirm-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="shop-ai-lc-confirm-details">
            <div class="shop-ai-lc-confirm-title">${product.title || 'Item added to bag'}</div>
            <div class="shop-ai-lc-confirm-sub">${[variantTitle, priceText].filter(Boolean).join(' · ')}</div>
          </div>
          <button type="button" class="shop-ai-header-btn" style="width:24px;height:24px;font-size:12px;" aria-label="Dismiss">✕</button>
        </div>
        <div class="shop-ai-lc-confirm-actions">
          <button type="button" class="shop-ai-lc-btn-browse">Continue browsing</button>
          <button type="button" class="shop-ai-lc-btn-checkout">Checkout →</button>
        </div>
      `;

      confirm.querySelector('.shop-ai-header-btn').addEventListener('click', () => confirm.remove());
      confirm.querySelector('.shop-ai-lc-btn-browse').addEventListener('click', () => confirm.remove());
      confirm.querySelector('.shop-ai-lc-btn-checkout').addEventListener('click', () => {
        this.redirectToCheckout();
      });

      assistantMsg.appendChild(confirm);
      this.scrollToBottom();
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

    createProductCard: function(product) {
      const card = document.createElement('div');
      card.className = 'shop-ai-product-card';

      const topRow = document.createElement('div');
      topRow.className = 'shop-ai-product-top-row';

      // Thumbnail
      const thumb = document.createElement('div');
      thumb.className = 'shop-ai-product-thumbnail';
      const imgSrc = product.media[0] || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = product.title;
      img.loading = 'lazy';
      thumb.appendChild(img);
      thumb.addEventListener('click', async () => {
        await this.resolveShopifyProductDetails(product);
        this.openDetailSheet(product);
      });
      topRow.appendChild(thumb);

      // Meta
      const meta = document.createElement('div');
      meta.className = 'shop-ai-product-meta';

      const titleLink = document.createElement('a');
      titleLink.className = 'shop-ai-product-title-link';
      titleLink.textContent = product.title;
      titleLink.href = product.url || '#';
      titleLink.addEventListener('click', async (e) => {
        if (!product.url) {
          e.preventDefault();
          await this.resolveShopifyProductDetails(product);
          this.openDetailSheet(product);
        }
      });
      meta.appendChild(titleLink);

      const price = document.createElement('div');
      price.className = 'shop-ai-product-price';
      price.textContent = product.priceLabel || '—';
      meta.appendChild(price);

      // Add to Cart Button (White pill button "+ Add to cart")
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'shop-ai-product-add-btn';
      addBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Add to cart</span>
      `;

      addBtn.addEventListener('click', async () => {
        addBtn.disabled = true;
        addBtn.querySelector('span').textContent = 'Adding…';

        await this.resolveShopifyProductDetails(product);

        // If product has multiple variants or options, open detail sheet to let user choose
        if (product.variants.length > 1 || (product.options && product.options.length > 0)) {
          addBtn.disabled = false;
          addBtn.querySelector('span').textContent = 'Add to cart';
          this.openDetailSheet(product);
          return;
        }

        const variantId = product.variants[0]?.id || product.id;
        const success = await this.addVariantToCart(variantId, product.title, product.priceLabel);
        if (success) {
          addBtn.querySelector('span').textContent = '✓ Added';
          setTimeout(() => {
            addBtn.disabled = false;
            addBtn.querySelector('span').textContent = 'Add to cart';
          }, 2500);
        } else {
          addBtn.disabled = false;
          addBtn.querySelector('span').textContent = 'Add to cart';
        }
      });

      meta.appendChild(addBtn);
      topRow.appendChild(meta);
      card.appendChild(topRow);

      // Description
      if (product.description) {
        const desc = document.createElement('p');
        desc.className = 'shop-ai-product-description';
        desc.textContent = product.description;
        card.appendChild(desc);
      }

      return card;
    },

    extractSuggestionChips: function(raw) {
      const chips = [];
      const msg = raw.message || '';

      // Pattern 1: Follow-up suggestions from message text
      if (/checkout/i.test(msg) || raw.cart) {
        chips.push('Checkout');
      }

      // Check collections or related categories for contextual suggestions
      const collections = window.shopInitialData?.collections || [];
      if (collections.length > 0) {
        if (/numbing/i.test(msg)) {
          chips.push('Shop numbing creams', 'Explore aftercare balms', 'See tattoo gel sets');
        } else if (/machine/i.test(msg)) {
          chips.push('Tattoo Machines', 'Power Supplies', 'Shop Needles');
        } else {
          collections.slice(0, 3).forEach(c => chips.push(`Shop ${c.title}`));
        }
      }

      return [...new Set(chips)].slice(0, 4);
    },

    handleCheckoutFlow: function() {
      // User says checkout (Screenshot 4)
      this.appendUserMessage('Checkout');
      this.scrollToBottom();

      const container = this.elements.messagesContainer;
      const botMsg = document.createElement('div');
      botMsg.className = 'shop-ai-message assistant';

      const statusNote = document.createElement('div');
      statusNote.className = 'shop-ai-status-note';
      statusNote.innerHTML = '<span class="shop-ai-status-note-dot"></span> Redirecting to checkout…';
      botMsg.appendChild(statusNote);

      container.appendChild(botMsg);
      this.scrollToBottom();

      setTimeout(() => {
        this.redirectToCheckout();
      }, 800);
    },

    /* ==========================================================================
       7. PRODUCT DETAIL & OPTIONS SHEET (LiveCommerce layer)
       ========================================================================== */

    openDetailSheet: function(product) {
      this.trackAnalytics('AgentProductClick', {
        product_id: product.id || '',
        product_title: product.title || '',
        price: product.price || 0
      });
      this.state.activeProduct = product;
      this.state.selectedOptions = {};

      // Pre-select first variant options if available
      if (product.variants.length > 0) {
        this.state.selectedOptions = { ...product.variants[0].options };
      }

      const { detailSheet, detailSheetSeller, detailSheetPrice, detailSheetBody } = this.elements;
      detailSheetSeller.textContent = product.seller || '';
      detailSheetPrice.textContent = product.priceLabel || '—';

      detailSheetBody.innerHTML = '';

      // Media
      if (product.media.length > 0) {
        const mediaWrap = document.createElement('div');
        mediaWrap.className = 'shop-ai-sheet-media';
        const img = document.createElement('img');
        img.src = product.media[0];
        img.alt = product.title;
        mediaWrap.appendChild(img);
        detailSheetBody.appendChild(mediaWrap);
      }

      // Title
      const title = document.createElement('h3');
      title.className = 'shop-ai-sheet-product-title';
      title.textContent = product.title;
      detailSheetBody.appendChild(title);

      // Options
      if (product.options.length > 0) {
        product.options.forEach(opt => {
          const group = document.createElement('div');
          group.className = 'shop-ai-option-group';

          const label = document.createElement('div');
          label.className = 'shop-ai-option-label';
          label.textContent = opt.label;
          group.appendChild(label);

          const valsWrap = document.createElement('div');
          valsWrap.className = 'shop-ai-option-values';

          opt.values.forEach(val => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `shop-ai-option-chip ${this.state.selectedOptions[opt.label] === val.label ? 'selected' : ''}`;
            chip.textContent = val.label;
            chip.addEventListener('click', () => {
              this.state.selectedOptions[opt.label] = val.label;
              valsWrap.querySelectorAll('.shop-ai-option-chip').forEach(c => c.classList.remove('selected'));
              chip.classList.add('selected');

              // Find matching variant
              const matched = product.variants.find(v =>
                Object.keys(this.state.selectedOptions).every(k => v.options[k] === this.state.selectedOptions[k])
              );
              if (matched && matched.priceLabel) {
                detailSheetPrice.textContent = matched.priceLabel;
              }
            });
            valsWrap.appendChild(chip);
          });

          group.appendChild(valsWrap);
          detailSheetBody.appendChild(group);
        });
      }

      // Description
      if (product.description) {
        const desc = document.createElement('p');
        desc.className = 'shop-ai-product-description';
        desc.style.webkitLineClamp = 'none';
        desc.textContent = product.description;
        detailSheetBody.appendChild(desc);
      }

      detailSheet.style.display = 'flex';
    },

    closeDetailSheet: function() {
      this.elements.detailSheet.style.display = 'none';
    },

    onDetailAddClick: async function() {
      const prod = this.state.activeProduct;
      if (!prod) return;

      const addBtn = this.elements.detailSheetAddBtn;
      addBtn.disabled = true;
      addBtn.querySelector('span').textContent = 'Adding…';

      // Match variant
      let variantId = prod.variants[0]?.id || prod.id;
      if (prod.variants.length > 0) {
        const matched = prod.variants.find(v =>
          Object.keys(this.state.selectedOptions).every(k => v.options[k] === this.state.selectedOptions[k])
        );
        if (matched) variantId = matched.id;
      }

      const success = await this.addVariantToCart(variantId, prod.title, prod.priceLabel);
      if (success) {
        addBtn.querySelector('span').textContent = '✓ Added to bag';
        setTimeout(() => {
          this.closeDetailSheet();
          addBtn.disabled = false;
          addBtn.querySelector('span').textContent = 'Add to bag';
        }, 800);
      } else {
        addBtn.disabled = false;
        addBtn.querySelector('span').textContent = 'Add to bag';
      }
    },

    /* ==========================================================================
       8. CART REVIEW SHEET (LiveCommerce layer)
       ========================================================================== */

    openCartSheet: async function() {
      await this.syncNativeCart();
      this.renderCartSheetBody();
      this.elements.cartSheet.style.display = 'flex';
    },

    closeCartSheet: function() {
      this.elements.cartSheet.style.display = 'none';
    },

    renderCartSheetBody: function() {
      const { cartSheetBody, cartSheetSubtotal } = this.elements;
      cartSheetBody.innerHTML = '';

      const cart = this.state.cart;
      if (!cart || cart.lines.length === 0) {
        cartSheetBody.innerHTML = '<div style="text-align: center; padding: 32px 0; color: #9ca3af; font-size: 13px;">Your shopping bag is empty.</div>';
        cartSheetSubtotal.textContent = '$0.00';
        return;
      }

      cart.lines.forEach(line => {
        const row = document.createElement('div');
        row.className = 'shop-ai-cart-line';

        const thumb = document.createElement('div');
        thumb.className = 'shop-ai-cart-line-thumb';
        if (line.media) {
          const img = document.createElement('img');
          img.src = line.media;
          img.alt = line.title;
          thumb.appendChild(img);
        }
        row.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'shop-ai-cart-line-info';

        const title = document.createElement('div');
        title.className = 'shop-ai-cart-line-title';
        title.textContent = line.title;
        info.appendChild(title);

        const price = document.createElement('div');
        price.className = 'shop-ai-cart-line-price';
        price.textContent = line.priceLabel || '—';
        info.appendChild(price);

        row.appendChild(info);

        const qtyControls = document.createElement('div');
        qtyControls.className = 'shop-ai-cart-line-qty';

        const minus = document.createElement('button');
        minus.type = 'button';
        minus.className = 'shop-ai-qty-btn';
        minus.textContent = '-';
        minus.addEventListener('click', () => {
          this.changeCartQuantity(line.id, Math.max(0, line.qty - 1));
        });
        qtyControls.appendChild(minus);

        const count = document.createElement('span');
        count.style.fontSize = '12px';
        count.style.fontWeight = '700';
        count.style.minWidth = '16px';
        count.style.textAlign = 'center';
        count.textContent = line.qty;
        qtyControls.appendChild(count);

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'shop-ai-qty-btn';
        plus.textContent = '+';
        plus.addEventListener('click', () => {
          this.changeCartQuantity(line.id, line.qty + 1);
        });
        qtyControls.appendChild(plus);

        row.appendChild(qtyControls);
        cartSheetBody.appendChild(row);
      });

      // Subtotal display
      const totalObj = cart.totals.find(t => /total/i.test(t.label)) || cart.totals[0];
      cartSheetSubtotal.textContent = totalObj ? totalObj.display : '$0.00';
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
          // Auto-send if non-empty input
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
       10. UTILITIES & TELEMETRY
       ========================================================================== */

    formatMarkdown: function(text) {
      if (!text) return '';
      let out = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

      return out.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    },

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
          if (intent.type === 'open_cart') self.openCartSheet();
          if (intent.type === 'checkout') self.redirectToCheckout();
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
