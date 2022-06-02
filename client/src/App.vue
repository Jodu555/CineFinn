<template>
	<div id="app">
		<Navigation />
		<router-view />
	</div>
</template>

<script>
import Navigation from './components/Navigation.vue';
import 'bootstrap';
export default {
	components: {
		Navigation,
	},
};
</script>

<style lang="scss">
// Required
@import '../node_modules/bootstrap/scss/functions';
// Default variable overrides
// $body-bg: #000;
// $body-color: #111;
@import '~bootstrap/scss/bootstrap';
</style>
