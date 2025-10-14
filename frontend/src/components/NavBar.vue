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
  padding-left: 1.2rem;
  padding-right: 1.2rem;
  border: none;
  font-weight: 500;
  font-size: 0.8rem !important;
  height: 4vh;
  width: auto;

  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary) !important;
  transition: border-bottom-color 400ms ease;
}
/*
.logout-btn:hover {
  background-color: #da190b;
}*/

</style>
