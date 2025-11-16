<script setup lang="ts">
const isConnected = ref(false);
const transport = ref('N/A');

const socket = useSocket();

console.log(socket);

onMounted(() => {
	socket.connect();

	socket.on('disconnect', onDisconnect);
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

function log() {
	console.log('log');
}
</script>

<template>
	<div>
		<p>Status: {{ isConnected ? 'connected' : 'disconnected' }}</p>
		<p>Transport: {{ transport }}</p>
	</div>
	<button @click="log">Click me</button>
</template>
