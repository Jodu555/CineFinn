<template>
	<SocketConnection />
	<NuxtRouteAnnouncer />
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>

<script lang="ts" setup>
//@ts-ignore
// import * as bootstrap from 'bootstrap';
// import 'bootstrap';
import SocketConnection from '~/components/SocketConnection.client.vue';
const authToken = useCookie('auth-token', { watch: true });

watch(
	authToken,
	async (newValue) => {
		// if (newValue) {
		// 	connectSocket();
		// } else {
		// 	useSocket()?.disconnect();
		// 	console.log('No auth token found');
		// }
		// await useIndexStore().loadSeries();
	},
	{ immediate: true }
);
</script>

<style lang="scss">
@use 'bootstrap/scss/bootstrap.scss';
</style>
