<script setup>
import NavCard from "./NavCard.vue";
import useAuthStore from "@/stores/webauth.js";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const router = useRouter();

function logout() {
  authStore.logout();
  router.push('/');
}
</script>

<template>
  <div id="navbar">
    <div style="width: 25vw" />
    <nav>
      <NavCard :link="'/'" :msg="'Home'" />
      <NavCard v-if="!authStore.isAuth()" :link="'/webauth'" :msg="'Login'" />
      <NavCard v-if="authStore.isAuth()" :link="'/home'" :msg="'Dashboard'" />
      <NavCard v-if="authStore.isAuth()" :link="'/home/services'" :msg="'Services'" />
      <NavCard v-if="authStore.isAuth()" :link="'/home/workflows/new'" :msg="'Create AREA'" />
      <NavCard v-if="authStore.isAuth()" :link="'/home/settings'" :msg="'Settings'" />
      <button v-if="authStore.isAuth()" @click="logout" class="logout-btn">Logout</button>
    </nav>
  </div>
</template>

<style scoped>
#navbar {
  background-color: var(--card-bg-primary);
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  height: var(--header-height);
  border-bottom: solid 1px;
  border-bottom-color: var(--text-secondary);
  box-sizing: border-box;
  /* -moz-box-sizing: border-box;
  -webkit-box-sizing: border-box; */
}

#navbar nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
  margin-left: 1rem;
}

.logout-btn:hover {
  background-color: #da190b;
}
</style>
