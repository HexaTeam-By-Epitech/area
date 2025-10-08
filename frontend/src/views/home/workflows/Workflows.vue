<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiDirect as api } from "@/utils/api";
import PlaceholderInput from "@/components/PlaceholderInput.vue";

const route = useRoute();
const router = useRouter();
const wid = route.params.id;

type Action = {
  name: string;
  description: string;
}

type ConfigField = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'email';
  required: boolean;
  label?: string;
  placeholder?: string;
  defaultValue?: any;
}

type Reaction = {
  name: string;
  description: string;
  configSchema?: ConfigField[];
}

type ProviderData = {
  isLinked: boolean;
  items: Action[] | Reaction[];
}

type ProvidersMap = Record<string, ProviderData>;

type Placeholder = {
  key: string;
  description: string;
  example: string;
}

const actionProviders = ref<ProvidersMap>({});
const reactionProviders = ref<ProvidersMap>({});
const selectedAction = ref<Action | null>(null);
const selectedReaction = ref<Reaction | null>(null);
const reactionConfig = ref<any>({});
const loading = ref(true);
const creating = ref(false);
const error = ref('');
const actionPlaceholders = ref<Placeholder[]>([]);

async function loadAvailableActionsReactions() {
  try {
    loading.value = true;
    error.value = '';

    const [actionsRes, reactionsRes] = await Promise.all([
      api.get('/manager/actions'),
      api.get('/manager/reactions'),
    ]);

    actionProviders.value = actionsRes.data || {};
    reactionProviders.value = reactionsRes.data || {};
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load actions/reactions';
    console.error('Failed to load actions/reactions:', err);
  } finally {
    loading.value = false;
  }
}

async function loadActionPlaceholders(actionName: string) {
  try {
    const response = await api.get(`/manager/actions/${actionName}/placeholders`);
    actionPlaceholders.value = response.data || [];
  } catch (err) {
    console.error('Failed to load placeholders for action:', actionName, err);
    actionPlaceholders.value = [];
  }
}

function selectAction(action: Action, isLinked: boolean) {
  if (!isLinked) return;
  selectedAction.value = action;
}

// Watch for action selection changes to load placeholders
watch(selectedAction, async (newAction) => {
  if (newAction) {
    await loadActionPlaceholders(newAction.name);
  } else {
    actionPlaceholders.value = [];
  }
});

function selectReaction(reaction: Reaction, isLinked: boolean) {
  if (!isLinked) return;
  selectedReaction.value = reaction;
  // Initialize config based on schema with default values
  reactionConfig.value = {};
  if (reaction.configSchema && reaction.configSchema.length > 0) {
    reaction.configSchema.forEach(field => {
      if (field.defaultValue !== undefined) {
        reactionConfig.value[field.name] = field.defaultValue;
      } else {
        reactionConfig.value[field.name] = '';
      }
    });
  }
}

async function createArea() {
  if (!selectedAction.value || !selectedReaction.value) {
    error.value = 'Please select both an action and a reaction';
    return;
  }

  try {
    creating.value = true;
    error.value = '';

    await api.post('/manager/areas', {
      actionName: selectedAction.value.name,
      reactionName: selectedReaction.value.name,
      config: reactionConfig.value,
    });

    // Redirect to dashboard
    router.push('/home');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create AREA';
    console.error('Failed to create AREA:', err);
  } finally {
    creating.value = false;
  }
}

function cancel() {
  router.push('/home');
}

onMounted(() => {
  loadAvailableActionsReactions();
});
</script>

