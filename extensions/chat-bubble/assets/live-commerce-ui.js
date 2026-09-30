/**
 * LiveCommerce UI Rendering Layer
 * Storefront AI Shopping Concierge
 *
 * Dedicated UI presentation module:
 *  - Category & Collection Carousel (Edge-to-edge welcome experience)
 *  - Vertical 4-Product Stack with dynamic "Show [N] more" card
 *  - Rich product cards with discount badges, sale/compare prices, and white pill add-to-cart
 *  - In-stream Variant Picker and Cart Confirmation
 *  - Contextual Suggestion Chips & Action Feedback (Copy, Thumbs Up, Thumbs Down)
 *  - Slide-up Sheets for Product Detail & Cart Review
 *  - Markdown table extraction and safe HTML formatting
 */
(function() {
  'use strict';

  const LiveCommerceUI = {
    /**
     * Markdown text formatter for assistant replies.
     */
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

    /**
     * Parses markdown product tables (e.g. comparison tables or catalog rows)
     * and transposes/extracts them into structured product objects.
     */
    extractProductsFromMarkdown: function(text, normalizeProductFn) {
      if (!text || typeof text !== 'string') return { cleanedText: text || '', products: [] };
      const products = [];

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

        if (hasPipes || (currentTable.length > 0 && (trimmed.startsWith('!') || /^Quantity:\s*\d+/i.test(trimmed) || /^Variant ID:/i.test(trimmed) || /^\$[\d,.]+/i.test(trimmed)))) {
          currentTable.push(trimmed);
        } else {
          if (currentTable.length > 0) {
            tableBlocks.push([...currentTable]);
            currentTable = [];
          }
          if (!/^Variant ID:\s*`?gid:\/\/shopify/i.test(trimmed) && !/^Quantity:\s*\d+/i.test(trimmed)) {
            nonTableLines.push(line);
          }
        }
      }
      if (currentTable.length > 0) {
        tableBlocks.push(currentTable);
      }

      for (const block of tableBlocks) {
        const matrix = [];
        for (const rawRow of block) {
          if (/^\|?(\s*:?-+:?\s*\|)+\s*$/.test(rawRow)) continue;
          if (!rawRow.includes('|')) {
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
        const genericWords = /^(product|preview|image|title|price|details?|actions?|buy|link|item|best for|sizes?|scent)$/i;
        const isTransposed = numCols > 1 && headerRow.some(h => h.length > 3 && !genericWords.test(h));

        if (isTransposed) {
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

              const imgMatch = cell.match(/<img[^>]+src=["']([^"']+)["']/i) || cell.match(/!\[([^\]]*)\]\(([^)]+)\)/) || cell.match(/(https?:\/\/[^\s\)\|\"'>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s\)\|\"'>]*)?)/i);
              if (imgMatch) {
                const src = imgMatch[1] || imgMatch[2];
                if (src && !media.includes(src)) media.push(src);
              }

              const pMatch = cell.match(/(\$[\d,.]+(?:\s*[-–]\s*\$?[\d,.]+)?(?:\s*[A-Z]{3})?)/i);
              if (pMatch && !priceLabel) {
                priceLabel = pMatch[1].trim();
              }

              const vMatch = cell.match(/gid:\/\/shopify\/ProductVariant\/(\d+)/i) || cell.match(/ID:\s*`?([0-9]+)/i);
              if (vMatch) {
                variantId = vMatch[1];
              }

              if (!cell.startsWith('$') && !cell.startsWith('!') && !cell.includes('http') && cell.length > 15 && cell !== title) {
                description = description ? `${description} · ${cell}` : cell;
              }
            }

            const rawProd = {
              id: variantId || `p-col-${c}`,
              title,
              image: media[0] || null,
              images: media,
              price_display: priceLabel || null,
              description: description || null,
              variants: variantId ? [{ id: variantId, label: title, priceLabel, options: {} }] : []
            };
            products.push(normalizeProductFn ? normalizeProductFn(rawProd, products.length) : rawProd);
          }
        } else {
          for (let r = 0; r < matrix.length; r++) {
            const row = matrix[r];
            const fullRowText = row.join(' | ');

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
                const rawProd = {
                  id: variantId || `p-cart-0`,
                  title,
                  price_display: priceLabel || null,
                  variants: variantId ? [{ id: variantId, label: title, priceLabel, options: {} }] : []
                };
                products.push(normalizeProductFn ? normalizeProductFn(rawProd, 0) : rawProd);
                break;
              }
            }

            if (r === 0 && row.some(c => genericWords.test(c))) {
              continue;
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
              const rawProd = {
                id: variantId || `p-row-${r}`,
                title: title || 'Store Product',
                image: media[0] || null,
                images: media,
                price_display: priceLabel || null,
                description: description || null,
                variants: variantId ? [{ id: variantId, label: title, priceLabel, options: {} }] : []
              };
              products.push(normalizeProductFn ? normalizeProductFn(rawProd, products.length) : rawProd);
            }
          }
        }
      }

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
    },

    /**
     * User message bubble
     */
    appendUserMessage: function(container, text) {
      if (!container) return;
      const el = document.createElement('div');
      el.className = 'shop-ai-message user';
      el.textContent = text;
      container.appendChild(el);
    },

    /**
     * Typing indicator
     */
    showTypingIndicator: function(container) {
      this.removeTypingIndicator();
      if (!container) return;
      const ind = document.createElement('div');
      ind.className = 'shop-ai-typing-indicator';
      ind.id = 'shop-ai-typing';
      ind.innerHTML = '<span></span><span></span><span></span>';
      container.appendChild(ind);
    },

    removeTypingIndicator: function() {
      const ind = document.getElementById('shop-ai-typing');
      if (ind) ind.remove();
    },

    /**
     * Welcome screen with Category/Collection Carousel
     */
    renderWelcomeScreen: function(container, options = {}) {
      if (!container) return;
      container.innerHTML = '';

      const wrap = document.createElement('div');
      wrap.className = 'shop-ai-welcome-card';

      const storeName = options.storeName || window.shopInitialData?.shopName || 'Store';

      const heading = document.createElement('h3');
      heading.className = 'shop-ai-welcome-title';
      heading.textContent = `Welcome to ${storeName} 👋`;
      wrap.appendChild(heading);

      const sub = document.createElement('p');
      sub.className = 'shop-ai-welcome-sub';
      sub.textContent = 'Ask me anything you are interested in.';
      wrap.appendChild(sub);

      const collections = options.collections || [];
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

          card.addEventListener('click', () => {
            if (typeof options.onCollectionClick === 'function') {
              options.onCollectionClick(col);
            }
          });

          shelf.appendChild(card);
        });

        shelfWrap.appendChild(shelf);

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

    /**
     * Creates a single vertical product card
     */
    createProductCard: function(product, callbacks = {}) {
      const card = document.createElement('div');
      card.className = 'shop-ai-product-card';

      const topRow = document.createElement('div');
      topRow.className = 'shop-ai-product-top-row';

      // Thumbnail
      const thumb = document.createElement('div');
      thumb.className = 'shop-ai-product-thumbnail';
      thumb.style.position = 'relative';

      const badgeText = product.badge || (product.compareLabel ? 'SALE' : null);
      if (badgeText) {
        const badge = document.createElement('span');
        badge.className = `shop-ai-lc-badge ${String(badgeText).toLowerCase() === 'sale' ? 'sale' : 'new'}`;
        badge.textContent = badgeText;
        thumb.appendChild(badge);
      }

      const imgSrc = (product.media && product.media[0]) || product.image || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = product.title || '';
      img.loading = 'lazy';
      thumb.appendChild(img);

      thumb.addEventListener('click', () => {
        if (typeof callbacks.onClick === 'function') callbacks.onClick(product);
      });
      topRow.appendChild(thumb);

      // Meta
      const meta = document.createElement('div');
      meta.className = 'shop-ai-product-meta';

      let discountText = null;
      let isDiscounted = false;

      if (product.badge && /%|off|save|sale/i.test(product.badge)) {
        discountText = product.badge;
        isDiscounted = true;
      }

      if (product.compareLabel && product.priceLabel) {
        const curNum = parseFloat(String(product.priceLabel).replace(/[^0-9.]/g, ''));
        const cmpNum = parseFloat(String(product.compareLabel).replace(/[^0-9.]/g, ''));
        if (cmpNum && curNum && cmpNum > curNum) {
          const pct = Math.round(((cmpNum - curNum) / cmpNum) * 100);
          if (pct > 0) {
            discountText = `${pct}% off`;
            isDiscounted = true;
          }
        }
      }

      if (isDiscounted && discountText) {
        const discountBadge = document.createElement('span');
        discountBadge.className = 'shop-ai-product-discount-badge';
        discountBadge.textContent = discountText;
        meta.appendChild(discountBadge);
      }

      const titleLink = document.createElement('a');
      titleLink.className = 'shop-ai-product-title-link';
      titleLink.textContent = product.title || 'Product';
      titleLink.href = product.url || '#';
      titleLink.addEventListener('click', (e) => {
        if (!product.url || product.url === '#') {
          e.preventDefault();
          if (typeof callbacks.onClick === 'function') callbacks.onClick(product);
        }
      });
      meta.appendChild(titleLink);

      const price = document.createElement('div');
      price.className = 'shop-ai-product-price';
      if (isDiscounted && product.compareLabel) {
        price.innerHTML = `
          <span class="shop-ai-product-sale-price">${product.priceLabel}</span>
          <s class="shop-ai-product-compare-price">${product.compareLabel}</s>
          ${discountText ? `<span class="shop-ai-product-discount-label">· ${discountText}</span>` : ''}
        `;
      } else {
        price.innerHTML = `<span class="shop-ai-product-regular-price">${product.priceLabel || '—'}</span>`;
      }
      meta.appendChild(price);

      // Add to cart pill
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

      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof callbacks.onAdd === 'function') callbacks.onAdd(product, addBtn);
      });

      meta.appendChild(addBtn);
      topRow.appendChild(meta);
      card.appendChild(topRow);

      if (product.description) {
        const desc = document.createElement('p');
        desc.className = 'shop-ai-product-description';
        desc.textContent = product.description;
        card.appendChild(desc);
      }

      return card;
    },

    /**
     * Renders 4 products edge-to-edge down the chat stream + "Show [N] more" card
     */
    renderVerticalProductStack: function(allProducts, container, options = {}) {
      if (!allProducts || allProducts.length === 0 || !container) return;

      const section = document.createElement('div');
      section.className = 'shop-ai-products-section';

      const categoryTitle = options.categoryTitle || '';
      if (categoryTitle) {
        const heading = document.createElement('div');
        heading.className = 'shop-ai-products-heading';
        heading.textContent = categoryTitle;
        section.appendChild(heading);
      }

      const pageSize = 4;
      let currentIndex = 0;

      const renderBatch = () => {
        const nextBatch = allProducts.slice(currentIndex, currentIndex + pageSize);
        nextBatch.forEach(p => {
          const card = this.createProductCard(p, {
            onAdd: options.onAdd,
            onClick: options.onClick
          });
          section.appendChild(card);
        });
        currentIndex += nextBatch.length;

        const oldMore = section.querySelector('.shop-ai-show-more-card');
        if (oldMore) oldMore.remove();

        const remaining = allProducts.length - currentIndex;
        if (remaining > 0) {
          const moreCard = document.createElement('div');
          moreCard.className = 'shop-ai-show-more-card';
          moreCard.setAttribute('role', 'button');
          moreCard.setAttribute('tabindex', '0');

          const moreLabel = categoryTitle ? `more ${categoryTitle}` : 'more products';
          moreCard.innerHTML = `
            <div class="shop-ai-show-more-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <span class="shop-ai-show-more-text">Show ${remaining} ${moreLabel}</span>
          `;
          moreCard.addEventListener('click', () => {
            renderBatch();
            if (typeof options.onScrollNeeded === 'function') options.onScrollNeeded();
          });
          section.appendChild(moreCard);
        }
      };

      renderBatch();
      container.appendChild(section);
    },

    /**
     * Suggestion chips
     */
    renderSuggestionChips: function(chips, container, onChipClick) {
      if (!chips || chips.length === 0 || !container) return;

      const chipsWrap = document.createElement('div');
      chipsWrap.className = 'shop-ai-suggestion-chips';

      chips.forEach(chipText => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'shop-ai-chip';
        chip.textContent = chipText;
        chip.addEventListener('click', () => {
          if (typeof onChipClick === 'function') onChipClick(chipText);
        });
        chipsWrap.appendChild(chip);
      });

      container.appendChild(chipsWrap);
    },

    /**
     * Message action icons: Copy, Thumbs Up, Thumbs Down
     */
    renderMessageActions: function(container, rawText, onFeedback) {
      if (!container) return;

      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'shop-ai-message-actions';

      // Copy
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
        const textToCopy = rawText || container.innerText;
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
        if (typeof onFeedback === 'function') onFeedback('thumb_up');
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
        if (typeof onFeedback === 'function') onFeedback('thumb_down');
      });
      actionsWrap.appendChild(thumbDownBtn);

      container.appendChild(actionsWrap);
    },

    /**
     * In-stream variant selector
     */
    renderInStreamVariantPicker: function(product, container, onConfirm) {
      if (!container || !product) return;

      const existing = container.querySelector('.shop-ai-lc-variant-card');
      if (existing) existing.remove();

      const picker = document.createElement('div');
      picker.className = 'shop-ai-lc-variant-card';

      const thumbSrc = product.media && product.media[0] ? product.media[0] : '';
      const header = document.createElement('div');
      header.className = 'shop-ai-lc-variant-header';
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
      if (product.variants && product.variants.length > 0) {
        selectedOptions = { ...(product.variants[0].options || {}) };
      }

      const updateSelectedPrice = () => {
        const keys = Object.keys(selectedOptions);
        if (keys.length > 0 && product.variants && product.variants.length > 0) {
          const matched = product.variants.find(v => keys.every(k => v.options && v.options[k] === selectedOptions[k]));
          if (matched && matched.priceLabel) {
            const priceEl = picker.querySelector('#shop-ai-picker-price');
            if (priceEl) priceEl.textContent = matched.priceLabel;
          }
        }
      };

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

      confirmBtn.addEventListener('click', () => {
        let chosenVariant = (product.variants && product.variants[0]) || null;
        const keys = Object.keys(selectedOptions);
        if (keys.length > 0 && product.variants && product.variants.length > 0) {
          const found = product.variants.find(v => keys.every(k => v.options && v.options[k] === selectedOptions[k]));
          if (found) chosenVariant = found;
        }

        if (typeof onConfirm === 'function') {
          onConfirm(product, chosenVariant, confirmBtn, picker);
        }
      });

      picker.appendChild(confirmBtn);
      container.appendChild(picker);
    },

    /**
     * In-stream cart addition confirmation banner
     */
    renderInStreamCartConfirm: function(product, variant, container, onCheckout, onBrowse) {
      if (!container || !product) return;

      const existing = container.querySelector('.shop-ai-lc-confirm-card');
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
      confirm.querySelector('.shop-ai-lc-btn-browse').addEventListener('click', () => {
        confirm.remove();
        if (typeof onBrowse === 'function') onBrowse();
      });
      confirm.querySelector('.shop-ai-lc-btn-checkout').addEventListener('click', () => {
        if (typeof onCheckout === 'function') onCheckout();
      });

      container.appendChild(confirm);
    },

    /**
     * Slide-up Product Detail Sheet
     */
    openDetailSheet: function(product, elements = {}, onAdd) {
      if (!product || !elements.detailSheet) return;

      if (elements.detailSheetSeller) elements.detailSheetSeller.textContent = product.seller || '';
      if (elements.detailSheetPrice) elements.detailSheetPrice.textContent = product.priceLabel || '—';

      const body = elements.detailSheetBody;
      if (body) {
        body.innerHTML = '';

        if (product.media && product.media.length > 0) {
          const mediaWrap = document.createElement('div');
          mediaWrap.className = 'shop-ai-sheet-media';
          const img = document.createElement('img');
          img.src = product.media[0];
          img.alt = product.title || '';
          mediaWrap.appendChild(img);
          body.appendChild(mediaWrap);
        }

        const title = document.createElement('h3');
        title.className = 'shop-ai-sheet-product-title';
        title.textContent = product.title || 'Product';
        body.appendChild(title);

        let selectedOptions = {};
        if (product.variants && product.variants.length > 0) {
          selectedOptions = { ...(product.variants[0].options || {}) };
        }

        if (product.options && product.options.length > 0) {
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
              chip.className = `shop-ai-option-chip ${selectedOptions[opt.label] === val.label ? 'selected' : ''}`;
              chip.textContent = val.label;
              chip.addEventListener('click', () => {
                selectedOptions[opt.label] = val.label;
                valsWrap.querySelectorAll('.shop-ai-option-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');

                if (product.variants && product.variants.length > 0) {
                  const matched = product.variants.find(v =>
                    Object.keys(selectedOptions).every(k => v.options && v.options[k] === selectedOptions[k])
                  );
                  if (matched && matched.priceLabel && elements.detailSheetPrice) {
                    elements.detailSheetPrice.textContent = matched.priceLabel;
                  }
                }
              });
              valsWrap.appendChild(chip);
            });

            group.appendChild(valsWrap);
            body.appendChild(group);
          });
        }

        if (product.description) {
          const desc = document.createElement('p');
          desc.className = 'shop-ai-product-description';
          desc.style.webkitLineClamp = 'none';
          desc.textContent = product.description;
          body.appendChild(desc);
        }
      }

      if (elements.detailSheetAddBtn) {
        elements.detailSheetAddBtn.onclick = () => {
          let chosenVariant = (product.variants && product.variants[0]) || null;
          if (product.variants && product.variants.length > 0) {
            const matched = product.variants.find(v =>
              Object.keys(selectedOptions || {}).every(k => v.options && v.options[k] === selectedOptions[k])
            );
            if (matched) chosenVariant = matched;
          }
          if (typeof onAdd === 'function') {
            onAdd(product, chosenVariant, elements.detailSheetAddBtn);
          }
        };
      }

      elements.detailSheet.style.display = 'flex';
    },

    closeDetailSheet: function(elements = {}) {
      if (elements.detailSheet) elements.detailSheet.style.display = 'none';
    },

    /**
     * Shopping Bag / Cart Review Sheet
     */
    renderCartSheetBody: function(cart, elements = {}, onQtyChange) {
      const body = elements.cartSheetBody;
      const subtotal = elements.cartSheetSubtotal;
      if (!body) return;

      body.innerHTML = '';
      if (!cart || !cart.lines || cart.lines.length === 0) {
        body.innerHTML = '<div style="text-align: center; padding: 32px 0; color: #9ca3af; font-size: 13px;">Your shopping bag is empty.</div>';
        if (subtotal) subtotal.textContent = '$0.00';
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
          img.alt = line.title || '';
          thumb.appendChild(img);
        }
        row.appendChild(thumb);

        const info = document.createElement('div');
        info.className = 'shop-ai-cart-line-info';

        const title = document.createElement('div');
        title.className = 'shop-ai-cart-line-title';
        title.textContent = line.title || 'Product';
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
          if (typeof onQtyChange === 'function') {
            onQtyChange(line.id, Math.max(0, (line.qty || 1) - 1));
          }
        });
        qtyControls.appendChild(minus);

        const count = document.createElement('span');
        count.style.fontSize = '12px';
        count.style.fontWeight = '700';
        count.style.minWidth = '16px';
        count.style.textAlign = 'center';
        count.textContent = line.qty || 1;
        qtyControls.appendChild(count);

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'shop-ai-qty-btn';
        plus.textContent = '+';
        plus.addEventListener('click', () => {
          if (typeof onQtyChange === 'function') {
            onQtyChange(line.id, (line.qty || 1) + 1);
          }
        });
        qtyControls.appendChild(plus);

        row.appendChild(qtyControls);
        body.appendChild(row);
      });

      if (subtotal) {
        const totalObj = (cart.totals || []).find(t => /total/i.test(t.label)) || (cart.totals || [])[0];
        subtotal.textContent = totalObj ? totalObj.display : '$0.00';
      }
    },

    openCartSheet: function(cart, elements = {}, callbacks = {}) {
      if (!elements.cartSheet) return;
      this.renderCartSheetBody(cart, elements, callbacks.onQtyChange);

      if (elements.cartSheetCheckoutBtn) {
        elements.cartSheetCheckoutBtn.onclick = () => {
          if (typeof callbacks.onCheckout === 'function') callbacks.onCheckout();
        };
      }
      elements.cartSheet.style.display = 'flex';
    },

    closeCartSheet: function(elements = {}) {
      if (elements.cartSheet) elements.cartSheet.style.display = 'none';
    }
  };

  // Expose globally
  window.LiveCommerceUI = LiveCommerceUI;
})();
