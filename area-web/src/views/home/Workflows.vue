<script setup lang="ts">
import { useRoute } from "vue-router";
import interact from "interactjs";

// Route param kept (unrelated to interact logic but used by the view)
const route = useRoute();
const wid = route.params.id;


// ----- InteractJS simplified, centralized setup -----
// Selectors and grid configuration
const PALETTE_ITEM_SELECTOR = ".area";
const CANVAS_SELECTOR = ".workflow-canvas";
const GRID = { x: 30, y: 30 };

// Shared listeners using per-element dataset state
function ensureDatasetState(el: HTMLElement) {
  if (el.dataset.x == null) el.dataset.x = "0";
  if (el.dataset.y == null) el.dataset.y = "0";
}

function onDragStart(event: any) {
  const target = event.target as HTMLElement;
  ensureDatasetState(target);
}

function onDragMove(event: any) {
  const target = event.target as HTMLElement;
  const prevX = parseFloat(target.dataset.x || "0");
  const prevY = parseFloat(target.dataset.y || "0");
  const x = prevX + event.dx;
  const y = prevY + event.dy;
  target.style.transform = `translate(${x}px, ${y}px)`;
  target.dataset.x = String(x);
  target.dataset.y = String(y);
}

function getModifiers(insideCanvas: boolean) {
  const snapMod = interact.modifiers.snap({
    targets: [interact.snappers.grid({ x: GRID.x, y: GRID.y })],
    range: Infinity,
    relativePoints: [{ x: 0, y: 0 }],
  });
  const restrictMod = interact.modifiers.restrict({
    restriction: insideCanvas ? "parent" : CANVAS_SELECTOR,
    elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
    endOnly: !insideCanvas,
  });
  return [snapMod, restrictMod];
}

function applyDraggable(el: Element, insideCanvas: boolean) {
  try {
    interact(el as HTMLElement).unset();
  } catch {}
  interact(el as HTMLElement)
    .draggable({
      modifiers: getModifiers(insideCanvas),
      inertia: false,
    })
    .on("dragstart", onDragStart)
    .on("dragmove", onDragMove);
}

// Initial palette items (outside the canvas)
interact(PALETTE_ITEM_SELECTOR)
  .draggable({
    modifiers: getModifiers(false),
    inertia: false,
  })
  .on("dragstart", onDragStart)
  .on("dragmove", onDragMove);

// Dropzone: move item into canvas and reconfigure it
interact(CANVAS_SELECTOR)
  .dropzone({
    ondrop(event) {
      const dragged = event.relatedTarget as HTMLElement;
      const dropzone = event.target as HTMLElement;
      if (!dragged || !dropzone) return;

      const alreadyChild = dragged.parentElement === dropzone;
      if (alreadyChild) return; // don't reset or reconfigure existing items

      // Move into the canvas and position it absolutely at the origin
      dropzone.appendChild(dragged);
      dragged.style.position = "absolute";
      dragged.style.top = "0";
      dragged.style.left = "0";

      // Reset position state to the canvas origin
      dragged.style.transform = "translate(0px, 0px)";
      dragged.dataset.x = "0";
      dragged.dataset.y = "0";

      // Reconfigure draggable to be restricted to its parent (the canvas)
      applyDraggable(dragged, true);
    },
  })
  .on("dropactivate", function (event) {
    event.target.classList.add("drop-activated");
  });

</script>

<template>
  <div class="center-container workflow-layout">
    <div class="child workflow-left">
      <h2>ABCDE</h2>
      <div class="area">Spotify like</div>
      <div class="area">Spotify like</div>
    </div>
    <div class="workflow-canvas">
      <h1>ABCDE</h1>
    </div>
    <div class="child workflow-right">
      <h2>ABCDE</h2>
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
}

.area {
  width: 25%;
  min-height: 6.5em;
  margin: 1rem 0 0 1rem;
  background-color: #29e;
  color: white;
  border-radius: 0.75em;
  padding: 4%;
  touch-action: none;
  user-select: none;
}


</style>
