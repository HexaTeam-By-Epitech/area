<template>
  <div id="app">
    <Home v-if="currentPage === 'home'" />
    <Register v-else-if="currentPage === 'register'" />
    <Login v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Register from './components/Register.vue'
import Login from './components/Login.vue'
import Home from './components/Home.vue'

const isAuthenticated = () => !!localStorage.getItem('userToken')
const currentPage = ref(isAuthenticated() ? 'home' : 'register')

const switchToLogin = () => currentPage.value = 'login'
const switchToRegister = () => currentPage.value = 'register'
const switchToHome = () => currentPage.value = 'home'
const handleLogout = () => {
  currentPage.value = 'login'
}

onMounted(() => {
  window.addEventListener('switchToLogin', switchToLogin)
  window.addEventListener('switchToRegister', switchToRegister)
  window.addEventListener('loginSuccess', switchToHome)
  window.addEventListener('logout', handleLogout)
})
onUnmounted(() => {
  window.removeEventListener('switchToLogin', switchToLogin)
  window.removeEventListener('switchToRegister', switchToRegister)
  window.removeEventListener('loginSuccess', switchToHome)
  window.removeEventListener('logout', handleLogout)
})
</script>

<style>
/* Reset global */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  width: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f8f9fa;
}

#app {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

</style>
