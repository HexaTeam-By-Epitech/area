import {createWebHistory, createRouter} from 'vue-router';
import Default from "@/views/Default.vue";
import AuthPage from "@/views/auth/AuthPage.vue";
import Services from "@/views/home/Services.vue";
import Dashboard from "@/views/home/Dashboard.vue";
import Workflows from "@/views/home/workflows/Workflows.vue";
import Settings from "@/views/home/Settings.vue";
import NotFound from "@/views/NotFound.vue";
import useAuthStore from "@/stores/webauth";


const routes = [
    {path: '/', component: Default, meta: {title: 'Area', requiresAuth: false}},
    {path: '/webauth', component: AuthPage, meta: {title: 'Area', requiresAuth: false}},
    {path: '/home', component: Dashboard, meta: {title: 'Area', requiresAuth: true}},
    {path: '/home/workflows/:id?', component: Workflows, meta: {title: 'Workflows', requiresAuth: true}},
    {path: '/home/services', component: Services, meta: {title: 'Services', requiresAuth: true}},
    {path: '/home/settings', component: Settings, meta: {title: 'Settings', requiresAuth: true}},
    {path: '/:pathMatch(.*)*', component: NotFound, meta: {title: 'Page not found', requiresAuth: false}}
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, _, next) => {
    document.title = `${to.meta.title}`;

    const authStore = useAuthStore();
    const requiresAuth = to.meta.requiresAuth;

    // Check if route requires authentication
    if (requiresAuth && !authStore.isAuth()) {
        // Redirect to login page
        next('/webauth');
    } else if (to.path === '/webauth' && authStore.isAuth()) {
        // If user is logged in and trying to access auth page, redirect to home
        next('/home');
    } else {
        next();
    }
})

export default router;
