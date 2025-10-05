<script setup lang="ts">

import {ref} from "vue";

type Stat = {
  id: number,
  name: string,
  sub: string,
  data: number,
}

const mock: Stat = {
  id: 0,
  name: "Mock name",
  sub: "Mock sub",
  data: 0,
}

let mock_list: [Stat] = [mock];

for (let i: number = 1; i < 4; i++) {
  mock_list.push(mock);
  mock_list[i].id = i;
}

const data = ref(mock_list);

</script>

<template>
  <div class="center-container-vertical">
    <h1>Dashboard</h1>
    <ul class="data-box">
      <li v-for="d in data" class="data-item" :key="d.id">
        <h3>{{ d.name }}</h3>
        <i>{{ d.sub }}</i>
        <p>{{ d.data }}</p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.data-box {
  list-style: none;
  margin: 16px 0;
  padding: 0;
  display: flex; /* horizontal row */
  flex-wrap: nowrap; /* keep items on a single line */
  overflow-x: auto; /* horizontal scroll if too many items */
  overflow-y: hidden; /* keep inner borders inside rounded corners */
  background: #1f1f1f; /* container background */
  border: 1px solid #353535;
  border-radius: 10px;
}

.data-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4px;
  padding: 16px 18px;
  background: #2a2a2a; /* tile background */
  color: #e6e6e6;
  min-height: 92px;
  border-right: 1px solid #353535; /* vertical separator */
}

/* remove extra right border on the very last item */
.data-item:last-child { border-right: none; }

/* typography inside a tile */
.data-item h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #d3d3d3;
}

.data-item i {
  font-style: normal;
  font-size: 12px;
  color: #9aa0a6;
}

.data-item p {
  margin: 8px 0 0 0;
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
}

@media (max-width: 600px) {
  /* keep horizontal scroll on small screens; just tighten tile sizing */
  .data-item { min-height: 80px; padding: 14px 16px; }
}
</style>