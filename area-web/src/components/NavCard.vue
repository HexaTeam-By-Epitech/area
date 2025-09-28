<script setup>
const props = defineProps({
  link: String,
  msg: String
})
</script>

<template>
  <RouterLink custom v-slot="{ navigate, href }" :to="props.link" >
    <div class="nav-card" style="cursor: pointer" @click="navigate" :ref="href" role="link">
      <p>{{ props.msg }}</p>
    </div>
  </RouterLink>
</template>

<style scoped>
.nav-card {
  background: var(--button-color);
  padding-left: 2rem;
  padding-right: 2rem;
  border-radius: 5px;
  border: none;
}
</style>
