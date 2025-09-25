<script setup>
const props = defineProps({
  link: String,
  msg: String
})
</script>

<template>
  <RouterLink custom v-slot="{ navigate, href }" :to="props.link" >
    <div class="nav-card center-container prevent-select" style="cursor: pointer" @click="navigate" :ref="href" role="link">
      <p>{{ props.msg }}</p>
    </div>
  </RouterLink>
</template>

<style>
.nav-card {
  background: var(--button-color);
  color: var(--text-primary);
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 5px;
  border: none;
  font-weight: 500;
  font-size: 0.75rem;
  height: 4vh;
  width: auto;
}

.nav-card:hover {
  background-color: var(--button-hover);
}

</style>
