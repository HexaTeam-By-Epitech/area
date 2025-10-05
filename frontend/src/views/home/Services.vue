<script setup lang="ts">

import {ref} from "vue";

type Service = {
  id: number,
  cat: string,
  name: string
}

const mock: Service = {
  id: 0,
  cat: "Mock desc",
  name: "Mock name",
};

let mock_list: [Service] = [mock];

for (let i: number = 1; i < 17; i++) {
  mock_list.push(mock);
  mock_list[i].id = i;
}

const data = ref(mock_list);

</script>

<template>
  <h1>Page to connect to services</h1>
  <div class="services-grid">
    <div />
    <div class="services-layout">
      <div v-for="d in data" class="service-box" :key="d.id">
        <h3>{{ d.name }}</h3>
        <i>{{ d.cat }}</i>
      </div>
    </div>
    <div />
  </div>
  <div style="height: 10vh;" />
</template>

<style scoped>
.services-grid {
  display: grid;
  grid-template-columns: 10% 80% 10%;
}


.services-layout {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}

.service-box {
  border-radius: 1rem;
  background-color: var(--button-color);
  margin: 1.5vh 1.5vw;
  padding: 1vh 1.5vw;
  height: 15vh;
  width: 15vw;
  min-height: 100px;
  min-width: 150px;
}

.service-box:hover {
  background-color: var(--button-hover);
}

</style>