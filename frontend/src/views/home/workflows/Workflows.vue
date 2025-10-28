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
  configSchema?: ConfigField[];
}

type ConfigField = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'email';
  required: boolean;
  label?: string;
  placeholder?: string;
  defaultValue?: any;
}

type NotionDatabase = {
  id: string;
  title: string;
  url: string;
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
const actionConfig = ref<any>({});
const reactionConfig = ref<any>({});
const loading = ref(true);
const creating = ref(false);
const error = ref('');
const actionPlaceholders = ref<Placeholder[]>([]);
const notionDatabases = ref<NotionDatabase[]>([]);
const loadingNotionDatabases = ref(false);

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

async function loadNotionDatabases() {
  try {
    loadingNotionDatabases.value = true;
    console.log('[Notion] Loading databases...');
    const response = await api.get('/actions/notion/databases');
    console.log('[Notion] Response:', response.data);
    if (response.data.databases) {
      notionDatabases.value = response.data.databases;
      console.log('[Notion] Loaded databases:', notionDatabases.value.length);
    } else {
      console.warn('[Notion] No databases field in response');
    }
  } catch (err) {
    console.error('Failed to load Notion databases:', err);
    notionDatabases.value = [];
  } finally {
    loadingNotionDatabases.value = false;
  }
}

async function loadNotionDatabaseSchema(databaseId: string) {
  try {
    const response = await api.get(`/actions/notion/databases/${databaseId}/schema`);
    if (response.data.baseProperties && response.data.properties) {
      // Combine base properties with dynamic properties
      const basePlaceholders = response.data.baseProperties.map((prop: any) => ({
        key: prop.key,
        description: prop.description,
        example: prop.example || ''
      }));
      
      const dynamicPlaceholders = response.data.properties.map((prop: any) => ({
        key: prop.placeholderKey,
        description: `${prop.name} (${prop.type})`,
        example: ''
      }));
      
      actionPlaceholders.value = [...basePlaceholders, ...dynamicPlaceholders];
    }
  } catch (err) {
    console.error('Failed to load Notion database schema:', err);
    actionPlaceholders.value = [];
  }
}

function selectAction(action: Action, isLinked: boolean) {
  if (!isLinked) return;
  console.log('[Action] Selected:', action.name, 'Config schema:', action.configSchema);
  selectedAction.value = action;
  
  // Initialize action config based on schema with default values
  actionConfig.value = {};
  if (action.configSchema && action.configSchema.length > 0) {
    action.configSchema.forEach(field => {
      if (field.defaultValue !== undefined) {
        actionConfig.value[field.name] = field.defaultValue;
      } else {
        actionConfig.value[field.name] = '';
      }
    });
  }
  
  // Load Notion databases if it's a Notion action
  if (action.name === 'notion_new_database_item') {
    console.log('[Action] This is a Notion action, loading databases...');
    loadNotionDatabases();
  }
}

// Watch for action selection changes to load placeholders
watch(selectedAction, async (newAction) => {
  if (newAction) {
    // Don't load default placeholders for Notion - we'll load them when database is selected
    if (newAction.name !== 'notion_new_database_item') {
      await loadActionPlaceholders(newAction.name);
    }
  } else {
    actionPlaceholders.value = [];
  }
});

// Watch for Notion database selection to load schema
watch(() => actionConfig.value.databaseId, async (newDatabaseId) => {
  if (newDatabaseId && selectedAction.value?.name === 'notion_new_database_item') {
    await loadNotionDatabaseSchema(newDatabaseId);
  }
});

async function loadReactionConfigSchema(reactionName: string) {
  try {
    const response = await api.get(`/manager/reactions/${reactionName}/config-schema`);
    return response.data || [];
  } catch (err) {
    console.error('Failed to load config schema for reaction:', reactionName, err);
    return [];
  }
}

async function selectReaction(reaction: Reaction, isLinked: boolean) {
  if (!isLinked) return;
  selectedReaction.value = reaction;
  
  // Load config schema for the reaction
  const configSchema = await loadReactionConfigSchema(reaction.name);
  
  // Store the config schema on the reaction object for template usage
  reaction.configSchema = configSchema;
  
  // Initialize config based on schema with default values
  reactionConfig.value = {};
  if (configSchema && configSchema.length > 0) {
    configSchema.forEach((field: ConfigField) => {
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
      actionConfig: actionConfig.value,
      reactionConfig: reactionConfig.value,
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

// Navigation functions for arrow key movement
function navigateActions(direction: 'up' | 'down', currentProvider: string, currentIndex: number) {
  const allActions: { provider: string; action: Action; index: number }[] = [];

  // Build flat list of all actions with their provider info
  Object.entries(actionProviders.value).forEach(([providerName, providerData]) => {
    if (providerData.isLinked) {
      providerData.items.forEach((action, index) => {
        allActions.push({
          provider: providerName,
          action: action as Action,
          index
        });
      });
    }
  });

  // Find current action in flat list
  const currentActionIndex = allActions.findIndex(
    item => item.provider === currentProvider && item.index === currentIndex
  );

  if (currentActionIndex === -1) return;

  // Navigate up or down
  let newIndex = currentActionIndex;
  if (direction === 'up' && currentActionIndex > 0) {
    newIndex = currentActionIndex - 1;
  } else if (direction === 'down' && currentActionIndex < allActions.length - 1) {
    newIndex = currentActionIndex + 1;
  }

  // Focus the new action card
  if (newIndex !== currentActionIndex) {
    const newAction = allActions[newIndex];
    selectAction(newAction.action, true);

    // Focus the DOM element
    setTimeout(() => {
      const selector = `.workflow-column:first-child .item-card[aria-label*="${newAction.action.name}"]`;
      const element = document.querySelector(selector) as HTMLElement;
      if (element) element.focus();
    }, 10);
  }
}

function navigateReactions(direction: 'up' | 'down', currentProvider: string, currentIndex: number) {
  const allReactions: { provider: string; reaction: Reaction; index: number }[] = [];

  // Build flat list of all reactions with their provider info
  Object.entries(reactionProviders.value).forEach(([providerName, providerData]) => {
    if (providerData.isLinked) {
      providerData.items.forEach((reaction, index) => {
        allReactions.push({
          provider: providerName,
          reaction: reaction as Reaction,
          index
        });
      });
    }
  });

  // Find current reaction in flat list
  const currentReactionIndex = allReactions.findIndex(
    item => item.provider === currentProvider && item.index === currentIndex
  );

  if (currentReactionIndex === -1) return;

  // Navigate up or down
  let newIndex = currentReactionIndex;
  if (direction === 'up' && currentReactionIndex > 0) {
    newIndex = currentReactionIndex - 1;
  } else if (direction === 'down' && currentReactionIndex < allReactions.length - 1) {
    newIndex = currentReactionIndex + 1;
  }

  // Focus the new reaction card
  if (newIndex !== currentReactionIndex) {
    const newReaction = allReactions[newIndex];
    selectReaction(newReaction.reaction, true);

    // Focus the DOM element
    setTimeout(() => {
      const selector = `.workflow-column:last-child .item-card[aria-label*="${newReaction.reaction.name}"]`;
      const element = document.querySelector(selector) as HTMLElement;
      if (element) element.focus();
    }, 10);
  }
}

function navigateToReactions() {
  // Focus first available reaction
  const firstReactionProvider = Object.entries(reactionProviders.value).find(
    ([_, providerData]) => providerData.isLinked && providerData.items.length > 0
  );

  if (firstReactionProvider) {
    const [providerName, providerData] = firstReactionProvider;
    const firstReaction = providerData.items[0] as Reaction;
    selectReaction(firstReaction, true);

    setTimeout(() => {
      const selector = `.workflow-column:last-child .item-card[aria-label*="${firstReaction.name}"]`;
      const element = document.querySelector(selector) as HTMLElement;
      if (element) element.focus();
    }, 10);
  }
}

function navigateToActions() {
  // Focus first available action
  const firstActionProvider = Object.entries(actionProviders.value).find(
    ([_, providerData]) => providerData.isLinked && providerData.items.length > 0
  );

  if (firstActionProvider) {
    const [providerName, providerData] = firstActionProvider;
    const firstAction = providerData.items[0] as Action;
    selectAction(firstAction, true);

    setTimeout(() => {
      const selector = `.workflow-column:first-child .item-card[aria-label*="${firstAction.name}"]`;
      const element = document.querySelector(selector) as HTMLElement;
      if (element) element.focus();
    }, 10);
  }
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

    <div v-if="loading" class="loading" role="status" aria-live="polite" aria-label="Loading available actions and reactions">Loading available actions and reactions...</div>
    <div v-if="error" class="error-message" role="alert" aria-live="assertive" :aria-label="error">{{ error }}</div>

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
              v-for="(action, actionIndex) in providerData.items"
              :key="action.name"
              :class="[
                'item-card',
                { selected: selectedAction?.name === action.name },
                { disabled: !providerData.isLinked }
              ]"
              @click="selectAction(action, providerData.isLinked)"
              @keydown.enter="selectAction(action, providerData.isLinked)"
              @keydown.space.prevent="selectAction(action, providerData.isLinked)"
              :tabindex="providerData.isLinked ? 0 : -1"
              role="button"
              :aria-label="`Select action: ${action.name}. ${action.description}`"
              :aria-pressed="selectedAction?.name === action.name"
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
              v-for="(reaction, reactionIndex) in providerData.items"
              :key="reaction.name"
              :class="[
                'item-card',
                { selected: selectedReaction?.name === reaction.name },
                { disabled: !providerData.isLinked }
              ]"
              @click="selectReaction(reaction, providerData.isLinked)"
              @keydown.enter="selectReaction(reaction, providerData.isLinked)"
              @keydown.space.prevent="selectReaction(reaction, providerData.isLinked)"
              :tabindex="providerData.isLinked ? 0 : -1"
              role="button"
              :aria-label="`Select reaction: ${reaction.name}. ${reaction.description}`"
              :aria-pressed="selectedReaction?.name === reaction.name"
            >
              <h4>{{ reaction.name }}</h4>
              <p>{{ reaction.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Configuration Section -->
    <div v-if="selectedAction && selectedAction.configSchema && selectedAction.configSchema.length > 0" class="config-section">
      <h2>2. Configure Action</h2>
      <div class="config-form">
        <div v-for="field in selectedAction.configSchema" :key="field.name" class="form-field">
          <label :for="'action-' + field.name">
            {{ field.label || field.name }}
            <span v-if="field.required" class="required">*</span>
          </label>

          <!-- Special dropdown for Notion database selection -->
          <div v-if="selectedAction.name === 'notion_new_database_item' && field.name === 'databaseId'">
            <select
              :id="'action-' + field.name"
              v-model="actionConfig[field.name]"
              :required="field.required"
              class="config-input"
              :disabled="loadingNotionDatabases"
            >
              <option value="">{{ loadingNotionDatabases ? 'Loading databases...' : 'Select a database' }}</option>
              <option v-for="db in notionDatabases" :key="db.id" :value="db.id">
                {{ db.title }}
              </option>
            </select>
            <small v-if="actionConfig[field.name]" class="field-hint">
              Database selected. Placeholders will be available for reactions below.
            </small>
          </div>

          <!-- Default input types for other fields -->
          <input
            v-else-if="field.type === 'string' || field.type === 'email'"
            :id="'action-' + field.name"
            :type="field.type === 'email' ? 'email' : 'text'"
            v-model="actionConfig[field.name]"
            :placeholder="field.placeholder || ''"
            :required="field.required"
            class="config-input"
          />

          <input
            v-else-if="field.type === 'number'"
            :id="'action-' + field.name"
            type="number"
            v-model.number="actionConfig[field.name]"
            :placeholder="field.placeholder || ''"
            :required="field.required"
            class="config-input"
          />

          <input
            v-else-if="field.type === 'boolean'"
            :id="'action-' + field.name"
            type="checkbox"
            v-model="actionConfig[field.name]"
            class="config-checkbox"
          />
        </div>
      </div>
    </div>

    <!-- Configuration Section -->
    <div v-if="selectedReaction && selectedReaction.configSchema && selectedReaction.configSchema.length > 0" class="config-section">
      <h2>{{ selectedAction && selectedAction.configSchema && selectedAction.configSchema.length > 0 ? '3' : '2' }}. Configure Reaction</h2>
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

/* Focus styles for keyboard navigation */
.item-card:focus {
  outline: 2px solid var(--accent-color, #4CAF50);
  outline-offset: 2px;
  background-color: var(--button-hover);
}

.item-card:focus-visible {
  outline: 2px solid var(--accent-color, #4CAF50);
  outline-offset: 2px;
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

.field-hint {
  display: block;
  margin-top: 0.5rem;
  color: #4CAF50;
  font-size: 0.85rem;
  font-style: italic;
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
