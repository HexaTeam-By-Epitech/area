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
const selectedActionProvider = ref<string | null>(null);
const selectedReactionProvider = ref<string | null>(null);
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

function getProviderSvg(providerName: string) {
  const name = providerName.toLowerCase();
  
  const svgs: Record<string, string> = {
    'google': `<svg viewBox="0 0 24 24" width="48" height="48">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>`,
    
    'gmail': `<svg viewBox="0 0 24 24" width="48" height="48">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>`,
    
    'spotify': `<svg viewBox="0 0 24 24" width="48" height="48">
      <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>`,
    
    'discord': `<svg viewBox="0 0 24 24" width="48" height="48">
      <path fill="#5865F2" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>`,
    
    'notion': `<svg viewBox="0 0 24 24" width="48" height="48">
      <path fill="#000000" d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
    </svg>`,
    
    'slack': `<svg viewBox="0 0 24 24" width="48" height="48">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
      <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>`,
    
    'default': `<svg viewBox="0 0 24 24" width="48" height="48">
      <path fill="#888888" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>`
  };
  
  return svgs[name] || svgs['default'];
}

function selectActionProvider(providerName: string, isLinked: boolean) {
  if (!isLinked) return;
  selectedActionProvider.value = providerName;
  selectedAction.value = null; // Reset action selection
  actionConfig.value = {};
}

function selectReactionProvider(providerName: string, isLinked: boolean) {
  if (!isLinked) return;
  selectedReactionProvider.value = providerName;
  selectedReaction.value = null; // Reset reaction selection
  reactionConfig.value = {};
}

function backToActionProviders() {
  selectedActionProvider.value = null;
  selectedAction.value = null;
  actionConfig.value = {};
}

function backToReactionProviders() {
  selectedReactionProvider.value = null;
  selectedReaction.value = null;
  reactionConfig.value = {};
}

async function loadActionConfigSchema(actionName: string) {
  try {
    const response = await api.get(`/manager/actions/${actionName}/config-schema`);
    return response.data || [];
  } catch (err) {
    console.error('Failed to load config schema for action:', actionName, err);
    return [];
  }
}

async function loadReactionConfigSchema(reactionName: string) {
  try {
    const response = await api.get(`/manager/reactions/${reactionName}/config-schema`);
    return response.data || [];
  } catch (err) {
    console.error('Failed to load config schema for reaction:', reactionName, err);
    return [];
  }
}

