<script setup lang="ts">
import useAPIURL from '~/hooks/useAPIURL';

const isConnected = ref(false);
const transport = ref('N/A');
const socketID = ref('N/A');

const socket = useSocket();
const managmentStore = useManagmentStore();

onMounted(() => {
	socket.connect();

	socket.on('disconnect', onDisconnect);
	socket.on('jobUpdate', managmentStore.updateJob);
	if (socket.connected) {
		onConnect();
	}
	socket.on('connect', onConnect);
});

function onConnect() {
	isConnected.value = true;
	transport.value = socket.io.engine.transport.name;

	socket.io.engine.on('upgrade', (rawTransport) => {
		transport.value = rawTransport.name;
	});

	if (socket.id != undefined) {
		socketID.value = socket.id;
	}

	socket.emit('hello');
}

function onDisconnect() {
	isConnected.value = false;
	transport.value = 'N/A';
}

onBeforeUnmount(() => {
	socket.off('connect', onConnect);
	socket.off('disconnect', onDisconnect);
});
</script>

<template>
	<div>
		<p class="mb-0">API: {{ useAPIURL() }}</p>
		<p class="mb-0">Status: {{ isConnected ? 'connected' : 'disconnected' }}</p>
		<p class="mb-0">Transport: {{ transport }}</p>
		<p>Socket ID: {{ socketID }}</p>
	</div>
</template>
