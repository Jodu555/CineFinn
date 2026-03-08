import { useAuthCookie } from "~/composables/useAuthCookie";

const DEBUG = false;

export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore();

    const authCookie = useAuthCookie();

    /**
     * @returns {boolean} If the user needs to be onboarded or not. True if needs to be onboarded, false if already onboarded!
     */
    const checkOnboarding = (): boolean => {
        DEBUG && console.log('Checking Onboarding');
        const onboardingSkipUntilCookie = useCookie('onboardingSkipUntil');
        if (onboardingSkipUntilCookie.value && Date.now() < parseInt(onboardingSkipUntilCookie.value)) {
            DEBUG && console.log('Onboarding skipped for now');
            return false;
        }
        if (to.path === '/onboarding') {
            DEBUG && console.log('Already on onboarding');
            return false;
        }
        if (authStore.user.email.includes('@nil.com')) {
            DEBUG && console.log('User needs to be onboarded');
            return true;
        }
        DEBUG && console.log('No Condition met User Already onboarded');
        return false;
    }

    if (authStore.authToken == '' && (typeof authCookie.value == 'string' && authCookie.value !== '')) {
        authStore.authToken = authCookie.value.toString();
    }

    if (authStore.loggedIn == false) {
        DEBUG && console.log('User is not defined, trying to authenticate');
        try {
            await authStore.authenticate();
            if (authStore.loggedIn == false) {
                DEBUG && console.log('User is still not defined, redirecting to login');
                return navigateTo('/login');
            } else {
                if (checkOnboarding()) return navigateTo('/onboarding');
                await useIndexStore().loadSeries();
            }
        } catch (error) {
            return navigateTo('/login');
        }
    }


    if (checkOnboarding()) return navigateTo('/onboarding');

});