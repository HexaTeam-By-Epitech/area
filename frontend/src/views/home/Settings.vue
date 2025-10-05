<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiDirect as api } from "@/utils/api";
import useAuthStore from "@/stores/webauth";

type IdentityProvider = {
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
const authStore = useAuthStore();
const identityProviders = ref<IdentityProvider[]>([]);
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
};

// Available identity providers (currently only Google supports identity linking)
const availableIdentityProviders = ['google'];

async function loadIdentityProviders() {
  try {
    loading.value = true;
    error.value = '';

    // Fetch linked identity providers from backend
    const linkedRes = await api.get('/auth/linked-identities');
    const linkedProviders = linkedRes.data?.providers || [];

    console.log('Linked identity providers:', linkedProviders);

    identityProviders.value = availableIdentityProviders.map((name: string) => {
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
    error.value = err instanceof Error ? err.message : 'Failed to load identity providers';
    console.error('Failed to load identity providers:', err);
  } finally {
    loading.value = false;
  }
}

async function linkIdentity(provider: IdentityProvider) {
  try {
    provider.loading = true;
    error.value = '';

    // Get OAuth URL from backend for identity linking
    const res = await api.get(`/auth/${provider.name}/login/url`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log('Identity linking URL response:', res.data);

    const { url } = res.data;

    if (!url) {
      throw new Error('No OAuth URL received');
    }

    // Redirect to OAuth provider for identity linking
    window.location.href = url;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to initiate identity linking';
    console.error('Failed to link identity:', err);
    provider.loading = false;
  }
}

async function unlinkIdentity(provider: IdentityProvider) {
  if (!confirm(`Are you sure you want to unlink ${provider.displayName}? You won't be able to sign in with ${provider.displayName} anymore.`)) {
    return;
  }

  try {
    provider.loading = true;
    await api.delete(`/auth/${provider.name}/identity`);
    provider.linked = false;
    successMessage.value = `Successfully unlinked ${provider.displayName}`;

    // Clear success message after 3 seconds
    setTimeout(() => { successMessage.value = ''; }, 3000);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to unlink identity';
    console.error('Failed to unlink identity:', err);
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
    successMessage.value = `Successfully linked ${provider.charAt(0).toUpperCase() + provider.slice(1)} to your account!`;
    // Clean up URL
    router.replace({ query: {} });
    // Reload providers to update linked status
    loadIdentityProviders();
  } else if (status === 'error') {
    error.value = message || `Failed to link ${provider || 'provider'}`;
    // Clean up URL
    router.replace({ query: {} });
  } else {
    loadIdentityProviders();
  }
});
</script>

<template>
  <div class="settings-container">
    <h1>Account Settings</h1>

    <section class="settings-section">
      <h2>Sign-in Methods</h2>
      <p class="section-description">
        Manage how you sign in to your account. You can link multiple sign-in methods for convenience.
      </p>

      <div v-if="loading" class="loading">Loading sign-in methods...</div>
      <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
      <div v-if="error" class="error-message">{{ error }}</div>

      <div class="identity-providers-list">
        <div
          v-for="provider in identityProviders"
          :key="provider.name"
          class="identity-provider-card"
          :style="{ backgroundColor: provider.color, color: provider.textColor }"
        >
          <div class="provider-info">
            <div class="provider-header">
              <div v-html="provider.logo" class="provider-logo"></div>
              <div class="provider-details">
                <h3 :style="{ color: provider.textColor }">{{ provider.displayName }}</h3>
                <p :class="['status-text', provider.linked ? 'linked' : 'not-linked']">
                  {{ provider.linked ? '✓ Linked' : 'Not linked' }}
                </p>
              </div>
            </div>
          </div>

          <div class="provider-actions">
            <button
              v-if="!provider.linked"
              @click="linkIdentity(provider)"
              :disabled="provider.loading"
              class="provider-btn link-btn"
            >
              {{ provider.loading ? 'Linking...' : 'Link Account' }}
            </button>

            <button
              v-else
              @click="unlinkIdentity(provider)"
              :disabled="provider.loading"
              class="provider-btn unlink-btn"
            >
              {{ provider.loading ? 'Unlinking...' : 'Unlink' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h2>Account Information</h2>
      <div class="account-info">
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">{{ authStore.email }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">User ID:</span>
          <span class="info-value">{{ authStore.userId }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-container {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.settings-container h1 {
  margin-bottom: 2rem;
}

.settings-section {
  background-color: var(--card-bg-primary);
  border-radius: 1rem;
  padding: 2rem;
  margin-bottom: 2rem;
}

.settings-section h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.section-description {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
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

.identity-providers-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.identity-provider-card {
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.identity-provider-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.provider-info {
  flex: 1;
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.provider-logo {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.provider-details h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.status-text {
  font-style: normal;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 0.25rem;
}

.status-text.linked {
  color: #4CAF50;
}

.status-text.not-linked {
  color: #9e9e9e;
}

.provider-actions {
  display: flex;
  gap: 0.5rem;
}

.provider-btn {
  padding: 0.65rem 1.5rem;
  border-radius: 0.5rem;
  border: 2px solid transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.link-btn {
  background-color: rgba(255, 255, 255, 0.95);
  color: #1a1a1a;
  border-color: rgba(255, 255, 255, 0.2);
}

.link-btn:hover:not(:disabled) {
  background-color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.unlink-btn {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
  border-color: #f44336;
}

.unlink-btn:hover:not(:disabled) {
  background-color: #f44336;
  color: white;
  transform: translateY(-2px);
}

.provider-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 0.5rem;
}

.info-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.info-value {
  color: var(--text-primary);
  font-family: monospace;
}

@media (max-width: 600px) {
  .identity-provider-card {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }

  .provider-actions {
    width: 100%;
  }

  .provider-btn {
    flex: 1;
  }
}
</style>
