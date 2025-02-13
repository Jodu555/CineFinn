<template>
	<div class="container" v-auto-animate>
		<h2 class="text-center mb-5">Remote Video Control</h2>
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<pre v-if="useAuthStore().settings.developerMode.value">
			{{ { loading, isConnected, isPlaying, error, rmvcID, socket: $socket.id, socketExists: $socket != null, url: useBaseURL() } }}
		</pre
		>
		<div v-if="error != ''" class="alert alert-danger alert-dismissible fade show" role="alert">
			<button @click="error = ''" type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
			<strong>Error:</strong> {{ error }}
		</div>

		<div v-if="!isConnected" class="row justify-content-center">
			<div class="text-center col-12 col-sm-6">
				<form @submit.prevent="connect">
					<div class="mb-3">
						<label for="rmvcID" class="form-label">Remote Control ID</label>
						<div class="input-group">
							<input type="text" class="form-control" id="rmvcID" v-model="rmvcID" aria-describedby="helprmvcID" />
							<button type="submit" class="btn btn-outline-primary">Connect</button>
						</div>
						<small id="helprmvcID" class="form-text text-muted">The Remote Control ID that the video player gave you</small>
					</div>
				</form>
			</div>
		</div>
		<div v-if="isConnected" class="rmvc">
			<div class="group d-flex gap-4 justify-content-evenly mb-5">
				<button title="5 Sek. Zurück" @click="$socket.emit('rmvc-send-action', { rmvcID, action: 'backward' })">
					<font-awesome-icon class="skip skip-left" size="xl" icon="fa-solid fa-backward" />
				</button>
				<button :title="isPlaying ? 'Pause' : 'Play'" @click="$socket.emit('rmvc-send-action', { rmvcID, action: isPlaying ? 'pause' : 'play' })">
					<font-awesome-icon v-if="!isPlaying" size="xl" icon="fa-solid fa-play" />
					<font-awesome-icon v-if="isPlaying" size="xl" icon="fa-solid fa-pause" />
				</button>
				<button title="5 Sek. Vorwärts" @click="$socket.emit('rmvc-send-action', { rmvcID, action: 'forward' })">
					<font-awesome-icon class="skip skip-right" size="xl" icon="fa-solid fa-forward" />
				</button>
			</div>
			<div class="group d-flex gap-4 justify-content-evenly mt-5 mb-5">
				<button title="Vorherige Episode" @click="$socket.emit('rmvc-send-action', { rmvcID, action: 'prevEp' })">
					<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M0 18H2L2 0H0L0 18ZM17.7139 17.3827C18.7133 17.9977 20 17.2787 20 16.1052L20 1.8948C20 0.7213 18.7133 0.00230002 17.7139 0.6173L6.1679 7.7225C5.2161 8.3082 5.2161 9.6918 6.1679 10.2775L17.7139 17.3827ZM18 2.7896V15.2104L7.908 9L18 2.7896Z"
							fill="currentColor" />
					</svg>
				</button>
				<button title="Lauter" @click="$socket.emit('rmvc-send-action', { rmvcID, action: 'volHigh' })">
					<svg class="volume-high-icon" viewBox="0 0 24 24">
						<path
							fill="currentColor"
							d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
					</svg>
				</button>
				<button title="Nächste Episode" @click="$socket.emit('rmvc-send-action', { rmvcID, action: 'nextEp' })">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="Hawkins-Icon Hawkins-Icon-Standard">
						<path
							fill-rule="evenodd"
							clip-rule="evenodd"
							d="M22 3H20V21H22V3ZM4.28615 3.61729C3.28674 3.00228 2 3.7213 2 4.89478V19.1052C2 20.2787 3.28674 20.9977 4.28615 20.3827L15.8321 13.2775C16.7839 12.6918 16.7839 11.3082 15.8321 10.7225L4.28615 3.61729ZM4 18.2104V5.78956L14.092 12L4 18.2104Z"
							fill="currentColor"></path>
					</svg>
				</button>
			</div>
			<div class="group d-flex justify-content-center mt-5 mb-5">
				<button title="Leiser" @click="$socket.emit('rmvc-send-action', { rmvcID, action: 'volDown' })">
					<svg class="volume-low-icon" viewBox="0 0 24 24">
						<path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
					</svg>
				</button>
			</div>

			<div class="row justify-content-center mt-5">
				<button type="button" @click="isConnected = false" class="col-8 col-sm-3 btn btn-outline-danger">Disconnect</button>
			</div>
		</div>
	</div>
</template>
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useBaseURL } from '@/utils';
import { useSocket } from '@/utils/socket';
import { mapWritableState } from 'pinia';
import { ref, onMounted, onUnmounted } from 'vue';

const loading = ref(false);
const isConnected = ref(false);
const isPlaying = ref(true);
const error = ref('');
const rmvcID = ref('');

function connect() {
	if (rmvcID.value.length === 0) {
		error.value = 'Please enter a valid Remote Control ID!';
		return;
	}
	loading.value = true;
	error.value = '';
	useSocket().emit('rmvc-connect', { rmvcID: rmvcID.value });
}

onMounted(() => {
	document.title = `Cinema | RMVC`;
	console.log(useSocket());

	if (!useAuthStore().loggedIn) {
		useSocket().auth = { type: 'rmvc-emitter' };
		useSocket().connect();
	}

	useSocket().on('rmvc-connection', ({ status }) => {
		loading.value = false;
		isConnected.value = status;
		if (!status) {
			error.value = 'RMVCID seems to be invalid! Or has been stopped!';
			rmvcID.value = '';
		}
	});
	useSocket().on('rmvc-recieve-videoStateChange', ({ isPlaying: k }) => {
		isPlaying.value = k;
	});
});

onUnmounted(() => {
	document.title = `Cinema | Jodu555`;
	useSocket().off('rmvc-recieve-videoStateChange');
	useSocket().off('rmvc-connection');
});
</script>
<style scoped>
.rmvc {
	/* width: 50%; */
	margin-top: 15vh;
}

.rmvc svg {
	transform: scale(3);
}

.rmvc .group button {
	background: none;
	border: none;
	color: inherit;
	padding: 0;
	height: 30px;
	width: 30px;
	font-size: 1.1rem;
	cursor: pointer;
	opacity: 0.85;
	transition: opacity 150ms ease-in-out;
}

.rmvc .group button:hover {
	opacity: 1;
}
</style>
