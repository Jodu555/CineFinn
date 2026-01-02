<template>
	<div v-if="false">
		<p class="mb-0">API: {{ useAPIURL() }}</p>
		<p class="mb-0">Status: {{ isConnected ? 'connected' : 'disconnected' }}</p>
		<p class="mb-0">Transport: {{ transport }}</p>
		<p>Socket ID: {{ socketID }}</p>
	</div>
</template>

<script setup lang="ts">
import useAPIURL from '~/hooks/useAPIURL';

const isConnected = ref(false);
const transport = ref('N/A');
const socketID = ref('N/A');

const socket = useSocket();
const managmentStore = useManagmentStore();
const indexStore = useIndexStore();
const authStore = useAuthStore();
const adminStore = useAdminStore();
const todoStore = useTodoStore();

onMounted(() => {
	socket.connect();

	socket.on('disconnect', onDisconnect);
	socket.on('jobUpdate', managmentStore.updateJob);
	socket.on('watchListUpdate', indexStore.updateWatchList);
	socket.on('settingsUpdate', authStore.updateSettings);
	socket.on('seriesReload', indexStore.reloadSeries);
	socket.on('adminOverview', adminStore.updateOverview);
	socket.on('adminAccounts', adminStore.updateAccounts);
	socket.on('adminSubsystems', adminStore.updateSubsystems);
	socket.on('todoListUpdate', todoStore.updateTodoList);
	if (socket.connected) {
		onConnect();
	}
	socket.on('connect', onConnect);
});
const router = useRouter();
function onConnect() {
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
	() => router.currentRoute.value.fullPath,
	(newURL) => {
		if (isConnected.value) {
			socket.emit('state', {
				url: newURL,
			});
		}
	}
);

function onDisconnect() {
	isConnected.value = false;
	transport.value = 'N/A';
}

onBeforeUnmount(() => {
	socket.off('connect', onConnect);
	socket.off('disconnect', onDisconnect);
});
</script>
