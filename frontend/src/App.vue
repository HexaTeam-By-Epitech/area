<script setup lang="ts">
import NavBar from "./components/NavBar.vue";
import { storeToRefs } from 'pinia';
import useToastStore from './stores/toast';

const toast = useToastStore();
const { visible, message, type } = storeToRefs(toast);
</script>

<template>
  <div id="app">
    <NavBar />
    <RouterView />

    <transition name="toast-fade">
      <div v-if="visible" class="toast" :class="`toast-${type}`" role="status" aria-live="polite">
        {{ message }}
      </div>
    </transition>
  </div>
</template>

<style>
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 1000;
  max-width: 80vw;
}
.toast-success { background: rgba(46, 125, 50, 0.95); }
.toast-error { background: rgba(198, 40, 40, 0.95); }
.toast-info { background: rgba(25, 118, 210, 0.95); }
.toast-warning { background: rgba(249, 168, 37, 0.95); }

.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity .2s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
</style>
