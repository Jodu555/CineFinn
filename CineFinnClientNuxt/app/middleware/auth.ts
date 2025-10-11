export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore();

    const authCookie = useCookie('auth-token');

    if (typeof authCookie.value != 'string' || authCookie.value == '') {
        return navigateTo('/login');
    }

    if (authStore.authToken == '') {
        authStore.authToken = authCookie.value.toString();
        await authStore.authenticate();
        // return navigateTo('/login');
    }

    if (authStore.loggedIn == false) {
        console.log('User is not defined, trying to authenticate');
        await authStore.authenticate();
        if (authStore.loggedIn == false) {
            console.log('User is still not defined, redirecting to login');
            return navigateTo('/login');
        }
    }

});