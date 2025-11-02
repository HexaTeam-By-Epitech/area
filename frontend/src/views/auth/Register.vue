<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { handleGoogleResponse, googleLoading, googleError, googleSuccess } from '@/utils/googleAuth'
import useAuthStore from "@/stores/webauth";
import useToastStore from '@/stores/toast';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const toast = useToastStore();

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

let googleRendered = false

function tryInitGoogle() {
  const g: any = (window as any).google
  if (!g || !g.accounts || googleRendered) return false

  g.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse
  })

  const el = document.getElementById('google-signin-button')
  if (el) {
    g.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: '100%' })
    googleRendered = true
    return true
  }
  return false
}

onMounted(() => {
  if (tryInitGoogle()) return
  const interval = setInterval(() => {
    if (tryInitGoogle()) {
      clearInterval(interval)
    }
  }, 100)
  setTimeout(() => clearInterval(interval), 5000)

  // Prefill email from authStore if available (coming from Login)
  if (!email.value && authStore.email) {
    email.value = authStore.email;
  }
})

// When switching back to the register form (after 'Change email'), clear fields and code
watch(() => authStore.page, (val) => {
  if (val === 'register') {
    // Clear inputs to let the user type a new email or the same intentionally
    email.value = '';
    password.value = '';
    emailError.value = '';
    passwordError.value = '';
    // Reset OTP
    codeDigits.value = Array(CODE_LENGTH).fill('');
    emailCode.value = '';
  }
});

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isLoading = ref(false)
const apiError = ref('')
const successMessage = ref('')

const emailCode = ref('')
// Track if the account was created during this session (not a 409 reuse)
const createdHere = ref(false)

// Resend verification code UX
const RESEND_COOLDOWN = 30;
const resendCooldown = ref(0);
const resendLoading = ref(false);
let resendInterval: any = null;

function startResendCooldown() {
  stopResendCooldown();
  resendCooldown.value = RESEND_COOLDOWN;
  resendInterval = setInterval(() => {
    resendCooldown.value = Math.max(0, resendCooldown.value - 1);
    if (resendCooldown.value === 0) {
      stopResendCooldown();
    }
  }, 1000);
}

function stopResendCooldown() {
  if (resendInterval) {
    clearInterval(resendInterval);
    resendInterval = null;
  }
}

