<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { apiDirect as api } from "@/utils/api";

const route = useRoute();
const router = useRouter();
const wid = route.params.id;

type Action = {
  name: string;
  description: string;
  provider: string;
}

type Reaction = {
  name: string;
  description: string;
  provider: string;
  config_schema?: any;
}

const actions = ref<Action[]>([]);
const reactions = ref<Reaction[]>([]);
const selectedAction = ref<Action | null>(null);
const selectedReaction = ref<Reaction | null>(null);
const reactionConfig = ref<any>({});
const loading = ref(true);
const creating = ref(false);
const error = ref('');

async function loadAvailableActionsReactions() {
  try {
    loading.value = true;
    error.value = '';

    const [actionsRes, reactionsRes] = await Promise.all([
      api.get('/manager/actions'),
      api.get('/manager/reactions'),
    ]);

    actions.value = actionsRes.data || [];
    reactions.value = reactionsRes.data || [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load actions/reactions';
    console.error('Failed to load actions/reactions:', err);
  } finally {
    loading.value = false;
  }
}

function selectAction(action: Action) {
  selectedAction.value = action;
}

function selectReaction(reaction: Reaction) {
  selectedReaction.value = reaction;
  // Initialize config based on schema if available
  if (reaction.config_schema) {
    reactionConfig.value = {};
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
          <div
            v-for="action in actions"
            :key="action.name"
            :class="['item-card', { selected: selectedAction?.name === action.name }]"
            @click="selectAction(action)"
          >
            <h3>{{ action.name }}</h3>
            <p>{{ action.description }}</p>
            <small>Provider: {{ action.provider }}</small>
          </div>
        </div>
      </div>

      <!-- Arrow -->
      <div class="workflow-arrow">→</div>

      <!-- Reactions Column -->
      <div class="workflow-column">
        <h2>2. Choose a Reaction</h2>
        <div class="items-list">
          <div
            v-for="reaction in reactions"
            :key="reaction.name"
            :class="['item-card', { selected: selectedReaction?.name === reaction.name }]"
            @click="selectReaction(reaction)"
          >
            <h3>{{ reaction.name }}</h3>
            <p>{{ reaction.description }}</p>
            <small>Provider: {{ reaction.provider }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Configuration Section -->
    <div v-if="selectedReaction && selectedReaction.config_schema" class="config-section">
      <h2>3. Configure Reaction</h2>
      <div class="config-form">
        <p>Configuration options for {{ selectedReaction.name }}</p>
        <!-- Add dynamic form fields based on config_schema -->
        <textarea
          v-model="reactionConfig"
          placeholder='Enter JSON configuration, e.g., {"to": "user@example.com"}'
          class="config-input"
        ></textarea>
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

.item-card p {
  margin: 0 0 0.5rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.item-card small {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.config-section {
  background-color: var(--button-color);
  border-radius: 1rem;
  padding: 2rem;
  margin-top: 2rem;
}

.config-section h2 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.config-input {
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--text-secondary);
  background-color: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-family: monospace;
  resize: vertical;
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
