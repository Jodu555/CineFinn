<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue';
import Navigation from '@/components/Layout/Navigation.vue';
import Footer from '@/components/Layout/Footer.vue';
import SettingsDrawer from '@/components/Layout/SettingsDrawer.vue';
import { useAuthStore } from './stores/auth.store';
import { useIndexStore } from './stores/index.store';
import 'bootstrap';
import { useSocket } from './utils/socket';

const auth = useAuthStore();
const index = useIndexStore();

watch(
	() => auth.loggedIn,
	(v) => {
		v && index.loadSeries();
	}
);

onMounted(() => {
	// auth.login({ username: 'Jodu555', password: 'Test' }, true);
	// document.querySelector('html')!.setAttribute('data-bs-theme', 'light');
	document.querySelector('html')!.setAttribute('data-bs-theme', 'dark');
	// document.querySelector('html')!.setAttribute('data-bs-theme', 'experimental');
	// document.querySelector('html')!.setAttribute('data-bs-theme', 'emerald');
	// document.querySelector('html')!.setAttribute('data-bs-theme', 'neon');
	// document.querySelector('html')!.setAttribute('data-bs-theme', 'redstone');
	// document.querySelector('html')!.setAttribute('data-bs-theme', 'minecraft');

	useSocket().on('reloadSeries', (series) => {
		index.reloadSeries(series);
	});
	useSocket().on('updateSettings', (settings) => {
		auth.setSettings(settings);
	});
	useSocket().on('reload', () => {
		window.location.reload();
	});
});

onUnmounted(() => {
	useSocket().off('reloadSeries');
	useSocket().off('updateSettings');
	useSocket().off('reload');
});
</script>

<template>
	<div id="conta" :style="{ 'padding-bottom': $route.path == '/watch' || $route.path == '/newwatch' ? '5rem' : '3.5rem' }">
		<div v-auto-animate="{ duration: 250 }" id="app">
			<Navigation />
			<settings-drawer v-if="auth.loggedIn" />
			<!-- <pre>{{ $router.currentRoute }}</pre> -->
			<!-- <pre>{{ $route.path == '/watch' }}</pre> -->
			<!-- <font-awesome-icon icon="fa-solid fa-user-secret" /> -->
			<router-view class="mt-2" :key="JSON.stringify($route.query)" />
		</div>
		<Footer />
	</div>
</template>

<style lang="scss">
@import '../node_modules/bootstrap/scss/functions';
@import '../node_modules/bootstrap/scss/bootstrap';
@import './scss/main.scss';

#conta {
	min-height: 100vh;
	position: relative;
}
</style>
