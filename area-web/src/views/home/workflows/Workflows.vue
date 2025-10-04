<script setup lang="ts">
import { useRoute } from "vue-router";
import interact from "interactjs";
import * as myInter from "./interactFunctions";

// Route param kept (unrelated to interact logic but used by the view)
const route = useRoute();
const wid = route.params.id;

// Initial palette items (outside the canvas)
interact(myInter.PALETTE_ITEM_SELECTOR)
  .draggable({
    modifiers: myInter.getModifiers(false),
    inertia: false,
  })
  .on("dragstart", myInter.onDragStart)
  .on("dragmove", myInter.onDragMove);

// Dropzone: move item into canvas and reconfigure it
interact(myInter.CANVAS_SELECTOR)
  .dropzone({
    ondrop(event) {
      myInter.handleOnDrop(event);
    },
  })
  .on("dropactivate", function (event) {
    event.target.classList.add("drop-activated");
  });

</script>

<template>
  <div class="center-container workflow-layout">
    <div class="child workflow-left">
      <div class="area">Spotify like</div>
      <div class="area">Spotify like</div>
    </div>
    <div class="workflow-canvas">
    </div>
    <div class="child workflow-right">
      <div class="area">Send mail</div>
    </div>
  </div>
</template>

<style scoped>
.workflow-layout {
  display: grid;
  grid-template-columns: 20% 60% 20%;
}

.child {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.workflow-left {
  background-color: var(--card-bg-secondary);
  border-right: solid 1px var(--text-secondary);
  box-sizing: border-box;
}

.workflow-right {
  background-color: var(--card-bg-secondary);
  border-left: solid 1px var(--text-secondary);
  box-sizing: border-box;
}

.workflow-canvas {
  position: relative;
  overflow: hidden;
  height: 100%;
  width: inherit;
  transform-origin: top left;
}

.area {
  width: 10vw;
  height: 6vh;
  margin: 1rem 0 0 1rem;
  background-color: var(--button-color);
  color: var(--text-primary);
  border-radius: 0.75em;
  padding: 4%;
  touch-action: none;
  user-select: none;
  border: solid 1px var(--text-secondary);
}

.area:hover {
  background-color: var(--button-hover);
}

.workflow-canvas .area {
  width: 10vw;
  height: 6vh;
}


</style>
