<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { handleGoogleResponse } from '@/utils/googleAuth'
import useAuthStore from "@/stores/webauth";

const authStore = useAuthStore();

const email = ref('')
const password = ref('')
const emailError = ref('')
const passwordError = ref('')
const isLoading = ref(false)
const apiError = ref('')
const successMessage = ref('')

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
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Login failed')
    }
    const data = await response.json();
    if (data.userId) {
      localStorage.setItem('userToken', data.userId)
      localStorage.setItem('userEmail', email.value)
      window.dispatchEvent(new CustomEvent('loginSuccess'))
    }
    successMessage.value = 'Login successful!'
    email.value = ''
    password.value = ''
  } catch (err) {
    apiError.value = err instanceof Error ? err.message : 'Error'
  } finally { isLoading.value = false }
}

const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID;

onMounted(() => {
  if (window.google && window.google.accounts) {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse
    })

    window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        { theme: 'outline', size: 'large', width: '100%' }
    )
  }
})

</script>

<template>
  <div class="page-container">
    <div class="register-card">
      <h1 class="register-title">Login to your account</h1>

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
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      <div v-if="apiError" class="api-error">{{ apiError }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
      <div id="google-signin-button"></div>

      <p class="login-link">
        Don't have an account? <a href="#" @click.prevent="authStore.setPage('register')">Register</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
@import "authCommon.css";
</style>
