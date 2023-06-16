<template>
	<div class="modal fade" aria-modal="true" id="rmvcModal" tabindex="-1" aria-labelledby="rmvcModal" aria-hidden="true">
		<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="rmvcModalLabel">ReMote Video Control Session</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body" v-auto-animate>
					<pre v-if="settings.developerMode.value">{{ { loading, sessionStarted, sessionID } }}</pre>
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
<script>
import { mapGetters, mapState } from 'vuex';

export default {
	props: {
		switchTo: { type: Function },
		skip: { type: Function },
	},
	data() {
		return {
			loading: false,
			sessionStarted: false,
			sessionID: '',
			actionRecord: [],
		};
	},
	computed: {
		...mapState('auth', ['settings']),
		gotoUrl() {
			return location.origin + '/rmvc';
		},
	},

	methods: {
		startSession() {
			this.loading = true;
			this.$socket.emit('rmvc-send-sessionStart');
		},
		stopSession() {
			this.loading = true;
			this.$socket.emit('rmvc-send-sessionStop');
		},
	},

	async mounted() {
		const video = document.querySelector('video');
		video.addEventListener('play', () => {
			this.$socket.emit('rmvc-send-videoStateChange', { isPlaying: true });
		});
		video.addEventListener('pause', () => {
			this.$socket.emit('rmvc-send-videoStateChange', { isPlaying: false });
		});
		this.$socket.on('rmvc-get-videoState', () => {
			this.$socket.emit('rmvc-send-videoStateChange', { isPlaying: video.playing });
		});
		this.$socket.on('rmvc-sessionCreated', (sessionID) => {
			this.sessionID = sessionID;
			this.sessionStarted = true;
			this.loading = false;
		});
		this.$socket.on('rmvc-sessionDestroyed', () => {
			this.sessionID = '';
			this.sessionStarted = false;
			this.loading = false;
		});
		this.$socket.on('rmvc-recieve-action', (action) => {
			console.log('Recieved Action', action);
			this.actionRecord.push({
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
				this.skip(5);
			}
			if (action == 'backward') {
				this.skip(-5);
			}
			if (action == 'nextEp') {
				this.switchTo(1);
			}
			if (action == 'prevEp') {
				this.switchTo(-1);
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
		this.loading = true;
		this.$socket.emit('rmvc-send-sessionInfo');
	},
	unmounted() {
		this.$socket.off('rmvc-sessionCreated');
		this.$socket.off('rmvc-sessionDestroyed');
		this.$socket.off('rmvc-recieve-action');
	},
};
</script>
<style lang=""></style>
