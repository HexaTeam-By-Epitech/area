<script setup lang="ts">
import useAuthStore from "@/stores/webauth";

const authStore = useAuthStore();
</script>

<template>
  <div class="home-container center-container">
    <div class="home-card">
      <h1 class="home-title">Welcome to Area!</h1>
      <p class="home-message">
        You are logged in as {{ authStore.email }}
      </p>
      <button class="logout-btn" @click="authStore.logout()">Logout</button>
    </div>
  </div>
</template>

<style scoped>

.home-container {
  width: 100vw;
}

.home-card {
  background: var(--card-bg-primary);
  padding: clamp(20px, 4vw, 40px);
  border-radius: 1em;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  text-align: center;
  min-width: 300px;
}

.home-title {
  font-size: clamp(2rem, 3vw, 2.5rem);
}

.home-message {
  font-size: clamp(1.1rem, 2vw, 1.3rem);
  margin-bottom: 2em;
}

.logout-btn {
  background: var(--button-color-error) !important;

}
.logout-btn:hover {
  background: #dc2626 !important;
  border: none;
}

</style>
