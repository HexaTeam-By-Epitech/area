<script setup>
import NavCard from "./NavCard.vue";
</script>

<template>
  <div id="navbar" class="center-container-vertical">
  <p><strong>Current route path:</strong> {{ $route.fullPath }}</p>
    <nav class="center-container" style="gap: 12px;">
      <NavCard :link="'/'" :msg="'Home'" />
      <NavCard :link="'/login'" :msg="'Login'" />
      <NavCard :link="'/register'" :msg="'Register'" />
    </nav>
    <br>
  </div>
</template>

<style scoped>
p {
  color: #1a1a1a;
}

#navbar {
  z-index: 50;
  position: fixed;
  top: 0;
}
</style>
