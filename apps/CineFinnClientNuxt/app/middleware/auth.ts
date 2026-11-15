import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';
import { useAuthGuard } from '~/composables/useAuthGuard';

/**
 * REQUIRED auth guard: the visitor must be logged in to see this route.
 *
 * The shared flow lives in `useAuthGuard`. The only job this middleware
 * adds on top is: bounce to /login when no session could be established.
 */
export default defineNuxtRouteMiddleware(async (to) => {
    const { run } = useAuthGuard();
    const result = await run(to);
    if (result === 'anonymous') {
        return navigateTo('/login');
    }
    if (result === 'redirect-onboarding') {
        return navigateTo('/onboarding');
    }
});
