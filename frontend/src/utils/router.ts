import {createWebHistory, createRouter} from 'vue-router';
// Removed Default landing to favor Dashboard as default
// import Default from "@/views/Default.vue";
import AuthPage from "@/views/auth/AuthPage.vue";
import Services from "@/views/home/Services.vue";
import Dashboard from "@/views/home/Dashboard.vue";
import Workflows from "@/views/home/workflows/Workflows.vue";
import Settings from "@/views/home/Settings.vue";
import NotFound from "@/views/NotFound.vue";
import useAuthStore from "@/stores/webauth";


const routes = [
    { path: '/', redirect: '/home' },
    {path: '/webauth', component: AuthPage, meta: {title: 'Area | Login', requiresAuth: false}},
    {path: '/home', component: Dashboard, meta: {title: 'Area | Dashboard', requiresAuth: true}},
    {path: '/home/workflows/:id?', component: Workflows, meta: {title: 'Area | Workflows', requiresAuth: true}},
    {path: '/home/services', component: Services, meta: {title: 'Area | Services', requiresAuth: true}},
    {path: '/home/settings', component: Settings, meta: {title: 'Area | Settings', requiresAuth: true}},
    {path: '/:pathMatch(.*)*', component: NotFound, meta: {title: 'Area | Page not found', requiresAuth: false}}
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
        // Force logout to clear any stale token/state
        authStore.logout();
        // Redirect to login page
        next('/webauth');
        return;
    } else if (to.path === '/webauth' && authStore.isAuth()) {
        // If user is logged in and trying to access auth page, redirect to home
        next('/home');
        return;
    } else {
        next();
    }
})

export default router;
