/* ================================================
   TRUE LIFE PEPTIDES — Auth Gate
   Phone OTP verification (demo mode)
   Replace demo logic with Supabase signInWithOtp()
   when backend is configured.
   ================================================ */

(function () {
    'use strict';

    const AUTH_KEY = 'tlp_auth_verified';
    const DEMO_OTP = '1234';
    const MAX_ATTEMPTS = 5;
    const COOLDOWN_MS = 30000; // 30s between OTP sends

    // Skip if already verified this session
    if (sessionStorage.getItem(AUTH_KEY) === '1') return;

    // --- Build Gate DOM ---
    const gate = document.createElement('div');
    gate.id = 'authGate';
    gate.className = 'auth-gate';
    gate.innerHTML = `
        <div class="auth-gate-card">
            <div class="auth-gate-logo">
                <img src="https://res.cloudinary.com/ddnhp0hzd/image/upload/v1773092087/image_copy_a5anwg.png" alt="True Life Peptides">
            </div>
            <h2 class="auth-gate-title">Verify your identity</h2>
            <p class="auth-gate-subtitle">Enter your phone number to access True Life Peptides.</p>

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
                <p class="auth-otp-info">We sent a code to <span id="authPhoneDisplay"></span></p>
                <div class="auth-otp-inputs" id="authOtpInputs">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="0" autocomplete="one-time-code">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="1">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="2">
                    <input type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" class="auth-otp-digit" data-index="3">
                </div>
                <div class="auth-error" id="authOtpError"></div>
                <button class="auth-btn" id="authVerifyBtn">
                    <span class="auth-btn-text">Verify & Enter</span>
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
                <p class="auth-success-text">Verified successfully</p>
            </div>

            <p class="auth-disclaimer">By continuing, you confirm you are a qualified researcher and agree to our terms of use.</p>
        </div>
    `;

    // Insert gate as first child of body
    document.body.insertBefore(gate, document.body.firstChild);
    document.body.classList.add('auth-locked');

    // --- State ---
    let phoneNumber = '';
    let attempts = 0;
    let lastSendTime = 0;
    let resendInterval = null;

    // --- Elements ---
    const phoneInput = document.getElementById('authPhone');
    const sendBtn = document.getElementById('authSendBtn');
    const stepPhone = document.getElementById('authStepPhone');
    const stepOTP = document.getElementById('authStepOTP');
    const stepSuccess = document.getElementById('authStepSuccess');
    const phoneError = document.getElementById('authPhoneError');
    const otpError = document.getElementById('authOtpError');
    const phoneDisplay = document.getElementById('authPhoneDisplay');
    const verifyBtn = document.getElementById('authVerifyBtn');
    const resendBtn = document.getElementById('authResendBtn');
    const resendTimer = document.getElementById('authResendTimer');
    const backBtn = document.getElementById('authBackBtn');
    const otpDigits = document.querySelectorAll('.auth-otp-digit');

    // --- Phone Formatting ---
    function formatPhone(value) {
        const digits = value.replace(/\D/g, '').slice(0, 10);
        if (digits.length === 0) return '';
        if (digits.length <= 3) return '(' + digits;
        if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
        return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
    }

    function getDigits(value) {
        return value.replace(/\D/g, '');
    }

    phoneInput.addEventListener('input', () => {
        const formatted = formatPhone(phoneInput.value);
        phoneInput.value = formatted;
        phoneError.textContent = '';
    });

    phoneInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    // --- Send OTP ---
    sendBtn.addEventListener('click', () => {
        const digits = getDigits(phoneInput.value);

        if (digits.length !== 10) {
            phoneError.textContent = 'Please enter a valid 10-digit phone number.';
            phoneInput.focus();
            return;
        }

        const now = Date.now();
        if (now - lastSendTime < COOLDOWN_MS) {
            phoneError.textContent = 'Please wait before requesting another code.';
            return;
        }

        phoneNumber = '+1' + digits;
        phoneError.textContent = '';

        // Loading state
        sendBtn.classList.add('loading');
        sendBtn.disabled = true;

        // Simulate API call (replace with Supabase)
        setTimeout(() => {
            sendBtn.classList.remove('loading');
            sendBtn.disabled = false;
            lastSendTime = Date.now();

            // Show OTP step
            phoneDisplay.textContent = formatPhone(digits);
            stepPhone.classList.add('auth-step-hidden');
            stepOTP.classList.remove('auth-step-hidden');
            otpDigits[0].focus();

            startResendTimer();
        }, 1200);
    });

    // --- OTP Input Handling ---
    otpDigits.forEach((digit, i) => {
        digit.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val.slice(0, 1);
            otpError.textContent = '';

            if (val && i < otpDigits.length - 1) {
                otpDigits[i + 1].focus();
            }

            // Auto-verify when all filled
            const code = getOTP();
            if (code.length === 4) {
                setTimeout(() => verifyBtn.click(), 150);
            }
        });

        digit.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && i > 0) {
                otpDigits[i - 1].focus();
            }
        });

        // Paste support
        digit.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
            for (let j = 0; j < Math.min(paste.length, 4); j++) {
                if (otpDigits[i + j]) {
                    otpDigits[i + j].value = paste[j];
                }
            }
            const lastFilled = Math.min(i + paste.length, 3);
            otpDigits[lastFilled].focus();

            if (paste.length >= 4 - i) {
                setTimeout(() => verifyBtn.click(), 150);
            }
        });
    });

    function getOTP() {
        return Array.from(otpDigits).map(d => d.value).join('');
    }

    function clearOTP() {
        otpDigits.forEach(d => { d.value = ''; });
        otpDigits[0].focus();
    }

    // --- Verify OTP ---
    verifyBtn.addEventListener('click', () => {
        const code = getOTP();

        if (code.length !== 4) {
            otpError.textContent = 'Please enter the 4-digit code.';
            return;
        }

        if (attempts >= MAX_ATTEMPTS) {
            otpError.textContent = 'Too many attempts. Please try again later.';
            return;
        }

        attempts++;

        // Loading
        verifyBtn.classList.add('loading');
        verifyBtn.disabled = true;

        setTimeout(() => {
            verifyBtn.classList.remove('loading');
            verifyBtn.disabled = false;

            // Demo verification (replace with Supabase verifyOtp)
            if (code === DEMO_OTP) {
                // Success
                sessionStorage.setItem(AUTH_KEY, '1');
                stepOTP.classList.add('auth-step-hidden');
                stepSuccess.classList.remove('auth-step-hidden');

                setTimeout(() => {
                    gate.classList.add('auth-gate-exit');
                    setTimeout(() => {
                        gate.remove();
                        document.body.classList.remove('auth-locked');
                    }, 500);
                }, 1000);
            } else {
                otpError.textContent = 'Invalid code. Please try again. (' + (MAX_ATTEMPTS - attempts) + ' attempts remaining)';
                clearOTP();
            }
        }, 800);
    });

    // --- Resend Timer ---
    function startResendTimer() {
        resendBtn.disabled = true;
        let remaining = 30;
        resendTimer.textContent = '(' + remaining + 's)';

        if (resendInterval) clearInterval(resendInterval);
        resendInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(resendInterval);
                resendBtn.disabled = false;
                resendTimer.textContent = '';
            } else {
                resendTimer.textContent = '(' + remaining + 's)';
            }
        }, 1000);
    }

    resendBtn.addEventListener('click', () => {
        if (resendBtn.disabled) return;
        lastSendTime = Date.now();
        startResendTimer();
        otpError.textContent = '';
        clearOTP();
        // Show feedback
        const orig = resendBtn.textContent;
        resendBtn.textContent = 'Code sent!';
        setTimeout(() => {
            resendBtn.innerHTML = 'Resend code <span id="authResendTimer"></span>';
            // re-bind timer span
        }, 1500);
    });

    // --- Back Button ---
    backBtn.addEventListener('click', () => {
        stepOTP.classList.add('auth-step-hidden');
        stepPhone.classList.remove('auth-step-hidden');
        phoneInput.focus();
        clearOTP();
        otpError.textContent = '';
    });

    // Focus phone input on load
    setTimeout(() => phoneInput.focus(), 400);
})();