function maskEmail(value: string) {
  if (!value) return '';
  const [user, domain] = value.split('@');
  if (!user || !domain) return value;
  const visible = user.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(1, user.length - 1))}@${domain}`;
}

async function resendVerification() {
  if (resendCooldown.value > 0 || resendLoading.value) return;
  resendLoading.value = true;
  apiError.value = '';
  successMessage.value = '';
  try {
    const res = await fetch('/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authStore.email || email.value })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to resend code');
    }
    successMessage.value = 'Verification code resent. Please check your inbox.';
    startResendCooldown();
  } catch (err) {
    apiError.value = err instanceof Error ? err.message : 'Failed to resend code';
  } finally {
    resendLoading.value = false;
  }
}

function changeEmail() {
  // Reset code and go back to email/password form
  codeDigits.value = Array(CODE_LENGTH).fill('');
  emailCode.value = '';
  stopResendCooldown();
  authStore.setPage('register');
}

onUnmounted(() => {
  stopResendCooldown();
})

const CODE_LENGTH = 6
const codeDigits = ref<string[]>(Array(CODE_LENGTH).fill(''))
const codeInputs = ref<(HTMLInputElement | null)[]>([])
const verifyLoading = ref(false)

function setCodeRef(el: HTMLInputElement | null, idx: number) {
  codeInputs.value[idx] = el
}

function focusIndex(idx: number) {
  const el = codeInputs.value[idx]
  if (el) el.focus()
}

function updateEmailCode() {
  emailCode.value = codeDigits.value.join('')
}

function handleCodeInput(idx: number, e: Event) {
  const target = e.target as HTMLInputElement
  let v = (target.value || '').replace(/\D/g, '')
  if (v.length > 1) v = v.charAt(0)
  codeDigits.value[idx] = v
  target.value = v
  updateEmailCode()
  if (v && idx < CODE_LENGTH - 1) {
    focusIndex(idx + 1)
  }
  // Auto-submit when last digit is entered
  if (emailCode.value.length === CODE_LENGTH && !verifyLoading.value) {
    handleVerificationCode()
  }
}

function handleCodeKeydown(idx: number, e: KeyboardEvent) {
  const key = e.key
  if (key === 'Backspace') {
    if (codeDigits.value[idx]) {
      // clear current
      codeDigits.value[idx] = ''
      updateEmailCode()
      // allow default to clear input
    } else if (idx > 0) {
      // move to previous and clear it
      e.preventDefault()
      focusIndex(idx - 1)
      const prev = codeInputs.value[idx - 1]
      if (prev) {
        prev.select()
      }
    }
  } else if (key === 'ArrowLeft' && idx > 0) {
    e.preventDefault(); focusIndex(idx - 1)
  } else if (key === 'ArrowRight' && idx < CODE_LENGTH - 1) {
    e.preventDefault(); focusIndex(idx + 1)
  } else if (key === 'Enter') {
    if (emailCode.value.length === CODE_LENGTH && !verifyLoading.value) {
      handleVerificationCode()
    }
  }
}

function handleCodePaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text') || ''
  const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH).split('')
  if (!digits.length) return
  e.preventDefault()
  for (let i = 0; i < CODE_LENGTH; i++) {
    codeDigits.value[i] = digits[i] || ''
    const el = codeInputs.value[i]
    if (el) el.value = codeDigits.value[i]
  }
  updateEmailCode()
  const nextIdx = Math.min(digits.length, CODE_LENGTH - 1)
  focusIndex(nextIdx)

  // Auto-submit if full code after paste
  if (emailCode.value.length === CODE_LENGTH && !verifyLoading.value) {
    handleVerificationCode()
  }
}


const validateEmail = () => {
  if (!email.value) { emailError.value = 'Email is required'; return false }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!regex.test(email.value)) { emailError.value = 'Invalid email'; return false }
  emailError.value = ''
  return true
}

const validatePassword = () => {
  if (!password.value) { passwordError.value = 'Password is required'; return false }
  if (password.value.length < 8) { passwordError.value = 'Password must be at least 8 characters'; return false }
  passwordError.value = ''
  return true
}

const isFormValid = computed(() => email.value && password.value && !emailError.value && !passwordError.value)

const handleSubmit = async () => {
  apiError.value = ''
  successMessage.value = ''
  if (!validateEmail() || !validatePassword()) return
  isLoading.value = true
  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })

    if (!response.ok && response.status === 409) {
      // Existing account: try to resend verification; if already verified, route to login
      authStore.email = email.value;
      // Attempt resend directly to branch by status
      const rv = await fetch('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authStore.email })
      });

      if (rv.ok) {
        createdHere.value = false;
        authStore.setPage('waitingcode');
        password.value = '';
        startResendCooldown();
        successMessage.value = 'We sent you a new verification code.';
      } else if (rv.status === 400) {
        // Account already verified → go to login
        toast.show('Account already exists. Please log in.', 'info', 3500);
        authStore.setPage('login');
        await router.replace('/webauth');
      } else {
        const data = await rv.json().catch(() => ({}));
        apiError.value = data.message || 'Unable to resend verification code';
      }
      return;
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Registration failed')
    }

    const data = await response.json();
    if (data.userId) {
      createdHere.value = true;
      // Store email temporarily for verification
      authStore.email = email.value;
      authStore.userId = data.userId;
      authStore.setPage("waitingcode");
    }
    successMessage.value = 'Account created successfully! Please check your email for verification code.'
  } catch (err) {
    apiError.value = err instanceof Error ? err.message : 'Error'
  } finally { isLoading.value = false }
}

const handleVerificationCode = async () => {
  if (emailCode.value.length !== CODE_LENGTH) return
  verifyLoading.value = true
  try {
    const res = await fetch('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({email: authStore.email, verificationCode: `${emailCode.value}`})
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Verification failed')
    }

    if (createdHere.value) {
      // Auto-login only for accounts created in this session
      const loginRes = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authStore.email, password: password.value })
      });

      if (!loginRes.ok) {
        // If auto-login fails unexpectedly, fall back to manual login flow
        toast.show('Email verified. Please log in.', 'success', 3500);
        authStore.setPage('login');
        await router.replace('/webauth');
        return;
      }

      const loginData = await loginRes.json();
      if (loginData.accessToken && loginData.userId) {
        authStore.login(loginData.email || authStore.email, loginData.accessToken, loginData.userId);
      }
    } else {
      // Account existed: don't try with potentially wrong password, guide user to login
      toast.show('Email verified. Please log in.', 'success', 3500);
      authStore.setPage('login');
      await router.replace('/webauth');
    }
  } catch (e) {
    console.log(`Error while verifying email: ${e}`);
    apiError.value = e instanceof Error ? e.message : 'Verification failed';
  } finally {
    verifyLoading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <div class="register-card">
      <h1 class="register-title">Create your account</h1>

      <form @submit.prevent="handleSubmit" class="register-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
              id="email"
              type="email"
              v-model="email"
              placeholder="Enter your email"
              :class="{ error: emailError }"
              @blur="validateEmail"
          />
          <span v-if="emailError" class="error-message">{{ emailError }}</span>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
              id="password"
              type="password"
              v-model="password"
              placeholder="Enter your password"
              :class="{ error: passwordError }"
              @blur="validatePassword"
          />
          <span v-if="passwordError" class="error-message">{{ passwordError }}</span>
        </div>

        <button type="submit" style="width: 100%; margin-bottom: 1vh" :disabled="isLoading || !isFormValid">
          {{ isLoading ? 'Creating account...' : 'Register' }}
        </button>
        </form>

      <div v-if="apiError" class="api-error">{{ apiError }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

      <div v-if="authStore.page === 'waitingcode'">
        <h2>Verification code</h2>
        <p class="section-hint">We sent a 6-digit code to <strong>{{ maskEmail(authStore.email || email) }}</strong>.</p>
        <div class="actions-row">
          <button type="button" class="link-btn" @click="changeEmail">Change email</button>
          <button type="button" class="link-btn" :disabled="resendLoading || resendCooldown > 0" @click="resendVerification">
            {{ resendLoading ? 'Resending…' : (resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code') }}
          </button>
        </div>
        <form @submit.prevent="handleVerificationCode" class="code-container" @paste="handleCodePaste">
          <div class="code-inputs">
            <input
              v-for="(_, i) in CODE_LENGTH"
              :key="i"
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="1"
              class="code-bit"
              autocomplete="one-time-code"
              :value="codeDigits[i]"
              @input="(e) => handleCodeInput(i, e)"
              @keydown="(e) => handleCodeKeydown(i, e)"
              :ref="(el) => setCodeRef(el as HTMLInputElement | null, i)"
              aria-label="Verification code digit"
              :autofocus="i === 0"
              required
            />
          </div>
          <button type="submit" style="width: 100%" :disabled="emailCode.length !== CODE_LENGTH || verifyLoading">
            {{ verifyLoading ? 'Verifying...' : 'Submit' }}
          </button>
        </form>
      </div>

      <div class="divider">
        <span>OR</span>
      </div>

      <div class="google-signin-container">
        <div v-if="googleLoading" class="google-loading">Signing in with Google...</div>
        <div v-if="googleError" class="api-error">{{ googleError }}</div>
        <div v-if="googleSuccess" class="success-message">{{ googleSuccess }}</div>
        <div id="google-signin-button"></div>
      </div>

      <p class="login-link">
        Already have an account? <a href="#" @click.prevent="authStore.setPage('login')">Login</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
@import "authCommon.css";

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: var(--text-secondary);
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--text-secondary);
}

.divider span {
  padding: 0 1rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.google-signin-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.code-container { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.code-inputs { display: flex; gap: 0.5rem; justify-content: center; }

.google-loading {
  text-align: center;
  padding: 0.75rem;
  background-color: rgba(66, 133, 244, 0.1);
  border-radius: 0.5rem;
  color: #4285F4;
  font-weight: 500;
}

.code-bit {
  caret-color: transparent;
  border-radius: 5px;
  font-size: 36px;
  height: 60px;
  width: 50px;
  border: 1px solid var(--button-color);
  text-align: center;
  font-weight: 300;
  -moz-appearance: textfield;
}

.section-hint {
  margin: 0.5rem 0 0.75rem;
  color: var(--text-secondary);
}
.actions-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}
.link-btn {
  background: transparent;
  border: none;
  color: var(--button-color);
  font-weight: 600;
  cursor: pointer;
}
.link-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
