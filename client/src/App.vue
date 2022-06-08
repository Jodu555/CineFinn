<template>
	<div id="app">
		<Navigation />
		<router-view class="mt-2" />
	</div>
	<Footer />
</template>

<script>
import Navigation from './components/Navigation.vue';
import Footer from './components/Footer.vue';
import 'bootstrap';
export default {
	components: {
		Navigation,
		Footer,
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
