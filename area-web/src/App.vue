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
</style>
