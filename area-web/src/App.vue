<template>
  <div id="app">
    <Register v-if="currentPage === 'register'" />
    <Login v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Register from './components/Register.vue'
import Login from './components/Login.vue'

const currentPage = ref('register')

const switchToLogin = () => currentPage.value = 'login'
const switchToRegister = () => currentPage.value = 'register'

onMounted(() => {
  window.addEventListener('switchToLogin', switchToLogin)
  window.addEventListener('switchToRegister', switchToRegister)
})

onUnmounted(() => {
  window.removeEventListener('switchToLogin', switchToLogin)
  window.removeEventListener('switchToRegister', switchToRegister)
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
