/* ================================================
   TRUE LIFE PEPTIDES — JS Interactions
   Mobile menu, scroll reveal, FAQ, product search/filter,
   upgrade banner, welcome popup
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ========================
       UPGRADE BANNER CLOSE
       ======================== */
    const bannerClose = document.getElementById('bannerClose');
    const upgradeBanner = document.getElementById('upgradeBanner');
    if (bannerClose && upgradeBanner) {
        // Check if already dismissed this session
        if (sessionStorage.getItem('tlp_banner_dismissed')) {
            upgradeBanner.classList.add('hidden');
        }
        bannerClose.addEventListener('click', () => {
            upgradeBanner.classList.add('hidden');
            sessionStorage.setItem('tlp_banner_dismissed', '1');
        });
    }

    /* ========================
       MOBILE MENU
       ======================== */
    const menuToggle = document.getElementById('menuToggle');
    const mobileNav = document.getElementById('mobileNav');

    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('open');
            mobileNav.classList.toggle('open');
            document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
        });

        // Close on link click
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('open');
                mobileNav.classList.remove('open');
                document.body.style.overflow = '';
            });
        });

        // Safety unlock: if user navigates away while nav is open, release scroll lock
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' || !document.hidden) {
                mobileNav.classList.remove('open');
                menuToggle.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    /* ========================
       SCROLL REVEAL
       ======================== */
    const revealElements = document.querySelectorAll('.reveal, .reveal-stagger');
    if (revealElements.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        revealElements.forEach(el => observer.observe(el));
    }

    /* ========================
       FAQ ACCORDION
       ======================== */
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('open');
                // Close all
                faqItems.forEach(i => i.classList.remove('open'));
                // Toggle clicked
                if (!isOpen) item.classList.add('open');
            });
        }
    });

    /* ========================
       PRODUCT SEARCH (Products page)
       ======================== */
    const searchInput = document.getElementById('productSearch');
    const productsGrid = document.getElementById('productsGrid');

    if (searchInput && productsGrid) {
        const cards = productsGrid.querySelectorAll('.product-card-full');

        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            cards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const category = (card.dataset.category || '').toLowerCase();
                const match = name.includes(query) || category.includes(query);
                card.style.display = match ? '' : 'none';
            });
        });
    }

    /* ========================
       SIDEBAR FILTER (Products page — Category-based)
       ======================== */
    const sidebarLinks = document.querySelectorAll('.page-sidebar-links a[data-filter]');
    if (sidebarLinks.length > 0 && productsGrid) {
        const cards = productsGrid.querySelectorAll('.product-card-full');

        function filterByCategory(filter) {
            // Update active state
            sidebarLinks.forEach(l => l.classList.remove('active'));
            const activeLink = document.querySelector(`.page-sidebar-links a[data-filter="${filter}"]`);
            if (activeLink) activeLink.classList.add('active');

            // Filter cards
            cards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = '';
                } else {
                    const category = card.dataset.category || '';
                    card.style.display = category === filter ? '' : 'none';
                }
            });

            // Clear search
            if (searchInput) searchInput.value = '';
        }

        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = link.dataset.filter;
                filterByCategory(filter);
                // Update URL hash
                if (filter !== 'all') {
                    const slug = filter.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
                    history.replaceState(null, '', '#' + slug);
                } else {
                    history.replaceState(null, '', window.location.pathname);
                }
            });
        });

        // Check URL hash on load for deep-linking
        const hash = decodeURIComponent(window.location.hash.slice(1));
        if (hash) {
            // Map both clean slugs and raw category names to filter values
            const hashMap = {
                'recovery': 'Recovery Compound',
                'recovery-compound': 'Recovery Compound',
                'Recovery Compound': 'Recovery Compound',
                'growth': 'Growth Compound',
                'growth-compound': 'Growth Compound',
                'Growth Compound': 'Growth Compound',
                'metabolic': 'Metabolic Compound',
                'metabolic-compound': 'Metabolic Compound',
                'Metabolic Compound': 'Metabolic Compound',
                'longevity': 'Longevity Compound',
                'longevity-compound': 'Longevity Compound',
                'Longevity Compound': 'Longevity Compound',
                'antioxidant': 'Antioxidant Compound',
                'antioxidant-compound': 'Antioxidant Compound',
                'Antioxidant Compound': 'Antioxidant Compound',
                'nootropic': 'Nootropic Compound',
                'nootropic-compound': 'Nootropic Compound',
                'Nootropic Compound': 'Nootropic Compound',
                'reconstitution': 'Reconstitution Solution',
                'reconstitution-solution': 'Reconstitution Solution',
                'Reconstitution Solution': 'Reconstitution Solution'
            };
            if (hashMap[hash]) {
                filterByCategory(hashMap[hash]);
            }
        }

        // Navbar dropdown links (on products page, these have data-filter)
        const navDropdownLinks = document.querySelectorAll('.navbar-dropdown a[data-filter]');
        navDropdownLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = link.dataset.filter;
                filterByCategory(filter);
                const slug = filter.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
                history.replaceState(null, '', '#' + slug);
                // Scroll to products grid
                if (productsGrid) productsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    /* ========================
       NAVBAR SCROLL EFFECT
       ======================== */
    const navbar = document.querySelector('.navbar-inner');
    if (navbar) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const scroll = window.scrollY;
            if (scroll > 50) {
                navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)';
                navbar.style.background = 'rgba(255,255,255,0.85)';
            } else {
                navbar.style.boxShadow = '';
                navbar.style.background = '';
            }
            lastScroll = scroll;
        }, { passive: true });
    }

    /* ========================
       WELCOME POPUP (Home page only)
       Auto-shows after 5s, minimizes to pill
       ======================== */
    const popupOverlay = document.getElementById('ppPopupOverlay');
    const popupClose = document.getElementById('ppPopupClose');
    const popupMini = document.getElementById('ppPopupMini');

    if (popupOverlay && popupClose && popupMini) {
        // Show popup after 5 seconds (only once per session)
        if (!sessionStorage.getItem('pp_popup_shown')) {
            setTimeout(() => {
                popupOverlay.classList.add('active');
                sessionStorage.setItem('pp_popup_shown', '1');
            }, 5000);
        } else {
            // If already shown this session, show the mini button
            popupMini.classList.add('visible');
        }

        // Close popup → show mini button
        popupClose.addEventListener('click', () => {
            popupOverlay.classList.remove('active');
            setTimeout(() => {
                popupMini.classList.add('visible');
            }, 300);
        });

        // Click overlay background to close
        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                popupOverlay.classList.remove('active');
                setTimeout(() => {
                    popupMini.classList.add('visible');
                }, 300);
            }
        });

        // Mini button → re-open popup
        popupMini.addEventListener('click', () => {
            popupMini.classList.remove('visible');
            popupOverlay.classList.add('active');
        });
    }

    /* ========================
       COOKIE CONSENT BANNER
       ======================== */
    const COOKIE_CONSENT_KEY = 'tlp_cookie_consent';
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) {
        const banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.id = 'cookieBanner';
        banner.innerHTML = `
            <p>We use cookies to analyze site traffic and improve your experience. No personal data is sold.</p>
            <div class="cookie-banner-actions">
                <button class="cookie-btn cookie-btn-accept" id="cookieAccept">Accept</button>
                <button class="cookie-btn cookie-btn-decline" id="cookieDecline">Decline</button>
            </div>`;
        document.body.appendChild(banner);
        setTimeout(() => banner.classList.add('visible'), 1000);

        document.getElementById('cookieAccept').addEventListener('click', () => {
            localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
            if (window.TLP_Analytics) window.TLP_Analytics.grantConsent();
            banner.classList.remove('visible');
            setTimeout(() => banner.remove(), 400);
        });
        document.getElementById('cookieDecline').addEventListener('click', () => {
            localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
            if (window.TLP_Analytics) window.TLP_Analytics.revokeConsent();
            banner.classList.remove('visible');
            setTimeout(() => banner.remove(), 400);
        });
    }

    /* ========================
       CONTACT FORM RATE LIMIT
       ======================== */
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        let lastSubmit = 0;
        const COOLDOWN_MS = 30000; // 30 seconds between submissions
        contactForm.addEventListener('submit', (e) => {
            const now = Date.now();
            if (now - lastSubmit < COOLDOWN_MS) {
                e.preventDefault();
                const errEl = document.getElementById('contactError');
                if (errEl) {
                    errEl.textContent = 'Please wait 30 seconds before submitting again.';
                    errEl.style.display = 'block';
                    setTimeout(() => { errEl.style.display = 'none'; }, 4000);
                }
                return;
            }
            lastSubmit = now;
        });
    }
});
