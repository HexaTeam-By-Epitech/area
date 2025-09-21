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

        <button type="submit" :disabled="isLoading || !isFormValid">
          {{ isLoading ? 'Creating account...' : 'Register' }}
        </button>
      </form>

      <div v-if="apiError" class="api-error">{{ apiError }}</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>

      <p class="login-link">
        Already have an account? <a href="#" @click.prevent="goToLogin">Login</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

onMounted(() => document.title = 'Register - Area')
onUnmounted(() => document.title = 'Area')

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
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Registration failed')
    }
    successMessage.value = 'Account created successfully!'
    email.value = ''
    password.value = ''
  } catch (err) {
    apiError.value = err instanceof Error ? err.message : 'Error'
  } finally { isLoading.value = false }
}

const goToLogin = () => {
  window.dispatchEvent(new CustomEvent('switchToLogin'))
}
</script>

<style scoped>
.page-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  background-color: #f8f9fa;
}

.register-card {
  background: white;
  padding: clamp(20px, 4vw, 40px);
  border-radius: 1em;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  width: clamp(280px, 90%, 500px);
  box-sizing: border-box;
  text-align: center;
}

.register-title {
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  margin-bottom: 1.5em;
  color: #1a1a1a;
}

.register-form .form-group {
  margin-bottom: 1em;
  text-align: left;
}

.register-form label {
  display: block;
  margin-bottom: 0.3em;
  font-weight: 500;
  font-size: clamp(0.9rem, 1.5vw, 1rem);
}

.register-form input {
  width: 100%;
  padding: clamp(10px, 2vw, 14px);
  border: 2px solid #e5e7eb;
  border-radius: 0.5em;
  font-size: clamp(0.95rem, 1.8vw, 1.1rem);
  box-sizing: border-box;
  color: #1a1a1a;
  background-color: #ffffff;
}

.register-form input.error {
  border-color: #ef4444
}

.register-form button {
  width: 100%;
  padding: clamp(10px, 2vw, 14px);
  background-color: #3b82f6;
  border: none;
  border-radius: 0.5em;
  color: white;
  font-size: clamp(0.95rem, 1.8vw, 1.1rem);
  cursor: pointer;
}

.register-form button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed
}

.api-error, .success-message {
  padding: clamp(8px, 1.5vw, 12px);
  border-radius: 0.5em;
  margin-bottom: 1em;
  font-size: clamp(0.9rem, 1.5vw, 1rem);
}

.api-error {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca
}

.error-message {
  color: #ef4444;
  margin-top: 4px;
}

.success-message {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0
}

.login-link {
  font-size: clamp(0.9rem, 1.5vw, 1rem);
  margin-top: 0.75em;
  color: #6b7280;
}

.login-link a {
  color: #3b82f6;
  font-weight: 500;
  text-decoration: none
}

.login-link a:hover {
  text-decoration: underline
}

</style>
