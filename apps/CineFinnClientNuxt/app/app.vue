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

useHead({
	bodyAttrs: {
		'data-bs-theme': 'dark',
	},
});

onMounted(() => {
	if (authStore.loggedIn) {
		umIdentify({
			UUID: authStore.user.UUID,
			username: authStore.user.username,
		});
	}
});

watch(
	() => authStore.user,
	(newValue) => {
		if (newValue !== null && newValue.UUID !== undefined && newValue.UUID !== '' && newValue.username != undefined) {
			umIdentify({
				UUID: newValue.UUID,
				username: newValue.username,
			});
		}
	},
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
	{ immediate: true },
);
</script>

<style lang="scss">
@use 'bootstrap/scss/bootstrap.scss';
</style>
