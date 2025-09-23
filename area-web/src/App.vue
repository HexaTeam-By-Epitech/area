<template>
  <div id="app">
    <NavBar />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import NavBar from "./components/NavBar.vue";

const isAuthenticated = () => !!localStorage.getItem('userToken')

</script>

<style>


body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f8f9fa;
}

#app {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

</style>
