/* ================================================
   TRUE LIFE PEPTIDES — Production Analytics Layer
   Consent-gated · Debounced · DEV-mode logging
   ================================================ */

(function () {
    'use strict';

    /* ========================
       CONFIG
       ======================== */
    const TLP_ANALYTICS = {
        GA4_ID: 'G-XXXXXXXXXX',       // REPLACE with real GA4 Measurement ID
        CONSENT_KEY: 'tlp_analytics_consent',
        DEV_KEY: 'tlp_dev',
        VERSION: '1.0.0',
        SCROLL_THRESHOLDS: [25, 50, 75, 100],
        DEBOUNCE_MS: 300,
        VITALS_SAMPLE_RATE: 1.0        // 1.0 = 100% of visitors
    };

    /* ========================
       HELPERS
       ======================== */
    const isDev = () => localStorage.getItem(TLP_ANALYTICS.DEV_KEY) === '1';
    const hasConsent = () => localStorage.getItem(TLP_ANALYTICS.CONSENT_KEY) === '1';

    const log = (...args) => {
        if (isDev()) console.log('%c[TLP Analytics]', 'color:#1976D2;font-weight:bold', ...args);
    };

    // Debounce utility
    const debounce = (fn, ms) => {
        let t;
        return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
    };

    // Prevent duplicate events within a session
    const firedEvents = new Set();
    const oncePerSession = (key) => {
        if (firedEvents.has(key)) return false;
        firedEvents.add(key);
        return true;
    };

    /* ========================
       CORE: Send event
       ======================== */
    function sendEvent(name, params = {}) {
        params.tlp_version = TLP_ANALYTICS.VERSION;
        params.page_path = window.location.pathname;
        params.page_title = document.title;

        log(`📊 Event: ${name}`, params);

        // Only send to GA4 if consent given and gtag exists
        if (hasConsent() && typeof window.gtag === 'function') {
            window.gtag('event', name, params);
        }
    }

    /* ========================
       SCROLL DEPTH TRACKING
       ======================== */
    function initScrollTracking() {
        const reached = new Set();
        const handler = debounce(() => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (docHeight <= 0) return;
            const percent = Math.round((scrollTop / docHeight) * 100);

            TLP_ANALYTICS.SCROLL_THRESHOLDS.forEach(threshold => {
                if (percent >= threshold && !reached.has(threshold)) {
                    reached.add(threshold);
                    sendEvent('scroll_depth', { percent_scrolled: threshold });
                }
            });
        }, 200);

        window.addEventListener('scroll', handler, { passive: true });
        log('✅ Scroll tracking initialized');
    }

    /* ========================
       CTA CLICK TRACKING
       ======================== */
    function initCTATracking() {
        document.addEventListener('click', (e) => {
            // Primary buttons
            const btn = e.target.closest('.btn-primary, .btn-ghost, .navbar-cta');
            if (btn) {
                sendEvent('cta_click', {
                    cta_text: btn.textContent.trim().substring(0, 50),
                    cta_url: btn.href || '',
                    cta_class: btn.className
                });
            }

            // Phone clicks
            const telLink = e.target.closest('a[href^="tel:"]');
            if (telLink) {
                sendEvent('phone_click', {
                    phone_number: telLink.href.replace('tel:', '')
                });
            }

            // Email clicks
            const mailLink = e.target.closest('a[href^="mailto:"]');
            if (mailLink) {
                sendEvent('email_click', {
                    email_address: mailLink.href.replace('mailto:', '')
                });
            }

            // Product card clicks
            const productCard = e.target.closest('.product-card, .product-card-full');
            if (productCard) {
                const name = productCard.querySelector('.product-card-name')?.textContent?.trim()
                    || productCard.dataset.name || 'Unknown';
                const category = productCard.querySelector('.product-card-category')?.textContent?.trim()
                    || productCard.dataset.category || '';
                const price = productCard.querySelector('.product-card-price')?.textContent?.trim() || '';
                sendEvent('product_click', {
                    product_name: name,
                    product_category: category,
                    product_price: price
                });
            }

            // Blog card clicks
            const blogCard = e.target.closest('.blog-card');
            if (blogCard) {
                const title = blogCard.querySelector('.blog-card-title')?.textContent?.trim() || 'Unknown';
                sendEvent('blog_card_click', { article_title: title });
            }

            // FAQ clicks
            const faqQ = e.target.closest('.faq-question');
            if (faqQ) {
                sendEvent('faq_open', {
                    question_text: faqQ.textContent.trim().substring(0, 80)
                });
            }
        });
        log('✅ CTA + click tracking initialized');
    }

    /* ========================
       PRODUCT SEARCH TRACKING
       ======================== */
    function initSearchTracking() {
        const searchInput = document.getElementById('productSearch');
        if (!searchInput) return;

        const handler = debounce(() => {
            const query = searchInput.value.trim();
            if (query.length < 2) return;
            const grid = document.getElementById('productsGrid');
            const visible = grid ? grid.querySelectorAll('.product-card-full:not([style*="display: none"])').length : 0;
            sendEvent('search_query', {
                search_term: query.substring(0, 100),
                results_count: visible
            });
        }, TLP_ANALYTICS.DEBOUNCE_MS);

        searchInput.addEventListener('input', handler);
        log('✅ Search tracking initialized');
    }

    /* ========================
       FILTER TRACKING
       ======================== */
    function initFilterTracking() {
        document.querySelectorAll('.page-sidebar-links a[data-filter]').forEach(link => {
            link.addEventListener('click', () => {
                sendEvent('filter_use', {
                    filter_value: link.dataset.filter || link.textContent.trim()
                });
            });
        });
    }

    /* ========================
       POPUP TRACKING
       ======================== */
    function initPopupTracking() {
        // Welcome popup
        const popupOverlay = document.getElementById('ppPopupOverlay');
        if (popupOverlay) {
            const obs = new MutationObserver(() => {
                if (popupOverlay.classList.contains('active') && oncePerSession('popup_shown')) {
                    sendEvent('popup_shown', { popup_type: 'welcome_10_off' });
                }
            });
            obs.observe(popupOverlay, { attributes: true, attributeFilter: ['class'] });

            // Popup CTA click
            const popupCTA = popupOverlay.querySelector('.btn-primary');
            if (popupCTA) {
                popupCTA.addEventListener('click', () => {
                    sendEvent('popup_cta_click', { popup_cta_text: popupCTA.textContent.trim() });
                });
            }
        }

        // Banner dismiss
        const bannerClose = document.getElementById('bannerClose');
        if (bannerClose) {
            bannerClose.addEventListener('click', () => {
                sendEvent('banner_dismiss', { banner_text: 'upgrade_banner' });
            });
        }
    }

    /* ========================
       ERROR MONITORING
       ======================== */
    function initErrorMonitoring() {
        // JS errors
        window.addEventListener('error', (e) => {
            if (e.filename) {
                sendEvent('error_js', {
                    message: (e.message || '').substring(0, 200),
                    source: e.filename,
                    line: e.lineno,
                    col: e.colno
                });
            }

            // Image load errors
            if (e.target && e.target.tagName === 'IMG') {
                sendEvent('error_image', {
                    src: (e.target.src || '').substring(0, 200),
                    alt: e.target.alt || ''
                });
            }
        }, true); // Capture phase for resource errors

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            sendEvent('error_js', {
                message: ('Promise: ' + (e.reason?.message || e.reason || '')).substring(0, 200),
                source: 'unhandledrejection'
            });
        });

        log('✅ Error monitoring initialized');
    }

    /* ========================
       WEB VITALS (LCP, CLS)
       ======================== */
    function initWebVitals() {
        if (Math.random() > TLP_ANALYTICS.VITALS_SAMPLE_RATE) return;

        // LCP
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry && oncePerSession('web_vital_lcp')) {
                    sendEvent('web_vitals', {
                        metric_name: 'LCP',
                        metric_value: Math.round(lastEntry.startTime),
                        metric_unit: 'ms'
                    });
                }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) { /* Observer not supported */ }

        // CLS
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });

            // Report CLS on page hide
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && oncePerSession('web_vital_cls')) {
                    sendEvent('web_vitals', {
                        metric_name: 'CLS',
                        metric_value: Math.round(clsValue * 1000) / 1000,
                        metric_unit: 'score'
                    });
                }
            });
        } catch (e) { /* Observer not supported */ }

        // Page load time
        window.addEventListener('load', () => {
            setTimeout(() => {
                const nav = performance.getEntriesByType('navigation')[0];
                if (nav && oncePerSession('page_load_time')) {
                    sendEvent('web_vitals', {
                        metric_name: 'page_load',
                        metric_value: Math.round(nav.loadEventEnd - nav.startTime),
                        metric_unit: 'ms'
                    });
                }
            }, 100);
        });

        log('✅ Web Vitals tracking initialized');
    }

    /* ========================
       INITIALIZE
       ======================== */
    function init() {
        log(`🚀 Analytics v${TLP_ANALYTICS.VERSION} | Consent: ${hasConsent()} | DEV: ${isDev()}`);

        initScrollTracking();
        initCTATracking();
        initSearchTracking();
        initFilterTracking();
        initPopupTracking();
        initErrorMonitoring();
        initWebVitals();

        log('✅ All tracking modules initialized');
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose consent setter for cookie consent banner
    window.TLP_Analytics = {
        grantConsent: () => {
            localStorage.setItem(TLP_ANALYTICS.CONSENT_KEY, '1');
            log('✅ Consent granted — analytics active');
            // Initialize GA4 if not already done
            if (typeof window.gtag === 'function') {
                window.gtag('consent', 'update', {
                    analytics_storage: 'granted'
                });
            }
        },
        revokeConsent: () => {
            localStorage.removeItem(TLP_ANALYTICS.CONSENT_KEY);
            log('🚫 Consent revoked — analytics paused');
        },
        isConsented: hasConsent,
        enableDev: () => { localStorage.setItem(TLP_ANALYTICS.DEV_KEY, '1'); log('DEV mode ON'); },
        disableDev: () => { localStorage.removeItem(TLP_ANALYTICS.DEV_KEY); }
    };

})();
