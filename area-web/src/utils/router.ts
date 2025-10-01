import { createWebHistory, createRouter } from 'vue-router';
import Default from "@/views/Default.vue";
import AuthPage from "@/views/auth/AuthPage.vue";
import Services from "@/views/home/Services.vue";
import Home from "@/views/home/Home.vue";
import Workflows from "@/views/home/workflows/Workflows.vue";
import NotFound from "@/views/NotFound.vue";


const routes = [
    { path: '/', component: Default, meta: {title: 'Area'}},
    { path: '/webauth', component: AuthPage, meta: {title: 'Area'}},
    { path: '/home', component: Home, meta: {title: 'Area'}},
    { path: '/home/workflows/:id?', component: Workflows, meta: {title: 'Workflows'}},
    { path: '/home/services', component: Services, meta: {title: 'Services'}},
    { path: '/:pathMatch(.*)*', component: NotFound, meta: {title: 'Page not found'}}
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

router.beforeEach((to, _, next) => {
    document.title = `${to.meta.title}`;
    next();
})

export default router;
