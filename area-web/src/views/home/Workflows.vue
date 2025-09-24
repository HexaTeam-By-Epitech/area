<script setup lang="ts">
import {useRoute} from "vue-router";

const route = useRoute()
const wid = route.params.id;

console.log(`'${wid}'`)

if (wid) {
  console.log("A")
} else {
  console.log("B")
}

</script>

<template>
  <div class="center-container">
    <h1>ABCDE</h1>
    <p>{{ wid }}</p>
  </div>
</template>

<style scoped>

</style>
