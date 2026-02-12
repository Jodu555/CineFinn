<template>
	<div id="conta" :style="{ 'padding-bottom': route.path == '/watch' || route.path == '/newwatch' ? '5rem' : '3.5rem' }">
		<Navigation />
		<SettingsDrawer v-if="authStore.loggedIn" />
		<div v-if="isNewVersionAvailable" class="alert alert-warning" role="alert">
			<font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="me-2" />
			A new version of CineFinn is available! Please update to the latest version.
			<button type="button" @click="reload()" class="btn btn-outline-primary">Reload</button>
		</div>
		<slot />
		<Footer />
	</div>
</template>

<script lang="ts" setup>
import Footer from '~/components/Layout/Footer.vue';
import Navigation from '~/components/Layout/Navigation.vue';
import SettingsDrawer from '~/components/Layout/SettingsDrawer.vue';
import { useVersionUpdater } from '~/hooks/useVersionUpdater';

const { isNewVersionAvailable } = useVersionUpdater();

function reload() {
	(window as any).location.reload();
}

const route = useRoute();
const authStore = useAuthStore();

onErrorCaptured((err) => {
	showError({ statusCode: 500, statusMessage: err.message, fatal: true });
	return false; // prevent further propagation
});
</script>

<style scoped>
#conta {
	min-height: 100vh;
	position: relative;
}
</style>
