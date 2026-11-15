import type { RouteLocationNormalizedLoaded } from 'vue-router';

const ONBOARDING_REQUIRED_EMAIL_SUFFIX = '@nil.com';

/**
 * Determines whether the logged-in user still has to complete onboarding.
*
* @returns {{ needsOnboarding: (to: RouteLocationNormalizedLoaded) => boolean }}
*/
export const useOnboarding = () => {
    const onboardingSkipUntil = useCookie('onboardingSkipUntil');
    const authStore = useAuthStore();

    /**
     * @param to Target route of the upcoming navigation.
     * @returns {boolean} True if the user needs to be onboarded, false if already onboarded or not applicable!
     *
     * Note: This is safe to call for anonymous visitors - it simply returns false.
     */
    const needsOnboarding = (to: RouteLocationNormalizedLoaded): boolean => {
        if (to.path === '/onboarding') {
            console.log('[auth-middleware] Already on the onboarding page');
            return false;
        }

        if (!authStore.loggedIn || !authStore.user || typeof authStore.user.email !== 'string') {
            console.log('[auth-middleware] Not logged in (or no email known) - onboarding does not apply');
            return false;
        }


        if (typeof onboardingSkipUntil.value === 'string' && Date.now() < parseInt(onboardingSkipUntil.value, 10)) {
            console.log('[auth-middleware] Onboarding skipped for now');
            return false;
        }

        if (authStore.user.email.includes(ONBOARDING_REQUIRED_EMAIL_SUFFIX)) {
            console.log('[auth-middleware] User needs to be onboarded');
            return true;
        }

        console.log('[auth-middleware] No condition met - user is already onboarded');
        return false;
    };

    return { needsOnboarding };
};
