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
  <label for="mock-auth-token">Mock auth: </label>
  <input type="text" id="mock-auth-token" v-model="authStore.token" />
</template>

<style scoped>

</style>
