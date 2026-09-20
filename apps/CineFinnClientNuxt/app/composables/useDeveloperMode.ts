export const useDeveloperMode = () => {
    const globalStore = useGlobalStore();
    console.log(globalStore.developerMode);

    if (globalStore.developerMode == true) {
        return true;
    }

    const authStore = useAuthStore();
    if (authStore.loggedIn && authStore.user.settings.developerMode.value == true) {
        return true;
    }

    return false;
}