<template>
  <div class="workflow-container">
    <div class="workflow-header">
      <h1>Create New AREA</h1>
      <div class="header-actions">
        <button @click="cancel" class="cancel-btn">Cancel</button>
        <button
          @click="createArea"
          :disabled="!selectedAction || !selectedReaction || creating"
          class="create-btn"
        >
          {{ creating ? 'Creating...' : 'Create AREA' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading available actions and reactions...</div>
    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="!loading" class="workflow-layout">
      <!-- Actions Column -->
      <div class="workflow-column">
        <h2>1. Choose an Action (Trigger)</h2>
        <div class="items-list">
          <div v-for="(providerData, providerName) in actionProviders" :key="providerName" class="provider-group">
            <div class="provider-header">
              <h3>{{ providerName.charAt(0).toUpperCase() + providerName.slice(1) }}</h3>
              <span v-if="!providerData.isLinked" class="unlinked-badge">Not linked</span>
            </div>
            <div
              v-for="action in providerData.items"
              :key="action.name"
              :class="[
                'item-card',
                { selected: selectedAction?.name === action.name },
                { disabled: !providerData.isLinked }
              ]"
              @click="selectAction(action, providerData.isLinked)"
            >
              <h4>{{ action.name }}</h4>
              <p>{{ action.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrow -->
      <div class="workflow-arrow">→</div>

      <!-- Reactions Column -->
      <div class="workflow-column">
        <h2>2. Choose a Reaction</h2>
        <div class="items-list">
          <div v-for="(providerData, providerName) in reactionProviders" :key="providerName" class="provider-group">
            <div class="provider-header">
              <h3>{{ providerName.charAt(0).toUpperCase() + providerName.slice(1) }}</h3>
              <span v-if="!providerData.isLinked" class="unlinked-badge">Not linked</span>
            </div>
            <div
              v-for="reaction in providerData.items"
              :key="reaction.name"
              :class="[
                'item-card',
                { selected: selectedReaction?.name === reaction.name },
                { disabled: !providerData.isLinked }
              ]"
              @click="selectReaction(reaction, providerData.isLinked)"
            >
              <h4>{{ reaction.name }}</h4>
              <p>{{ reaction.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Section -->
    <div v-if="selectedReaction && selectedReaction.configSchema && selectedReaction.configSchema.length > 0" class="config-section">
      <h2>3. Configure Reaction</h2>
      <div v-if="selectedAction && actionPlaceholders.length > 0" class="placeholder-hint">
        💡 Type <code v-text="'{{'"></code> to insert placeholders from the selected action
      </div>
      <div class="config-form">
        <div v-for="field in selectedReaction.configSchema" :key="field.name" class="form-field">
          <label :for="field.name">
            {{ field.label || field.name }}
            <span v-if="field.required" class="required">*</span>
          </label>

          <!-- Text/Email input with placeholder autocomplete -->
          <PlaceholderInput
            v-if="field.type === 'string' || field.type === 'email'"
            :id="field.name"
            :type="field.type === 'email' ? 'email' : 'text'"
            v-model="reactionConfig[field.name]"
            :placeholder="field.placeholder || ''"
            :required="field.required"
            :placeholders="actionPlaceholders"
          />

          <!-- Number input -->
          <input
            v-else-if="field.type === 'number'"
            :id="field.name"
            type="number"
            v-model.number="reactionConfig[field.name]"
            :placeholder="field.placeholder || ''"
            :required="field.required"
            class="config-input"
          />

          <!-- Boolean checkbox -->
          <input
            v-else-if="field.type === 'boolean'"
            :id="field.name"
            type="checkbox"
            v-model="reactionConfig[field.name]"
            class="config-checkbox"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.workflow-header h1 {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.cancel-btn, .create-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.cancel-btn {
  background-color: #757575;
  color: white;
}

.cancel-btn:hover {
  background-color: #616161;
}

.create-btn {
  background-color: #4CAF50;
  color: white;
}

.create-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading, .error-message {
  text-align: center;
  padding: 2rem;
  margin: 1rem 0;
}

.error-message {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 0.5rem;
}

.workflow-layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.workflow-arrow {
  display: flex;
  align-items: center;
  font-size: 3rem;
  color: var(--text-secondary);
}

.workflow-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.workflow-column h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.item-card {
  background-color: var(--button-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.item-card:hover {
  background-color: var(--button-hover);
  transform: translateY(-2px);
}

.item-card.selected {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.1);
}

.item-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.item-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.item-card p {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.item-card small {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.item-card.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: var(--button-color);
}

.item-card.disabled:hover {
  transform: none;
  background-color: var(--button-color);
}

.provider-group {
  margin-bottom: 1.5rem;
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 0.5rem;
  margin-bottom: 0.75rem;
}

.provider-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.unlinked-badge {
  background-color: #f44336;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.config-section {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 2rem;
  margin-top: 2rem;
}

.config-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
}

.placeholder-hint {
  background-color: rgba(76, 175, 80, 0.1);
  border-left: 3px solid #4CAF50;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0.25rem;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.placeholder-hint code {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
  font-family: monospace;
  color: #4CAF50;
  font-weight: 600;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-field .required {
  color: #f44336;
  margin-left: 0.25rem;
}

.config-input {
  width: 100%;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--text-secondary);
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.config-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.config-checkbox {
  width: 1.5rem;
  height: 1.5rem;
  cursor: pointer;
}

@media (max-width: 900px) {
  .workflow-layout {
    grid-template-columns: 1fr;
  }

  .workflow-arrow {
    transform: rotate(90deg);
    justify-content: center;
  }
}
</style>
