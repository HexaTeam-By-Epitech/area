<script setup>
import Login from "./Login.vue";
import Register from "./Register.vue";
import LoggedIn from "./LoggedIn.vue";
import useAuthStore from "@/stores/webauth.ts";

const authStore = useAuthStore();
</script>

<template>
  <div class="center-container">
    <LoggedIn v-if="authStore.page === 'logged'" />
    <Register v-else-if="(authStore.page === 'register') || (authStore.page === 'waitingcode')" />
    <Login v-else />
  </div>
</template>

<style scoped>

</style>
