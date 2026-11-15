import type { RouteLocationNormalizedLoaded } from 'vue-router';

import { useAuthCookie } from '~/composables/useAuthCookie';
import { useOnboarding } from '~/composables/useOnboarding';

export type AuthGuardResult = 'authenticated' | 'anonymous' | 'redirect-onboarding';

/**
 * The shared authentication flow used by both route middlewares:
 * - Seeds the auth store from the auth cookie when needed
 * - Attempts authentication when the user is not logged in with /auth/info
 * - Redirects to /onboarding when required (behavior of BOTH variants)
 * - Ensures series are loaded exactly once when logged in
 *
 * How a missing session is handled is up to the caller:
 * - middleware auth redirects to /login (required auth)
 * - middleware mayAuth lets the visitor stay anonymous but optionally auths it if a session is available (optional auth)
 */
export const useAuthGuard = () => {
    const authStore = useAuthStore();
    const indexStore = useIndexStore();
    const authCookie = useAuthCookie();
    const { needsOnboarding } = useOnboarding();
    const navigateToFN = navigateTo;

    /**
     * @param to Target route of the upcoming navigation.
     * @returns {AuthGuardResult} What happened: ready, no session, or handled the onboarding redirect.
     */
    const run = async (to: RouteLocationNormalizedLoaded): Promise<AuthGuardResult> => {
        if (authStore.authToken === '' && typeof authCookie.value === 'string' && authCookie.value !== '') {
            console.log('[auth-middleware] Seeding auth store with token from cookie');
            authStore.authToken = authCookie.value;
        }

        if (authStore.loggedIn === false) {
            console.log('[auth-middleware] User is not defined, trying to authenticate');
            try {
                await authStore.authenticate();
            } catch (error) {
                console.log('[auth-middleware] Authentication threw an error:', error);
            }
            if (authStore.loggedIn === false) {
                console.log('[auth-middleware] User is still not defined -> anonymous');
                return 'anonymous';
            }
        }

        console.log('[auth-middleware] User is logged in');
        if (needsOnboarding(to)) {
            console.log('[auth-middleware] Redirecting to /onboarding');
            return 'redirect-onboarding';
        }

        console.log('[auth-middleware] Loading series');
        await indexStore.loadSeries();
        return 'authenticated';
    };

    return { run };
};
