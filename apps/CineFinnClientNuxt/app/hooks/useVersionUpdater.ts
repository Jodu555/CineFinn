function useVersionUpdater() {
    const isNewVersionAvailable = ref(false);
    const nuxtApp = useNuxtApp();
    nuxtApp.hook('app:manifest:update', (manifest) => {
        isNewVersionAvailable.value = true;
    });
    return {
        isNewVersionAvailable: readonly(isNewVersionAvailable),
    };
}