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
	document.querySelector('html')!.setAttribute('data-bs-theme', 'dark');
	// document.querySelector('html')!.setAttribute('data-bs-theme', 'experimental');

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
	<div id="conta" :style="{ 'padding-bottom': $route.path == '/watch' ? '5rem' : '3.5rem' }">
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

[data-bs-theme="experimental"] {
	--bs-body-color: oklch(0.95 0 0);
	--bs-body-bg: oklch(0.08 0 0);

	--text-secondary: oklch(.65 0 0);


	.input {
		--bs-body-color: oklch(.65 0 0);
	}

	// --bs-body-color-rgb: #{to-rgb($white)};
	// --bs-body-bg: var(--bs-blue);
	// --bs-body-bg-rgb: #{to-rgb($blue)};
	// --bs-tertiary-bg: #{$blue-600};

	// .dropdown-menu {
	// 	--bs-dropdown-bg: #{mix($blue-500, $blue-600)};
	// 	--bs-dropdown-link-active-bg: #{$blue-700};
	// }

	// .btn-secondary {
	// 	--bs-btn-bg: #{mix($gray-600, $blue-400, .5)};
	// 	--bs-btn-border-color: #{rgba($white, .25)};
	// 	--bs-btn-hover-bg: #{darken(mix($gray-600, $blue-400, .5), 5%)};
	// 	--bs-btn-hover-border-color: #{rgba($white, .25)};
	// 	--bs-btn-active-bg: #{darken(mix($gray-600, $blue-400, .5), 10%)};
	// 	--bs-btn-active-border-color: #{rgba($white, .5)};
	// 	--bs-btn-focus-border-color: #{rgba($white, .5)};
	// 	--bs-btn-focus-box-shadow: 0 0 0 .25rem rgba(255, 255, 255, .2);
	// }
}

#conta {
	min-height: 100vh;
	position: relative;
}
</style>
