<template>
	<div class="modal fade" aria-modal="true" id="rmvcModal" tabindex="-1" aria-labelledby="rmvcModal" aria-hidden="true">
		<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="rmvcModalLabel">ReMote Video Control Session</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body" v-auto-animate>
					<pre v-if="authStore.user.settings.developerMode.value">{{ { loading, sessionStarted, sessionID } }}</pre>
					<div v-if="loading" class="d-flex justify-content-center">
						<div class="spinner-border" role="status">
							<span class="visually-hidden">Loading...</span>
						</div>
					</div>
					<div v-if="!sessionStarted" class="row justify-content-center">
						<button type="button" @click="startSession" class="col-5 btn btn-primary">Start RMVC Session</button>
					</div>
					<div v-if="sessionStarted">
						<h3 class="text-center">{{ sessionID }}</h3>
						<ul>
							<li>
								Step 1. Navigate with your rmvc device to <code>{{ gotoUrl }}</code>
							</li>
							<li>Step 2. Enter the following code: {{ sessionID }} into the Box</li>
							<li>Step 3. Click the Connect Button</li>
							<li>You Can now Remotely Control your Video Actions using another Devie</li>
						</ul>
						<div class="d-flex justify-content-end">
							<button type="button" @click="stopSession" class="btn btn-outline-danger">Stop Session</button>
						</div>
						<table class="table">
							<thead>
								<tr>
									<th scope="col">Time</th>
									<th scope="col">Action</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="record in [...actionRecord].reverse()">
									<td>{{ new Date(record.time).toLocaleString() }}</td>
									<td>{{ record.action }}</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { defineComponent, type PropType } from 'vue';
import { mapWritableState } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';

interface Action {
	time: number;
	action: string;
}

const authStore = useAuthStore();
const props = defineProps<{
	switchTo: (vel: number) => void;
	skip: (seconds: number) => void;
}>();

const gotoUrl = computed(() => {
	return location.origin + '/rmvc';
});

const loading = ref(false);
const sessionStarted = ref(false);
const sessionID = ref('');
const actionRecord = ref([] as Action[]);

function startSession() {
	loading.value = true;
	useSocket().emit('rmvc-createSession', (_sessionID: string) => {
		sessionID.value = _sessionID;
		sessionStarted.value = true;
		loading.value = false;
	});
}

function stopSession() {
	loading.value = true;
	useSocket().emit('rmvc-destroySession');
	sessionID.value = '';
	sessionStarted.value = false;
	loading.value = false;
}

const videoRef = useTemplateRef<HTMLVideoElement>('video');

onMounted(() => {
	const video = videoRef.value;
	if (video == undefined) return;
	video.addEventListener('play', () => {
		useSocket().emit('rmvc-send-videoStateChange', { isPlaying: true });
	});
	video.addEventListener('pause', () => {
		useSocket().emit('rmvc-send-videoStateChange', { isPlaying: false });
	});
	useSocket().on('rmvc-get-videoState', () => {
		useSocket().emit('rmvc-send-videoStateChange', { isPlaying: !video.paused });
	});
	useSocket().on('rmvc-recieve-action', (action) => {
		console.log('Recieved Action', action);
		actionRecord.value.push({
			action,
			time: Date.now(),
		});
		if (action == 'play') {
			video.play();
		}
		if (action == 'pause') {
			video.pause();
		}
		if (action == 'forward') {
			props.skip(5);
		}
		if (action == 'backward') {
			props.skip(-5);
		}
		if (action == 'nextEp') {
			props.switchTo(1);
		}
		if (action == 'prevEp') {
			props.switchTo(-1);
		}
		if (action == 'volHigh') {
			try {
				video.volume += 0.1;
			} catch (_) {}
		}
		if (action == 'volDown') {
			try {
				video.volume -= 0.1;
			} catch (_) {}
		}
	});
	loading.value = true;
});

onUnmounted(() => {
	useSocket().off('rmvc-recieve-action');
});
</script>
<style lang=""></style>
