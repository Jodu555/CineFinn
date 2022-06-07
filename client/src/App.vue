<template>
	<div id="app">
		<Navigation />
		<router-view class="mt-2" />
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
@import '../node_modules/bootstrap/scss/functions';
@import '~bootstrap/scss/bootstrap';

#app {
	// background-color: #1f2d3d;
	min-height: 100vh;
}
</style>
