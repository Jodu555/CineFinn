import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useAuthGuard } from '~/composables/useAuthGuard';

/**
 * OPTIONAL auth guard: authentication is attempted, but visitors may also
 * stay anonymous and browse (e.g. watch pages, rmvc).
 *
 * The shared flow lives in `useAuthGuard`. This middleware intentionally
 * does NOT redirect to /login - the 'anonymous' result is simply ignored.
 */
export default defineNuxtRouteMiddleware(async (to) => {
    const { run } = useAuthGuard();
    const result = await run(to);
    if (result === 'redirect-onboarding') {
        return navigateTo('/onboarding');
    }
    //If the user turns out to be authenticated on the login page where we require mayAuth then we move them to /
    if (result === 'authenticated' && (to.name === 'login')) {
        return navigateTo('/');
    }
});
