<template>
  <div class="home-container">
    <div class="home-card">
      <h1 class="home-title">Welcome to Area!</h1>
      <p class="home-message">
        You are logged in{{ userEmail ? ` as ${userEmail}` : '' }}.
      </p>
      <button class="logout-btn" @click="logout">Logout</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const userEmail = ref('')

onMounted(() => {
  document.title = 'Home - Area'
  userEmail.value = localStorage.getItem('userEmail') || ''
})

const logout = () => {
  localStorage.removeItem('userToken')
  localStorage.removeItem('userEmail')
  window.dispatchEvent(new CustomEvent('logout'))
}

</script>

<style scoped>

.home-container {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f8f9fa;
}

.home-card {
  background: white;
  padding: clamp(24px, 5vw, 48px);
  border-radius: 1em;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  text-align: center;
  min-width: 300px;
}

.home-title {
  font-size: clamp(2rem, 3vw, 2.5rem);
  margin-bottom: 1em;
  color: #1a1a1a;
}

.home-message {
  font-size: clamp(1.1rem, 2vw, 1.3rem);
  margin-bottom: 2em;
  color: #374151;
}

.logout-btn {
  padding: 12px 32px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.5em;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.logout-btn:hover {
  background: #dc2626;
}

</style>
