<template>
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script lang="ts" setup>
//@ts-ignore
// import * as bootstrap from 'bootstrap';
// import 'bootstrap';

const authToken = useCookie('auth-token');
const authStore = useAuthStore();
const indexStore = useIndexStore();

await callOnce('loadSeries', indexStore.loadSeries);

watch(
	authToken,
	async (newValue) => {
		// if (newValue) {
		// 	connectSocket();
		// } else {
		// 	useSocket()?.disconnect();
		// 	console.log('No auth token found');
		// }
		// await indexStore.loadSeries();
	},
	{ immediate: true }
);
</script>

<style lang="scss">
@use 'bootstrap/scss/bootstrap.scss';
</style>
