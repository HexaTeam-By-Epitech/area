<script setup>
import NavCard from "./NavCard.vue";
import useAuthStore from "@/stores/webauth.js";

const authStore = useAuthStore();
</script>

<template>
  <div id="navbar">
    <div style="width: 25vw" />
    <nav>
      <NavCard :link="'/'" :msg="'Home'" />
      <NavCard :link="'/webauth'" :msg="'Login'" />
      <NavCard v-if="authStore.isAuth()" :link="'/home'" :msg="'Dashboard'" />
      <NavCard v-if="authStore.isAuth()" :link="'/home/services'" :msg="'Services'" />
      <NavCard v-if="authStore.isAuth()" :link="'/home/workflows'" :msg="'Workflows'" />
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
}

</style>
