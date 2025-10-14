<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { handleGoogleResponse, googleLoading, googleError, googleSuccess } from '@/utils/googleAuth'
import useAuthStore from "@/stores/webauth";

const authStore = useAuthStore();

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
})

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isLoading = ref(false)
const apiError = ref('')
const successMessage = ref('')

const emailCode = ref('')

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
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Registration failed')
    }
    const data = await response.json();
    if (data.userId) {
      // Store email temporarily for verification
      authStore.email = email.value;
      authStore.userId = data.userId;
      authStore.setPage("waitingcode");
    }
    successMessage.value = 'Account created successfully! Please check your email for verification code.'
  } catch (err) {
    apiError.value = err instanceof Error ? err.message : 'Error'
  } finally { isLoading.value = false }
  //} finally {}
}

const handleVerificationCode = async () => {
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

    // Now login the user
    const loginRes = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authStore.email, password: password.value })
    });

    if (!loginRes.ok) {
      throw new Error('Auto-login failed after verification');
    }

    const loginData = await loginRes.json();
    if (loginData.accessToken && loginData.userId) {
      authStore.login(loginData.email || authStore.email, loginData.accessToken, loginData.userId);
    }
  } catch (e) {
    console.log(`Error while verifying email: ${e}`);
    apiError.value = e instanceof Error ? e.message : 'Verification failed';
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

      <div v-if="successMessage">
        <form @submit.prevent="handleVerificationCode">
          <label for="emailcode">Code reçu par mail</label>
          <input
              id="emailcode"
              type="number"
              placeholder="000000"
              class="form-group"
              v-model="emailCode"
          />
          <button type="submit">Submit</button>
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

.google-loading {
  text-align: center;
  padding: 0.75rem;
  background-color: rgba(66, 133, 244, 0.1);
  border-radius: 0.5rem;
  color: #4285F4;
  font-weight: 500;
}
</style>
