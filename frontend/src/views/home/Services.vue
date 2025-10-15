<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiDirect as api } from "@/utils/api";

import useProvidersStore, { type Provider } from "@/stores/linkedproviders";

const providersStore = useProvidersStore();

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
const successMessage = ref('');

onMounted( async () => {
  await providersStore.entryPoint();
  loading.value = false;
})


async function linkProvider(provider: Provider) {
  try {
    provider.loading = true;

    // Get OAuth URL from backend (disable cache)
    const res = await api.get(`/auth/${provider.name}/url`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log('Provider URL response:', res.data);

    const { url } = res.data;

    if (!url) {
      throw new Error('No OAuth URL received');
    }

    // Redirect to OAuth provider
    window.location.href = url;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to initiate OAuth';
    console.error('Failed to link provider:', err);
    provider.loading = false;
  }
}

async function unlinkProvider(provider: Provider) {
  if (!confirm(`Are you sure you want to unlink ${provider.displayName}?`)) {
    return;
  }

  try {
    provider.loading = true;
    await api.delete(`/auth/${provider.name}/link`);
    provider.linked = false;
    successMessage.value = `Successfully disconnected from ${provider.displayName}`;
    // Clear success message after 3 seconds
    setTimeout(() => { successMessage.value = ''; }, 3000);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to unlink provider';
    console.error('Failed to unlink provider:', err);
  } finally {
    provider.loading = false;
  }
}

const gridTemplateColumns = computed(() => {
  return `repeat(3, minmax(220px, 1fr))`;
});

onMounted(() => {
  // Check for OAuth callback status in query params
  const status = route.query.status as string;
  const provider = route.query.provider as string;
  const message = route.query.message as string;

  if (status === 'success' && provider) {
    successMessage.value = `Successfully connected to ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`;
    // Clean up URL
    router.replace({ query: {} });
  } else if (status === 'error') {
    error.value = message || `Failed to connect to ${provider || 'provider'}`;
    // Clean up URL
    router.replace({ query: {} });
  }
});
</script>

<template>
  <div class="center-container-vertical">
    <h1>Connect Services</h1>

    <div v-if="loading" class="loading">Loading providers...</div>
    <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
    <div v-if="error" class="error-message">{{ error }}</div>

    <div class="services-grid">
      <div />
      <div class="services-layout" :style="{ gridTemplateColumns: gridTemplateColumns }">
        <div
          v-for="provider in providersStore.providers"
          :key="provider.name"
          class="service-box"
          :style="{ backgroundColor: provider.color, color: provider.textColor }"
        >
          <div class="service-header">
            <div v-html="provider.logo" class="service-logo"></div>
            <h3 :style="{ color: provider.textColor }">{{ provider.displayName }}</h3>
          </div>

          <i :class="['status-text', provider.linked ? 'connected' : 'disconnected']">
            {{ provider.linked ? '✓ Connected' : 'Not connected' }}
          </i>
          <div style="flex-grow: 1;" />
          <div>
            <button
                v-if="!provider.linked"
                @click="linkProvider(provider)"
                :disabled="provider.loading"
                class="service-btn connect-btn"
            >
              {{ provider.loading ? 'Connecting...' : 'Connect' }}
            </button>

            <button
                v-else
                @click="unlinkProvider(provider)"
                :disabled="provider.loading"
                class="service-btn disconnect-btn"
            >
              {{ provider.loading ? 'Disconnecting...' : 'Disconnect' }}
            </button>

          </div>
        </div>
      </div>
      <div />
    </div>
  </div>
</template>

<style scoped>
.services-grid {
  display: grid;
  grid-template-columns: 10% 80% 10%;
}

.services-layout {
  display: flex;
  grid-auto-rows: 1fr;
  flex-wrap: wrap;
  flex-direction: row;
  gap: 2rem;
  justify-content: center;
  justify-items: stretch;
  align-items: stretch;
}

.service-box {
  display: flex;
  flex-direction: column;
  height: 10rem;
  width: 20vw;
  border-radius: 1rem;
  margin: 0;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-box:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.service-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.service-logo {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.service-box h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
}

.status-text {
  font-style: normal;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 0.25rem 0;
}

.status-text.connected {
  color: #4CAF50;
}

.status-text.disconnected {
  color: #9e9e9e;
}

.service-btn {
  margin-top: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 0.5rem;
  border: 2px solid transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
  width: 100%;
}

.connect-btn {
  background-color: var(--green-2) !important;
  color: #1a1a1a !important;
  border-color: var(--green-3) !important;
}

.connect-btn:hover:not(:disabled), .connec-btn:hover:not(:disabled) {
  background-color: var(--green-3) !important;
  color: #ffffff !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.connect-btn:active:not(:disabled), .connec-btn:active:not(:disabled) {
  background-color: var(--green-1) !important;
  color: #1a1a1a !important;
}

.disconnect-btn {
  background-color: rgba(244, 67, 54, 0.1) !important;
  color: #f44336 !important;
  border-color: #f44336 !important;
}

.disconnect-btn:hover:not(:disabled) {
  background-color: #f44336 !important;
  color: white !important;
  transform: translateY(-2px);
}

.service-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading, .error-message, .success-message {
  text-align: center;
  padding: 1rem;
  margin: 1rem 0;
  border-radius: 0.5rem;
}

.error-message {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
}

.success-message {
  color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
}
</style>