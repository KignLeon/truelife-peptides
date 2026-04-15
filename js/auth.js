/* ================================================
   TRUE LIFE PEPTIDES — Auth Gate (Production)
   ================================================
   Real phone OTP authentication via Supabase.
   
   REQUIRES:
   - Supabase SDK loaded via CDN (before this script)
   - js/supabase-config.js loaded (before this script)
   - Supabase project with Phone Auth + Twilio configured
   
   FLOW:
   1. User enters phone number
   2. Real SMS OTP is sent via Supabase → Twilio
   3. User enters 6-digit code
   4. Supabase verifies the OTP
   5. Session is created and persisted
   6. User gains access
   ================================================ */

(function () {
    'use strict';

    const AUTH_KEY = 'tlp_auth_session';
    const MAX_ATTEMPTS = 5;
    const COOLDOWN_MS = 30000;
    const OTP_LENGTH = 6;

    // --- Check existing Supabase session ---
    async function checkExistingSession() {
        const sb = getSupabaseClient();
        if (!sb) return false;
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (session && session.user) {
                return true;
            }
        } catch (e) {
            console.warn('[TLP Auth] Session check failed:', e.message);
        }
        return false;
    }

    // Quick check: if we have a local flag for this tab, skip the gate instantly
    // (prevents flash on page navigation within the same session)
    if (sessionStorage.getItem(AUTH_KEY) === '1') return;

    // --- Build Gate DOM ---
    const gate = document.createElement('div');
    gate.id = 'authGate';
    gate.className = 'auth-gate';
    gate.innerHTML = `
        <div class="auth-gate-card">
            <div class="auth-gate-logo">
                <img src="${getAssetPath()}assets/logo.png" alt="True Life Peptides"
                    onerror="this.src='https://res.cloudinary.com/ddnhp0hzd/image/upload/v1773092087/image_copy_a5anwg.png'">
            </div>
            <h2 class="auth-gate-title">Verify your identity</h2>
            <p class="auth-gate-subtitle">Enter your phone number to access True Life Peptides. A verification code will be sent via SMS.</p>

            <!-- Step 1: Phone -->
            <div class="auth-step" id="authStepPhone">
                <div class="auth-input-group">
                    <span class="auth-country-code">+1</span>
                    <input type="tel" id="authPhone" class="auth-input" placeholder="(555) 123-4567" maxlength="14" autocomplete="tel">
                </div>
                <div class="auth-error" id="authPhoneError"></div>
                <button class="auth-btn" id="authSendBtn">
                    <span class="auth-btn-text">Send Verification Code</span>
                    <span class="auth-btn-spinner"></span>
                </button>
            </div>

            <!-- Step 2: OTP -->
            <div class="auth-step auth-step-hidden" id="authStepOTP">
                <p class="auth-otp-info">We sent a 6-digit code to <span id="authPhoneDisplay"></span></p>
                <div class="auth-otp-inputs" id="authOtpInputs">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="0" autocomplete="one-time-code">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="1">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="2">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="3">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="4">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="5">
                </div>
                <div class="auth-error" id="authOtpError"></div>
                <button class="auth-btn" id="authVerifyBtn">
                    <span class="auth-btn-text">Verify &amp; Enter</span>
                    <span class="auth-btn-spinner"></span>
                </button>
                <button class="auth-resend" id="authResendBtn" disabled>Resend code <span id="authResendTimer"></span></button>
                <button class="auth-back" id="authBackBtn">← Change number</button>
            </div>

            <!-- Step 3: Success -->
            <div class="auth-step auth-step-hidden" id="authStepSuccess">
                <div class="auth-success-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <p class="auth-success-text">Verified. Welcome to True Life Peptides.</p>
            </div>

            <!-- Step 4: Config Error -->
            <div class="auth-step auth-step-hidden" id="authStepConfigError">
                <div style="text-align:center;padding:20px 0;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B45309" stroke-width="1.5" width="32" height="32" style="margin:0 auto 12px;display:block;">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <p style="font-size:14px;color:#92400E;font-weight:600;margin-bottom:8px;">Authentication Not Configured</p>
                    <p style="font-size:12px;color:rgba(120,53,15,0.7);line-height:1.6;">Supabase credentials are missing. Please configure <code>js/supabase-config.js</code> with your project URL and anon key.</p>
                </div>
            </div>

            <p class="auth-disclaimer">By continuing, you confirm you are a qualified researcher and agree to use these compounds for research purposes only.</p>
        </div>
    `;

    document.body.insertBefore(gate, document.body.firstChild);
    document.body.classList.add('auth-locked');

    // --- Helpers ---
    function getAssetPath() {
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        return depth > 0 ? '../'.repeat(depth) : './';
    }

    function formatPhone(value) {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length === 0) return '';
        if (digits.length <= 3) return '(' + digits;
        if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
        return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
    }

    function getDigits(value) { return value.replace(/\D/g, ''); }

    function unlockSite() {
        sessionStorage.setItem(AUTH_KEY, '1');
        stepOTP.classList.add('auth-step-hidden');
        stepSuccess.classList.remove('auth-step-hidden');
        setTimeout(() => {
            gate.classList.add('auth-gate-exit');
            setTimeout(() => {
                gate.remove();
                document.body.classList.remove('auth-locked');
            }, 500);
        }, 900);
    }

    // --- State ---
    let phoneNumber = '';
    let attempts = 0;
    let lastSendTime = 0;
    let resendInterval = null;

    // --- Elements ---
    const phoneInput     = document.getElementById('authPhone');
    const sendBtn        = document.getElementById('authSendBtn');
    const stepPhone      = document.getElementById('authStepPhone');
    const stepOTP        = document.getElementById('authStepOTP');
    const stepSuccess    = document.getElementById('authStepSuccess');
    const stepConfigErr  = document.getElementById('authStepConfigError');
    const phoneError     = document.getElementById('authPhoneError');
    const otpError       = document.getElementById('authOtpError');
    const phoneDisplay   = document.getElementById('authPhoneDisplay');
    const verifyBtn      = document.getElementById('authVerifyBtn');
    const resendBtn      = document.getElementById('authResendBtn');
    const resendTimer    = document.getElementById('authResendTimer');
    const backBtn        = document.getElementById('authBackBtn');
    const otpDigits      = document.querySelectorAll('.auth-otp-digit');

    // --- Init: Check for existing session, then show gate if needed ---
    (async function init() {
        const hasSession = await checkExistingSession();
        if (hasSession) {
            // Already authenticated — skip gate
            sessionStorage.setItem(AUTH_KEY, '1');
            gate.remove();
            document.body.classList.remove('auth-locked');
            return;
        }

        // Check if Supabase is configured
        const sb = getSupabaseClient();
        if (!sb) {
            stepPhone.classList.add('auth-step-hidden');
            stepConfigErr.classList.remove('auth-step-hidden');
            return;
        }

        // Show phone input
        setTimeout(() => phoneInput.focus(), 400);
    })();

    // --- Phone formatting ---
    phoneInput.addEventListener('input', () => {
        phoneInput.value = formatPhone(phoneInput.value);
        phoneError.textContent = '';
    });
    phoneInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    // --- Send OTP via Supabase ---
    sendBtn.addEventListener('click', async () => {
        const digits = getDigits(phoneInput.value);
        if (digits.length !== 10) {
            phoneError.textContent = 'Please enter a valid 10-digit US phone number.';
            phoneInput.focus();
            return;
        }

        const now = Date.now();
        if (now - lastSendTime < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - lastSendTime)) / 1000);
            phoneError.textContent = `Please wait ${remaining}s before requesting another code.`;
            return;
        }

        phoneNumber = '+1' + digits;
        phoneError.textContent = '';
        sendBtn.classList.add('loading');
        sendBtn.disabled = true;

        try {
            const sb = getSupabaseClient();
            const { error } = await sb.auth.signInWithOtp({ phone: phoneNumber });

            sendBtn.classList.remove('loading');
            sendBtn.disabled = false;

            if (error) {
                phoneError.textContent = error.message || 'Failed to send verification code. Please try again.';
                return;
            }

            lastSendTime = Date.now();
            phoneDisplay.textContent = formatPhone(digits);
            stepPhone.classList.add('auth-step-hidden');
            stepOTP.classList.remove('auth-step-hidden');
            otpDigits[0].focus();
            startResendTimer();
        } catch (err) {
            sendBtn.classList.remove('loading');
            sendBtn.disabled = false;
            phoneError.textContent = 'Network error. Please check your connection and try again.';
            console.error('[TLP Auth] Send OTP error:', err);
        }
    });

    // --- OTP digit inputs ---
    otpDigits.forEach((digit, i) => {
        digit.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val.slice(0, 1);
            otpError.textContent = '';
            if (val && i < otpDigits.length - 1) otpDigits[i + 1].focus();
            if (getOTP().length === OTP_LENGTH) setTimeout(() => verifyBtn.click(), 150);
        });
        digit.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && i > 0) otpDigits[i - 1].focus();
        });
        digit.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            for (let j = 0; j < Math.min(paste.length, OTP_LENGTH); j++) {
                if (otpDigits[i + j]) otpDigits[i + j].value = paste[j];
            }
            const lastFilled = Math.min(i + paste.length - 1, OTP_LENGTH - 1);
            otpDigits[lastFilled].focus();
            if (paste.length >= OTP_LENGTH - i) setTimeout(() => verifyBtn.click(), 150);
        });
    });

    function getOTP() { return Array.from(otpDigits).map(d => d.value).join(''); }
    function clearOTP() { otpDigits.forEach(d => { d.value = ''; }); otpDigits[0].focus(); }

    // --- Verify OTP via Supabase ---
    verifyBtn.addEventListener('click', async () => {
        const code = getOTP();
        if (code.length !== OTP_LENGTH) {
            otpError.textContent = `Please enter the ${OTP_LENGTH}-digit code.`;
            return;
        }
        if (attempts >= MAX_ATTEMPTS) {
            otpError.textContent = 'Too many attempts. Please refresh and try again.';
            return;
        }
        attempts++;
        verifyBtn.classList.add('loading');
        verifyBtn.disabled = true;

        try {
            const sb = getSupabaseClient();
            const { data, error } = await sb.auth.verifyOtp({
                phone: phoneNumber,
                token: code,
                type: 'sms'
            });

            verifyBtn.classList.remove('loading');
            verifyBtn.disabled = false;

            if (error) {
                const left = MAX_ATTEMPTS - attempts;
                if (left > 0) {
                    otpError.textContent = error.message || `Incorrect code. ${left} attempt${left !== 1 ? 's' : ''} remaining.`;
                } else {
                    otpError.textContent = 'Too many failed attempts. Please refresh and try again.';
                }
                clearOTP();
                return;
            }

            // Success — session is automatically persisted by Supabase
            if (data && data.session) {
                unlockSite();
            } else {
                otpError.textContent = 'Verification failed. Please try again.';
                clearOTP();
            }
        } catch (err) {
            verifyBtn.classList.remove('loading');
            verifyBtn.disabled = false;
            otpError.textContent = 'Network error. Please check your connection and try again.';
            console.error('[TLP Auth] Verify OTP error:', err);
        }
    });

    // --- Resend timer ---
    function startResendTimer() {
        resendBtn.disabled = true;
        let remaining = 30;
        resendTimer.textContent = `(${remaining}s)`;
        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(resendInterval);
                resendBtn.disabled = false;
                resendTimer.textContent = '';
            } else {
                resendTimer.textContent = `(${remaining}s)`;
            }
        }, 1000);
    }

    resendBtn.addEventListener('click', async () => {
        if (resendBtn.disabled) return;
        otpError.textContent = '';
        clearOTP();

        try {
            const sb = getSupabaseClient();
            const { error } = await sb.auth.signInWithOtp({ phone: phoneNumber });

            if (error) {
                otpError.textContent = error.message || 'Failed to resend code.';
                return;
            }

            lastSendTime = Date.now();
            startResendTimer();
            resendBtn.textContent = 'Code sent!';
            setTimeout(() => {
                resendBtn.innerHTML = 'Resend code <span id="authResendTimer"></span>';
            }, 1500);
        } catch (err) {
            otpError.textContent = 'Network error. Could not resend code.';
            console.error('[TLP Auth] Resend error:', err);
        }
    });

    backBtn.addEventListener('click', () => {
        stepOTP.classList.add('auth-step-hidden');
        stepPhone.classList.remove('auth-step-hidden');
        phoneInput.focus();
        clearOTP();
        otpError.textContent = '';
    });
})();