async function selectAction(action: Action, isLinked: boolean) {
  if (!isLinked) return;
  selectedAction.value = action;
  
  // Load config schema for the action
  const configSchema = await loadActionConfigSchema(action.name);
  
  // Store the config schema on the action object for template usage
  action.configSchema = configSchema;
  
  // Initialize action config based on schema with default values
  actionConfig.value = {};
  if (configSchema && configSchema.length > 0) {
    configSchema.forEach((field: ConfigField) => {
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
        
        <!-- Provider Category Selection -->
        <div v-if="!selectedActionProvider" class="provider-categories">
          <p class="category-hint">Select a service to see available triggers</p>
          <div class="category-grid">
            <div
              v-for="(providerData, providerName) in actionProviders"
              :key="providerName"
              :class="['category-card', { disabled: !providerData.isLinked }]"
              @click="selectActionProvider(providerName, providerData.isLinked)"
              @keydown.enter="selectActionProvider(providerName, providerData.isLinked)"
              @keydown.space.prevent="selectActionProvider(providerName, providerData.isLinked)"
              :tabindex="providerData.isLinked ? 0 : -1"
              role="button"
              :aria-label="`${providerName} - ${providerData.items.length} action${providerData.items.length !== 1 ? 's' : ''} available`"
            >
              <div class="category-icon" v-html="getProviderSvg(providerName)"></div>
              <h3>{{ providerName.charAt(0).toUpperCase() + providerName.slice(1) }}</h3>
              <span class="category-count">{{ providerData.items.length }} action{{ providerData.items.length !== 1 ? 's' : '' }}</span>
              <span v-if="!providerData.isLinked" class="unlinked-badge">Not linked</span>
            </div>
          </div>
        </div>

        <!-- Actions List for Selected Provider -->
        <div v-else class="provider-actions">
          <button @click="backToActionProviders" class="back-btn">← Back to Services</button>
          <div class="category-header">
            <div class="category-icon-large" v-html="getProviderSvg(selectedActionProvider)"></div>
            <div>
              <h3>{{ selectedActionProvider.charAt(0).toUpperCase() + selectedActionProvider.slice(1) }}</h3>
              <p class="category-subtitle">Choose a trigger event</p>
            </div>
          </div>
          <div class="items-list">
            <div
              v-for="action in actionProviders[selectedActionProvider]?.items"
              :key="action.name"
              :class="['item-card', { selected: selectedAction?.name === action.name }]"
              @click="selectAction(action, true)"
              @keydown.enter="selectAction(action, true)"
              @keydown.space.prevent="selectAction(action, true)"
              tabindex="0"
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
        
        <!-- Provider Category Selection -->
        <div v-if="!selectedReactionProvider" class="provider-categories">
          <p class="category-hint">Select a service to see available reactions</p>
          <div class="category-grid">
            <div
              v-for="(providerData, providerName) in reactionProviders"
              :key="providerName"
              :class="['category-card', { disabled: !providerData.isLinked }]"
              @click="selectReactionProvider(providerName, providerData.isLinked)"
              @keydown.enter="selectReactionProvider(providerName, providerData.isLinked)"
              @keydown.space.prevent="selectReactionProvider(providerName, providerData.isLinked)"
              :tabindex="providerData.isLinked ? 0 : -1"
              role="button"
              :aria-label="`${providerName} - ${providerData.items.length} reaction${providerData.items.length !== 1 ? 's' : ''} available`"
            >
              <div class="category-icon" v-html="getProviderSvg(providerName)"></div>
              <h3>{{ providerName.charAt(0).toUpperCase() + providerName.slice(1) }}</h3>
              <span class="category-count">{{ providerData.items.length }} reaction{{ providerData.items.length !== 1 ? 's' : '' }}</span>
              <span v-if="!providerData.isLinked" class="unlinked-badge">Not linked</span>
            </div>
          </div>
        </div>

        <!-- Reactions List for Selected Provider -->
        <div v-else class="provider-actions">
          <button @click="backToReactionProviders" class="back-btn">← Back to Services</button>
          <div class="category-header">
            <div class="category-icon-large" v-html="getProviderSvg(selectedReactionProvider)"></div>
            <div>
              <h3>{{ selectedReactionProvider.charAt(0).toUpperCase() + selectedReactionProvider.slice(1) }}</h3>
              <p class="category-subtitle">Choose a reaction action</p>
            </div>
          </div>
          <div class="items-list">
            <div
              v-for="reaction in reactionProviders[selectedReactionProvider]?.items"
              :key="reaction.name"
              :class="['item-card', { selected: selectedReaction?.name === reaction.name }]"
              @click="selectReaction(reaction, true)"
              @keydown.enter="selectReaction(reaction, true)"
              @keydown.space.prevent="selectReaction(reaction, true)"
              tabindex="0"
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

/* Provider Categories */
.provider-categories {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.category-hint {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
  text-align: center;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

.category-card {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(33, 150, 243, 0.2) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.category-card:hover::before {
  opacity: 1;
}

.category-card:hover {
  transform: translateY(-4px);
  border-color: rgba(76, 175, 80, 0.5);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.category-card:focus {
  outline: 2px solid #4CAF50;
  outline-offset: 2px;
}

.category-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.05);
}

.category-card.disabled:hover {
  transform: none;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.category-card.disabled::before {
  display: none;
}

.category-icon {
  margin-bottom: 0.75rem;
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 48px;
}

.category-icon svg {
  width: 48px;
  height: 48px;
  display: block;
}

.category-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  position: relative;
  z-index: 1;
}

.category-count {
  display: block;
  color: var(--text-secondary);
  font-size: 0.85rem;
  position: relative;
  z-index: 1;
}

.category-card .unlinked-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.65rem;
  padding: 0.2rem 0.5rem;
  z-index: 2;
}

/* Provider Actions View */
.provider-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.back-btn {
  align-self: flex-start;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: rgba(255, 255, 255, 0.15);
  transform: translateX(-2px);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(33, 150, 243, 0.1) 100%);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.category-icon-large {
  min-width: 60px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.category-icon-large svg {
  width: 48px;
  height: 48px;
  display: block;
}

.category-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
}

.category-subtitle {
  margin: 0.25rem 0 0 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
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
