<script setup>
const props = defineProps({
  link: String,
  msg: String,
  disabled: Boolean,
})
</script>

<template>
  <RouterLink custom v-slot="{ navigate, href, isActive}" :to="props.link">
    <div
        :class="['nav-card', 'center-container', 'prevent-select', {'active': isActive}]"
        style="cursor: pointer"
        @click="navigate" :ref="href" role="link">
      <p>{{ props.msg }}</p>
    </div>
  </RouterLink>
</template>

<style>
.nav-card {
  background: transparent;
  color: var(--button-color);
  padding-left: 1.2rem;
  padding-right: 1.2rem;
  border: none;
  border-bottom: 2px solid transparent;
  font-weight: 500;
  font-size: 0.8rem;
  height: 4vh;
  width: auto;

  transition: border-bottom-color 400ms ease;
}


.nav-card.active,
.nav-card:hover {
  border-bottom-color: var(--button-color);
}

</style>
