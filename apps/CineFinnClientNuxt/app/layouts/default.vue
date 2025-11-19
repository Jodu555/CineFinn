<template>
	<div id="conta" :style="{ 'padding-bottom': route.path == '/watch' || route.path == '/newwatch' ? '5rem' : '3.5rem' }">
		<Navigation />
		<SettingsDrawer v-if="authStore.loggedIn" />
		<slot />
		<Footer />
	</div>
</template>

<script lang="ts" setup>
import Footer from '~/components/Footer.vue';
import Navigation from '~/components/Navigation.vue';
import SettingsDrawer from '~/components/SettingsDrawer.vue';

const route = useRoute();
const authStore = useAuthStore();
</script>

<style scoped>
#conta {
	min-height: 100vh;
	position: relative;
}
</style>
