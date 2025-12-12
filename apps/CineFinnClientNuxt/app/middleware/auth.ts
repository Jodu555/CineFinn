export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore();

    const authCookie = useCookie('auth-token');

    if (typeof authCookie.value != 'string' || authCookie.value == '') {
        return navigateTo('/login');
    }

    const checkOnboarding = () => {
        if (to.path === '/onboarding') {
            return;
        }
        if (authStore.user.email.includes('@nil.com')) {
            return navigateTo('/onboarding');
        }
    }

    if (authStore.authToken == '') {
        authStore.authToken = authCookie.value.toString();
        try {
            await authStore.authenticate();
            checkOnboarding();
            await useIndexStore().loadSeries();
        } catch (error) {
            return navigateTo('/login');
        }
    }

    if (authStore.loggedIn == false) {
        console.log('User is not defined, trying to authenticate');
        try {
            await authStore.authenticate();
            if (authStore.loggedIn == false) {
                console.log('User is still not defined, redirecting to login');
                return navigateTo('/login');
            } else {
                checkOnboarding();
                await useIndexStore().loadSeries();
            }
        } catch (error) {
            return navigateTo('/login');
        }
    }

});