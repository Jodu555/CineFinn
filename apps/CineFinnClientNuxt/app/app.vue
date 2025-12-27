<template>
	<SocketConnection />
	<NuxtRouteAnnouncer />
	<!-- <NuxtLoadingIndicator :color="false" /> -->
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

const authStore = useAuthStore();

onMounted(() => {
	if (authStore.loggedIn) {
		umIdentify({
			UUID: authStore.user.UUID,
			username: authStore.user.username,
		});
	}
});

watch(
	() => authStore.loggedIn,
	(newValue) => {
		umIdentify({
			UUID: authStore.user.UUID,
			username: authStore.user.username,
		});
	}
);

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
