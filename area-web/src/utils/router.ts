import { createWebHistory, createRouter } from 'vue-router'
import Home from '../views/Home.vue'
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";

const routes = [
    { path: '/', component: Home},
    { path: '/login', component: Login},
    { path: '/register', component: Register}
]

export const router = createRouter({
    history: createWebHistory(),
    routes
})
