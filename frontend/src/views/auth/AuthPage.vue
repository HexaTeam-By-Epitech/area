<script setup>
import Login from "./Login.vue";
import Register from "./Register.vue";
// Removed LoggedIn placeholder to avoid one-off page after login
// import LoggedIn from "./LoggedIn.vue";
import useAuthStore from "@/stores/webauth.ts";
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

onMounted(() => {
  if (authStore.isAuth()) {
    router.replace('/home');
  }
});

// Also watch login state to redirect immediately when it flips to authenticated
watch(() => authStore.isAuth(), (isAuth) => {
  if (isAuth) {
    router.replace('/home');
  }
});
</script>

<template>
  <div class="center-container">
    <Register v-if="(authStore.page === 'register') || (authStore.page === 'waitingcode')" />
    <Login v-else />
  </div>
</template>

<style scoped>

</style>
