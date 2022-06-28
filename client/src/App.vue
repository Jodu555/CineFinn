<template>
	<div v-auto-animate="{ duration: 250 }" id="app">
		<Navigation />
		<settings-drawer v-if="loggedIn" />
		<router-view class="mt-2" :key="$route.query" />
	</div>
	<Footer />
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
		...mapState(['series']),
	},
	async created() {
		await this.authenticate();
	},
	methods: {
		...mapActions(['loadSeries']),
		...mapActions('auth', ['authenticate']),
	},
};
</script>

<style lang="scss">
@import '../node_modules/bootstrap/scss/functions';
@import '../node_modules/bootstrap/scss/bootstrap';

#app {
	// background-color: #1f2d3d;
	min-height: 100vh;
	position: relative;
	padding-bottom: 2.5rem;
}
</style>
