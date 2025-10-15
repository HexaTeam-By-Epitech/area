<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { apiDirect as api } from "@/utils/api";
import { useRouter } from "vue-router";
import { IonIcon } from "@ionic/vue";
import { appsOutline, checkmarkCircleOutline, linkOutline, timeOutline } from "ionicons/icons";
import useServicesStore from "@/stores/linkedproviders";

type Area = {
  id: string;
  action: string;
  reaction: string;
  config: any;
  is_active: boolean;
  created_at: string;
}

type StatCard = {
  title: string,
  subtitle: string,
  value: number,
  icon: any,
  color: string
}

const servicesStore = useServicesStore();

const router = useRouter();
const areas = ref<Area[]>([]);
const loading = ref(true);
const error = ref('');
const deleting = ref<Set<string>>(new Set());

async function loadAreas() {
  try {
    loading.value = true;
    error.value = '';

    const res = await api.get('/manager/areas');
    areas.value = res.data || [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load AREAs';
    console.error('Failed to load AREAs:', err);
  } finally {
    loading.value = false;
  }
}

async function deleteArea(areaId: string) {
  if (!confirm('Are you sure you want to delete this AREA?')) {
    return;
  }

  try {
    deleting.value.add(areaId);
    await api.delete(`/manager/areas/${areaId}`);
    areas.value = areas.value.filter(a => a.id !== areaId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete AREA';
    console.error('Failed to delete AREA:', err);
  } finally {
    deleting.value.delete(areaId);
  }
}

function createNewArea() {
  router.push('/home/workflows/new');
}

const Stats = computed<StatCard[]>(() => {
  const total = areas.value.length;
  const active = areas.value.filter((el) => el.is_active).length;
  const services = servicesStore.linkedProviders?.length ?? 0;
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const recent = areas.value.filter((a) => {
    const ts = new Date(a.created_at).getTime();
    return !Number.isNaN(ts) && (now - ts) <= weekMs;
  }).length;

  return [
    { title: "Total AREAs", subtitle: "All automations", value: total, icon: appsOutline, color: '#2196F3' },
    { title: 'Active', subtitle: 'Running now', value: active, icon: checkmarkCircleOutline, color: '#4CAF50' },
    { title: 'Services', subtitle: 'Connected', value: services, icon: linkOutline, color: '#FF9800' },
    { title: 'Recent', subtitle: 'This week', value: recent, icon: timeOutline, color: '#9C27B0' },
  ];
});

onMounted(() => {
  loadAreas();
  // Fetch providers to populate linked providers count for the Services stat
  servicesStore.fetchProviders().catch(err => console.error('Failed to fetch providers:', err));
});
</script>

<template>
  <div class="center-container-vertical">
    <div class="header">
      <h1>My AREAs</h1>
      <button @click="createNewArea" class="create-btn">+ Create AREA</button>
    </div>

    <ul class="dash-stats">
      <li v-for="card in Stats" :key="card.title" class="dash-stats-box">
        <div class="dash-icon-wrap" :style="{backgroundColor: `${card.color}20`}">
          <IonIcon :icon="card.icon" :style="{color: card.color, fontSize: '24px'}" />
        </div>
        <div>
          <h1>{{ card.value }}</h1>
        </div>
        <div class="dash-content">
          <h3>{{ card.title }}</h3>
          <h4>{{ card.subtitle }}</h4>
        </div>
      </li>
    </ul>

    <div v-if="loading" class="loading">Loading your AREAs...</div>
    <div v-if="error" class="error-message">{{ error }}</div>

    <div v-if="!loading && areas.length === 0" class="empty-state">
      <p>You don't have any AREAs yet.</p>
      <button @click="createNewArea" class="create-btn">Create your first AREA</button>
    </div>

    <div v-if="!loading && areas.length > 0" class="areas-grid">
      <div v-for="area in areas" :key="area.id" class="area-card">
        <div class="area-header">
          <span :class="['status-badge', area.is_active ? 'active' : 'inactive']">
            {{ area.is_active ? 'Active' : 'Inactive' }}
          </span>
          <button
            @click="deleteArea(area.id)"
            :disabled="deleting.has(area.id)"
            class="delete-btn"
          >
            {{ deleting.has(area.id) ? '...' : '×' }}
          </button>
        </div>

        <div class="area-content">
          <div class="area-section">
            <strong>Action:</strong>
            <span>{{ area.action }}</span>
          </div>

          <div class="area-arrow">→</div>

          <div class="area-section">
            <strong>Reaction:</strong>
            <span>{{ area.reaction }}</span>
          </div>
        </div>

        <div class="area-footer">
          <small>Created: {{ new Date(area.created_at).toLocaleDateString() }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1200px;
  margin-bottom: 2rem;
}

.create-btn {
  padding: 0.75rem 1.5rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.2s;
}

.create-btn:hover {
  background-color: #45a049;
}

.loading, .error-message, .empty-state {
  text-align: center;
  padding: 2rem;
  margin: 1rem 0;
}

.error-message {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 0.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.areas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  width: 100%;
  max-width: 1200px;
}

.area-card {
  background-color: var(--button-color);
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: transform 0.2s;
}

.area-card:hover {
  transform: translateY(-2px);
  background-color: var(--button-hover);
}

.area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-badge.active {
  background-color: #4CAF50;
  color: white;
}

.status-badge.inactive {
  background-color: #9e9e9e;
  color: white;
}

.delete-btn {
  background: none;
  border: none;
  color: #f44336;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.delete-btn:hover:not(:disabled) {
  background-color: rgba(244, 67, 54, 0.1);
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.area-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
}

.area-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.area-section strong {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.area-arrow {
  font-size: 1.5rem;
  color: var(--text-secondary);
}

.area-footer {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.area-footer small {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.dash-stats {
  list-style: none;
  padding: 0;
  margin: 0 auto 5vh;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 1000px;
}

.dash-stats-box {
  background-color: var(--card-bg-secondary);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 2px 10px rgba(0,0,0,0.15);
}

.dash-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.dash-content {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.dash-content h1 {
  margin: 0;
  color: #fff;
  font-size: 28px;
  font-weight: 800;
}

.dash-content h3 {
  margin: 4px 0 0;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.dash-content h4 {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 640px) {
  .dash-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .dash-content h1 { font-size: 24px; }
}

</style>