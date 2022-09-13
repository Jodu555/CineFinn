<template>
	<div id="conta" :style="{ 'padding-bottom': $route.path == '/watch' ? '5rem' : '3.5rem' }">
		<div v-auto-animate="{ duration: 250 }" id="app">
			<Navigation />
			<settings-drawer v-if="loggedIn" />
			<!-- <pre>{{ $router.currentRoute }}</pre> -->
			<!-- <pre>{{ $route.path == '/watch' }}</pre> -->
			<router-view class="mt-2" :key="$route.query" />
		</div>
		<Footer />
	</div>
</template>

<script>
import { mapActions, mapState } from 'vuex';

import 'bootstrap';
import Navigation from '@/components/Layout/Navigation.vue';
import Footer from '@/components/Layout/Footer.vue';
import SettingsDrawer from '@/components/Layout/SettingsDrawer.vue';
export default {
	components: {
		Navigation,
		Footer,
		SettingsDrawer,
	},
	computed: {
		...mapState('auth', ['loggedIn']),
	},
	methods: {
		...mapActions(['loadSeries', 'reloadSeries']),
	},
	created() {
		this.loadSeries();
	},
	mounted() {
		this.$socket.on('reloadSeries', (series) => {
			this.reloadSeries(series);
		});
	},
	async unmounted() {
		this.$socket.off('reloadSeries');
	},
};
</script>

<style lang="scss">
@import '../node_modules/bootstrap/scss/functions';
@import '../node_modules/bootstrap/scss/bootstrap';

#conta {
	// background-color: #1f2d3d;
	min-height: 100vh;
	position: relative;
	// padding-bottom: 2.5rem;
}
</style>

<!-- :style="{ 'padding-bottom': $route.path == '/watch' ? '2.5rem' : '0' }" -->
