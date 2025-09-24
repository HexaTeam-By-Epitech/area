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
  color: rgba(255, 255, 255, 0.87);
  background:
      radial-gradient(60rem 40rem at 10% 10%, color-mix(in oklab, var(--color-palette-4) 70%, transparent) 0%, transparent 60%),
      radial-gradient(50rem 30rem at 85% 15%, color-mix(in oklab, var(--color-palette-5) 65%, transparent) 0%, transparent 55%),
      radial-gradient(40rem 30rem at 20% 85%, color-mix(in oklab, var(--color-palette-8) 55%, transparent) 0%, transparent 60%),
      linear-gradient(120deg, var(--color-palette-2), var(--color-palette-1)) fixed;
}

#app {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

</style>
