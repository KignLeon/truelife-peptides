/* ================================================
   TRUE LIFE PEPTIDES — Auth Gate
   ================================================
   ACCESS FLOW (priority order):
   1. Admin bypass token (set by landing page ?key= or 5-tap/triple-A)
      → Immediate access, no modal
   2. Existing local auth session (7-day TTL, persists across tabs)
      → Immediate access, no modal
   3. Existing Supabase session
      → Immediate access, no modal
   4. (Future: phone OTP via Supabase/Twilio — currently disabled)
      → Shows access-denied message

   To access the site:
   - Use the landing page (/) with the correct ?key= URL parameter
   - Or trigger the admin modal on the landing page and enter the code
   - Both methods set the tlp_admin_bypass localStorage token which
     this script reads on the /app/ page to grant instant access.
   ================================================ */

(function () {
    'use strict';

    const AUTH_KEY        = 'tlp_auth_session';
    const ADMIN_BYPASS_KEY = 'tlp_admin_bypass';
    const AUTH_TTL_MS     = 7 * 24 * 60 * 60 * 1000;  // 7 days
    const ADMIN_TTL_MS    = 8 * 60 * 60 * 1000;        // 8 hours (matches landing page)

    // ── 1. Check admin bypass (set by landing page) ──
    function hasAdminBypass() {
        try {
            const raw = localStorage.getItem(ADMIN_BYPASS_KEY);
            if (!raw) return false;
            const { ts } = JSON.parse(raw);
            return (Date.now() - ts) < ADMIN_TTL_MS;
        } catch { return false; }
    }

    // ── 2. Check our own auth session ──
    function isLocalAuthValid() {
        try {
            const raw = localStorage.getItem(AUTH_KEY);
            if (!raw) return false;
            const { ts } = JSON.parse(raw);
            return (Date.now() - ts) < AUTH_TTL_MS;
        } catch { return false; }
    }

    function setLocalAuth() {
        try {
            localStorage.setItem(AUTH_KEY, JSON.stringify({ ts: Date.now() }));
        } catch { /* private/incognito mode */ }
    }

    // ── Fast-path: if either bypass or session token is valid, unlock immediately ──
    if (hasAdminBypass() || isLocalAuthValid()) {
        // Sync the auth session so it stays fresh
        setLocalAuth();
        // Remove any static auth gate that may have been baked into the HTML
        const staticGate = document.getElementById('authGate');
        if (staticGate) staticGate.remove();
        document.body.classList.remove('auth-locked');
        return;
    }

    // ── 3. Check Supabase session (async) ──
    async function checkExistingSession() {
        try {
            const sb = (typeof getSupabaseClient === 'function') ? getSupabaseClient() : null;
            if (!sb) return false;
            const { data: { session } } = await sb.auth.getSession();
            return !!(session && session.user);
        } catch { return false; }
    }

    // ── Unlock helper ──
    function unlockSite(gate) {
        setLocalAuth();
        if (gate) {
            gate.classList.add('auth-gate-exit');
            setTimeout(() => {
                gate.remove();
                document.body.classList.remove('auth-locked');
            }, 500);
        } else {
            document.body.classList.remove('auth-locked');
        }
    }

    // ── Build the access-denied gate (shown only if no valid auth found) ──
    function showAccessDenied() {
        // Remove static gate if present
        const existing = document.getElementById('authGate');
        if (existing) existing.remove();

        const gate = document.createElement('div');
        gate.id = 'authGate';
        gate.className = 'auth-gate';
        gate.innerHTML = `
        <div class="auth-gate-card" style="text-align:center;">
            <div class="auth-gate-logo">
                <img src="https://res.cloudinary.com/ddnhp0hzd/image/upload/v1773092087/image_copy_a5anwg.png"
                     alt="True Life Peptides"
                     onerror="this.onerror=null">
            </div>
            <h2 class="auth-gate-title">Access Required</h2>
            <p class="auth-gate-subtitle" style="margin-bottom:28px;">
                This area is restricted. Please use your admin access link to enter the site.
            </p>
            <a href="../" class="auth-btn" style="display:inline-block;text-decoration:none;text-align:center;padding:13px 28px;">
                <span class="auth-btn-text">← Return to Homepage</span>
            </a>
            <p style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:20px;">
                Admin access is granted from the homepage using a secure key.
            </p>
        </div>`;

        document.body.insertBefore(gate, document.body.firstChild);
        document.body.classList.add('auth-locked');
    }

    // ── Main init: check Supabase session async, then decide ──
    (async function init() {
        const hasSession = await checkExistingSession();
        if (hasSession) {
            setLocalAuth();
            const staticGate = document.getElementById('authGate');
            if (staticGate) staticGate.remove();
            document.body.classList.remove('auth-locked');
            return;
        }

        // No valid auth — show access denied
        showAccessDenied();
    })();

})();
