import { createApp } from 'vue'
import './assets/styles/base.css'
import router from './utils/router';
import App from './App.vue'
import { createPinia } from 'pinia';

const app = createApp(App);

// Install Pinia before Router so guards can use stores
app.use(createPinia());
app.use(router);
app.mount('#app');
