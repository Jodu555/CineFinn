<template>
	<div v-if="authStore.loggedIn && authStore.user.settings.developerMode.value">
		<p class="mb-0">API: {{ useAPIURL() }}</p>
		<p class="mb-0">Status: {{ isConnected ? 'connected' : 'disconnected' }}</p>
		<p class="mb-0">Transport: {{ transport }}</p>
		<p class="mb-0">Socket ID: {{ socketID }}</p>
		<p class="mb-0">Socket UniqueID: {{ socketUniqueID }}</p>
		<p v-if="connectError.length > 0">Connect Error: {{ connectError }}</p>
	</div>
</template>

<script setup lang="ts">
import type { FrontendSeries } from '@cinefinn/types';

const isConnected = ref(false);
const transport = ref('N/A');
const socketID = ref('N/A');
const connectError = ref('');

const socket = useSocket();
const managmentStore = useManagmentStore();
const indexStore = useIndexStore();
const authStore = useAuthStore();
const adminStore = useAdminStore();
const todoStore = useTodoStore();
const franchiseStore = useFranchiseStore();
const homeStore = useHomeStore();

const externalSeriesReload = async (series: FrontendSeries[]) => {
	await indexStore.reloadSeries(series);
	await refreshNuxtData('recommendations');
	await refreshNuxtData();
};

onBeforeUnmount(() => {
	socket.off('connect', onConnect);
	socket.off('disconnect', onDisconnect);
	socket.off('connect_error');
	socket.off('jobUpdate', managmentStore.updateJob);
	socket.off('watchListUpdate', indexStore.updateWatchList);
	socket.off('settingsUpdate', authStore.updateSettings);
	socket.off('seriesReload', externalSeriesReload);
	socket.off('adminOverview', adminStore.updateOverview);
	socket.off('adminAccounts', adminStore.updateAccounts);
	socket.off('adminSubsystems', adminStore.updateSubsystems);
	socket.off('adminMovingItems', adminStore.updateMovingItems);
	socket.off('todoListUpdate', todoStore.updateTodoList);
	socket.off('franchisesUpdate', franchiseStore.updateFranchises);
	socket.off('recommendationsAdd', homeStore.addRecommendations);

	clearInterval(socketCheckInterval);
});

let socketCheckInterval: ReturnType<typeof setInterval>;

onMounted(() => {
	socket.on('disconnect', onDisconnect);
	socket.on('jobUpdate', managmentStore.updateJob);
	socket.on('watchListUpdate', indexStore.updateWatchList);
	socket.on('settingsUpdate', authStore.updateSettings);
	socket.on('seriesReload', externalSeriesReload);
	socket.on('adminOverview', adminStore.updateOverview);
	socket.on('adminAccounts', adminStore.updateAccounts);
	socket.on('adminSubsystems', adminStore.updateSubsystems);
	socket.on('adminMovingItems', adminStore.updateMovingItems);
	socket.on('todoListUpdate', todoStore.updateTodoList);
	socket.on('franchisesUpdate', franchiseStore.updateFranchises);
	socket.on('recommendationsAdd', homeStore.addRecommendations);

	socket.on('reload', () => {
		window.location.reload();
	});

	socket.on('connect', onConnect);

	socket.on('connect_error', (err) => {
		console.log('connect_error', err);
		connectError.value = err.message + ' - ' + JSON.stringify(err);
		umTrackEvent('socket_connect_error', { error: err.message });
	});

	socketCheckInterval = setInterval(() => {
		console.log('socketCheckInterval', { socketConnected: socket.connected, authStoreLoggedIn: authStore.loggedIn });
		if (!socket.connected) {
			console.log('socket not connected');
			//Here notify the user that no connection could be established
			if (authStore.loggedIn) {
				umTrackEvent('socket_connect_error', { error: 'No connection could be established after 30 seconds, retrying...' });
				socket.connect();
				clearInterval(socketCheckInterval);
			}
		}
	}, 1000 * 30);

	//@ts-expect-error vueSocket is not defined but this is for debugging why the socket does not reconnect after disconnect
	window.vueSocket = socket;

	if (authStore.loggedIn == false) return;
	socket.connect();

	if (socket.connected) {
		onConnect();
	}
});
const router = useRouter();
function onConnect() {
	connectError.value = '';
	isConnected.value = true;
	transport.value = socket.io.engine.transport.name;

	socket.io.engine.on('upgrade', (rawTransport) => {
		transport.value = rawTransport.name;
	});

	if (socket.id != undefined) {
		socketID.value = socket.id;
	}

	socket.emit('state', {
		url: router.currentRoute.value.fullPath,
	});
}

watch(
	() => authStore.loggedIn,
	(loggedIn) => {
		if (loggedIn) {
			socket.connect();
		} else {
			socket.disconnect();
		}
	},
);

watch(
	() => router.currentRoute.value.fullPath,
	(newURL) => {
		if (isConnected.value) {
			socket.emit('state', {
				url: newURL,
			});
		}
	},
);

function onDisconnect() {
	isConnected.value = false;
	transport.value = 'N/A';
	socket.connect();
}
</script>
