<template>
	<div v-auto-animate="{ duration: 250 }" id="app">
		<Navigation />
		<settings-drawer />
		<router-view class="mt-2" :key="$route.query" />
	</div>
	<Footer />
</template>

<script>
import { mapActions } from 'vuex';

import 'bootstrap';
import Navigation from './components/Navigation.vue';
import Footer from './components/Footer.vue';
import SettingsDrawer from './components/SettingsDrawer.vue';
export default {
	components: {
		Navigation,
		Footer,
		SettingsDrawer,
	},
	created() {
		this.loadSeries();
	},
	methods: {
		...mapActions(['loadSeries']),
	},
};
</script>

<style lang="scss">
@import '../node_modules/bootstrap/scss/functions';
@import '~bootstrap/scss/bootstrap';

#app {
	// background-color: #1f2d3d;
	min-height: 100vh;
	position: relative;
	padding-bottom: 2.5rem;
}
</style>
