<template>
	<div id="conta" :style="{ 'padding-bottom': route.path == '/watch' || route.path == '/newwatch' ? '5rem' : '3.5rem' }">
		<Navigation />
		<slot />
		<Footer />
	</div>
</template>

<script lang="ts" setup>
const route = useRoute();
</script>

<style scoped>
#conta {
	min-height: 100vh;
	position: relative;
}
</style>
