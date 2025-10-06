<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiDirect as api } from "@/utils/api";

type Provider = {
  name: string;
  displayName: string;
  linked: boolean;
  loading: boolean;
  logo: string;
  color: string;
  textColor: string;
}

const route = useRoute();
const router = useRouter();
const providers = ref<Provider[]>([]);
const loading = ref(true);
const error = ref('');
const successMessage = ref('');

const providerConfig: Record<string, { displayName: string; logo: string; color: string; textColor: string }> = {
  google: {
    displayName: 'Google',
    logo: `<svg viewBox="0 0 24 24" width="32" height="32">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>`,
    color: '#ffffff',
    textColor: '#1a1a1a'
  },
  spotify: {
    displayName: 'Spotify',
    logo: `<svg viewBox="0 0 24 24" width="32" height="32">
      <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>`,
    color: '#191414',
    textColor: '#ffffff'
  },
};

async function loadProviders() {
  try {
    loading.value = true;
    error.value = '';

    // Fetch available providers and linked providers in parallel
    const [providersRes, linkedRes] = await Promise.all([
      api.get('/auth/providers'),
      api.get('/auth/linked-providers')
    ]);

    const providersData = providersRes.data;

    if (!providersData.providers || !Array.isArray(providersData.providers)) {
      throw new Error('Invalid providers response');
    }

    const linkedProviders = linkedRes.data.providers || [];

    // Initialize providers array with linked status
    providers.value = providersData.providers.map((name: string) => {
      const config = providerConfig[name] || {
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        logo: '',
        color: '#2a2a2a',
        textColor: '#ffffff'
      };
      return {
        name,
        displayName: config.displayName,
        linked: linkedProviders.includes(name),
        loading: false,
        logo: config.logo,
        color: config.color,
        textColor: config.textColor,
      };
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load providers';
    console.error('Failed to load providers:', err);
  } finally {
    loading.value = false;
  }
}

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

  loadProviders();
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
      <div class="services-layout">
        <div
          v-for="provider in providers"
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
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}

.service-box {
  border-radius: 1rem;
  margin: 1.5vh 1.5vw;
  padding: 1.5rem;
  min-height: 180px;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.75rem;
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
}

.connect-btn {
  background-color: rgba(255, 255, 255, 0.95);
  color: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.2);
}

.connect-btn:hover:not(:disabled) {
  background-color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.disconnect-btn {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border-color: #f44336;
}

.disconnect-btn:hover:not(:disabled) {
  background-color: #f44336;
  color: white;
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