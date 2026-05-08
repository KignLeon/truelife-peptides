/* ================================================
   TRUE LIFE PEPTIDES — WooCommerce Service Layer
   js/woocommerce.js

   Fetches products + categories from the secure
   Vercel API proxy (/api/products, /api/categories).
   Falls back to static data if API is unavailable.

   Usage:
     TLP.products.load({ category: 'recovery-compound' })
     TLP.products.loadFeatured(4)
     TLP.categories.load()
   ================================================ */

(function (global) {
    'use strict';

    // Base API path — works for both local dev and Vercel production
    const API_BASE = '/api';

    // Static fallback products — shown if WooCommerce API is not configured
    const STATIC_PRODUCTS = [
        { id: 'static-1',  name: 'BAC Water',                  categories: [{ name: 'Reconstitution Solution', slug: 'reconstitution-solution' }], price: '', short_description: '10mL / vial', stock_status: 'instock', images: [] },
        { id: 'static-2',  name: 'GLP3-R',                     categories: [{ name: 'Metabolic Compound',        slug: 'metabolic-compound' }],         price: '', short_description: '10mg / 30mg / 50mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-3',  name: 'BPC 157',                    categories: [{ name: 'Recovery Compound',         slug: 'recovery-compound' }],          price: '', short_description: '5mg / 10mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-4',  name: 'TB 500',                     categories: [{ name: 'Growth Compound',           slug: 'growth-compound' }],            price: '', short_description: '5mg / 10mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-5',  name: 'CJC-1295 w/o DAC',           categories: [{ name: 'Growth Compound',           slug: 'growth-compound' }],            price: '', short_description: '5mg / vial', stock_status: 'instock', images: [] },
        { id: 'static-6',  name: 'CJC-1295 w DAC',             categories: [{ name: 'Growth Compound',           slug: 'growth-compound' }],            price: '', short_description: '5mg / vial', stock_status: 'instock', images: [] },
        { id: 'static-7',  name: 'CJC-1295 w/o DAC + Ipamorelin', categories: [{ name: 'Growth Compound',        slug: 'growth-compound' }],            price: '', short_description: '5mg+5mg / vial — Blend', stock_status: 'instock', images: [] },
        { id: 'static-8',  name: 'CJC-1295 w DAC + Ipamorelin',categories: [{ name: 'Growth Compound',           slug: 'growth-compound' }],            price: '', short_description: '5mg+5mg / vial — Blend', stock_status: 'instock', images: [] },
        { id: 'static-9',  name: 'Ipamorelin',                  categories: [{ name: 'Metabolic Compound',        slug: 'metabolic-compound' }],         price: '', short_description: '5mg / 10mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-10', name: 'Tesamorelin',                 categories: [{ name: 'Growth Compound',           slug: 'growth-compound' }],            price: '', short_description: '5mg / 10mg / 20mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-11', name: 'MOTS-C',                      categories: [{ name: 'Longevity Compound',        slug: 'longevity-compound' }],         price: '', short_description: '10mg / 20mg / 30mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-12', name: 'GHK-CU',                      categories: [{ name: 'Recovery Compound',        slug: 'recovery-compound' }],          price: '', short_description: '50mg / 100mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-13', name: 'Sermorelin Acetate',          categories: [{ name: 'Growth Compound',           slug: 'growth-compound' }],            price: '', short_description: '5mg / 10mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-14', name: 'NAD+',                        categories: [{ name: 'Antioxidant Compound',      slug: 'antioxidant-compound' }],       price: '', short_description: '100mg / 500mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-15', name: 'Tirzepatide (Tirz)',          categories: [{ name: 'Metabolic Compound',        slug: 'metabolic-compound' }],         price: '', short_description: '10mg / 20mg per vial', stock_status: 'instock', images: [] },
        { id: 'static-16', name: 'IGF-1 LR3',                  categories: [{ name: 'Growth Compound',           slug: 'growth-compound' }],            price: '', short_description: '1mg / vial', stock_status: 'instock', images: [] },
        { id: 'static-17', name: 'Selank',                      categories: [{ name: 'Nootropic Compound',        slug: 'nootropic-compound' }],         price: '', short_description: '10mg / vial', stock_status: 'instock', images: [] },
        { id: 'static-18', name: 'Semax',                       categories: [{ name: 'Nootropic Compound',        slug: 'nootropic-compound' }],         price: '', short_description: '10mg / vial', stock_status: 'instock', images: [] },
        { id: 'static-19', name: 'GLOW',                        categories: [{ name: 'Recovery Compound',         slug: 'recovery-compound' }],          price: '', short_description: '70mg / vial — Skin & Collagen Blend', stock_status: 'instock', images: [] },
        { id: 'static-20', name: 'KLOW',                        categories: [{ name: 'Recovery Compound',         slug: 'recovery-compound' }],          price: '', short_description: '80mg / vial — Keratin Blend', stock_status: 'instock', images: [] },
    ];

    // ─────────────────────────────────────────────────────
    //  PRODUCT CARD RENDERER
    // ─────────────────────────────────────────────────────

    function renderProductCard(product) {
        const cat = (product.categories && product.categories[0]) || {};
        const catName = cat.name || '';
        const image = (product.images && product.images[0]);
        const hasImage = image && image.src;
        const price = product.price ? `$${parseFloat(product.price).toFixed(2)}` : '';
        const priceDisplay = price || product.short_description || 'Contact for pricing';
        const isStatic = typeof product.id === 'string' && product.id.startsWith('static-');
        const detailUrl = isStatic ? '../contact/' : `../products/${product.slug || product.id}/`;

        // Sanitize text to prevent XSS
        const safeName = escapeHtml(product.name || '');
        const safeCat = escapeHtml(catName);
        const safePrice = escapeHtml(priceDisplay);

        const imgHtml = hasImage
            ? `<img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || product.name)}" loading="lazy" style="width:100%;height:160px;object-fit:cover;border-radius:10px 10px 0 0;">`
            : `<div class="product-img-placeholder" aria-hidden="true">
                <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
                  <rect width="80" height="80" rx="12" fill="rgba(21,101,192,0.05)"/>
                  <path d="M20 56 L32 38 L44 50 L52 40 L64 56 Z" fill="rgba(21,101,192,0.12)" stroke="rgba(21,101,192,0.2)" stroke-width="1.5" stroke-linejoin="round"/>
                  <circle cx="30" cy="32" r="5" fill="rgba(21,101,192,0.15)" stroke="rgba(21,101,192,0.25)" stroke-width="1.5"/>
                  <path d="M38 24 Q42 20 46 24 Q50 28 46 32 Q42 36 38 32 Q34 28 38 24Z" fill="none" stroke="rgba(21,101,192,0.25)" stroke-width="1.5"/>
                  <path d="M52 18 L56 28 M52 28 L56 18" stroke="rgba(21,101,192,0.2)" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </div>`;

        return `
            <div class="product-card-full" data-name="${safeName.toLowerCase()}" data-category="${safeCat}">
                ${imgHtml}
                <span class="product-card-category">${safeCat}</span>
                <span class="product-card-name" style="font-size:18px;margin:4px 0;">${safeName}</span>
                <span class="product-card-price" style="font-size:13px;color:rgba(15,29,58,0.5);">${safePrice}</span>
                <a href="../contact/?product=${encodeURIComponent(product.name || '')}" class="btn-primary" style="font-size:12px;padding:8px 16px;margin:8px 0;">
                    Inquire
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
            </div>`;
    }

    function renderSkeletonCards(count) {
        return Array.from({ length: count }, () => `
            <div class="product-card-full" style="pointer-events:none;">
                <div style="width:100%;height:160px;background:linear-gradient(90deg,rgba(21,101,192,0.04) 25%,rgba(21,101,192,0.08) 37%,rgba(21,101,192,0.04) 63%);background-size:400px 100%;animation:skeleton-shimmer 1.4s ease infinite;border-radius:10px 10px 0 0;"></div>
                <div style="width:60%;height:11px;background:rgba(15,29,58,0.06);border-radius:6px;margin:16px 0 8px;animation:skeleton-shimmer 1.4s ease infinite;"></div>
                <div style="width:85%;height:18px;background:rgba(15,29,58,0.08);border-radius:6px;margin-bottom:8px;animation:skeleton-shimmer 1.4s ease infinite;"></div>
                <div style="width:45%;height:12px;background:rgba(15,29,58,0.05);border-radius:6px;margin-bottom:12px;animation:skeleton-shimmer 1.4s ease infinite;"></div>
            </div>`).join('');
    }

    // ─────────────────────────────────────────────────────
    //  PRODUCTS SERVICE
    // ─────────────────────────────────────────────────────

    const products = {
        _cache: null,
        _cacheTime: 0,
        _TTL: 5 * 60 * 1000, // 5-minute client cache

        async load(opts = {}) {
            // Check client cache
            const now = Date.now();
            if (this._cache && (now - this._cacheTime) < this._TTL) {
                return this._cache;
            }

            try {
                const params = new URLSearchParams();
                if (opts.category)  params.set('category', opts.category);
                if (opts.featured)  params.set('featured', 'true');
                if (opts.per_page)  params.set('per_page', opts.per_page);
                if (opts.page)      params.set('page', opts.page);
                if (opts.search)    params.set('search', opts.search);

                const url = `${API_BASE}/products${params.toString() ? '?' + params.toString() : ''}`;
                const res = await fetch(url, {
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(10000),
                });

                if (!res.ok) throw new Error(`API ${res.status}`);

                const data = await res.json();
                this._cache = data;
                this._cacheTime = now;
                return data;

            } catch (err) {
                console.warn('[TLP WooCommerce] API unavailable, using static fallback:', err.message);
                return STATIC_PRODUCTS;
            }
        },

        async loadFeatured(count = 4) {
            try {
                const data = await this.load({ featured: true, per_page: count });
                // Fallback to first N static products if API returns fewer than expected
                if (!data || data.length === 0) {
                    return STATIC_PRODUCTS.slice(0, count);
                }
                return data.slice(0, count);
            } catch {
                return STATIC_PRODUCTS.slice(0, count);
            }
        },

        /**
         * Render products into a container element.
         * Handles loading state, empty state, and error state.
         */
        async renderInto(container, opts = {}) {
            if (!container) return;

            // Show skeleton while loading
            container.innerHTML = renderSkeletonCards(opts.skeletonCount || 6);

            const data = await this.load(opts);

            if (!data || data.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:64px 20px;grid-column:1/-1;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(15,29,58,0.25)" stroke-width="1.5" width="48" height="48" style="margin:0 auto 16px;display:block;"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <p style="font-size:15px;color:rgba(15,29,58,0.4);">No products found.</p>
                    </div>`;
                return;
            }

            container.innerHTML = data.map(renderProductCard).join('');
            return data;
        },
    };

    // ─────────────────────────────────────────────────────
    //  CATEGORIES SERVICE
    // ─────────────────────────────────────────────────────

    const categories = {
        _cache: null,
        _cacheTime: 0,
        _TTL: 15 * 60 * 1000, // 15-minute client cache

        async load() {
            const now = Date.now();
            if (this._cache && (now - this._cacheTime) < this._TTL) {
                return this._cache;
            }

            try {
                const res = await fetch(`${API_BASE}/categories`, {
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(6000),
                });
                if (!res.ok) throw new Error(`API ${res.status}`);
                const data = await res.json();
                this._cache = data;
                this._cacheTime = now;
                return data;
            } catch (err) {
                console.warn('[TLP WooCommerce] Categories API unavailable:', err.message);
                // Return static category list as fallback
                return [
                    { id: 1, name: 'Recovery Compound',       slug: 'recovery-compound',       count: 4 },
                    { id: 2, name: 'Growth Compound',          slug: 'growth-compound',          count: 6 },
                    { id: 3, name: 'Metabolic Compound',       slug: 'metabolic-compound',       count: 3 },
                    { id: 4, name: 'Longevity Compound',       slug: 'longevity-compound',       count: 2 },
                    { id: 5, name: 'Antioxidant Compound',     slug: 'antioxidant-compound',     count: 1 },
                    { id: 6, name: 'Nootropic Compound',       slug: 'nootropic-compound',       count: 2 },
                    { id: 7, name: 'Reconstitution Solution',  slug: 'reconstitution-solution',  count: 1 },
                ];
            }
        },
    };

    // ─────────────────────────────────────────────────────
    //  UTILITY
    // ─────────────────────────────────────────────────────

    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Inject skeleton shimmer keyframe once
    if (!document.getElementById('tlp-skeleton-style')) {
        const style = document.createElement('style');
        style.id = 'tlp-skeleton-style';
        style.textContent = `
            @keyframes skeleton-shimmer {
                0%   { background-position: -400px 0; }
                100% { background-position: 400px 0; }
            }
            .product-img-placeholder {
                width:100%;
                height:160px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:rgba(21,101,192,0.03);
                border-radius:10px 10px 0 0;
                border-bottom:1px solid rgba(21,101,192,0.08);
            }
        `;
        document.head.appendChild(style);
    }

    // ─────────────────────────────────────────────────────
    //  GLOBAL NAMESPACE
    // ─────────────────────────────────────────────────────

    global.TLP = global.TLP || {};
    global.TLP.products = products;
    global.TLP.categories = categories;
    global.TLP._renderProductCard = renderProductCard;

})(window);
