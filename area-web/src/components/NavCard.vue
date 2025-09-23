<script setup>
const props = defineProps({
  link: String,
  msg: String
})
</script>

<template>
  <RouterLink custom v-slot="{ navigate, href }" :to="props.link" >
    <div class="nav-card" @click="navigate" :ref="href" role="link">
      <p>{{ props.msg }}</p>
    </div>
  </RouterLink>
</template>

<style scoped>
.nav-card {
  background: #3b82f6;
  padding-left: 2rem;
  padding-right: 2rem;
  border-radius: 5px;
}
</style>
