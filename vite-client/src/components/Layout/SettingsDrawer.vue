<template>
	<div>
		<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasSettings" aria-labelledby="offcanvasSettingsLabel">
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Infos - Settings</h5>
				<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
			</div>
			<div class="offcanvas-body">
				<h2>User Infos:</h2>
				<hr />
				<ul class="list-group list-group-flush">
					<li class="list-group-item">
						<h5>
							<b>Username:</b> <span class="text-muted">{{ userInfo.username }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>E-Mail:</b> <span class="text-muted">{{ userInfo.email }}</span>
						</h5>
					</li>
				</ul>
				<h2 @click="showJobs = !showJobs">
					<p class="d-flex justify-content-between" style="align-items: center">
						Jobs:
						<font-awesome-icon style="margin-left: 0.5rem" size="xs" :icon="['fa-solid', showJobs ? 'chevron-up' : 'chevron-down']" />
					</p>
				</h2>
				<hr />
				<ul v-if="showJobs" class="list-group list-group-flush mb-3">
					<JobListView
						v-for="job in jobs"
						:id="job.id"
						:title="job.name"
						:callpoint="job.callpoint"
						:key="job.id"
						:running="job.running"
						:lastRun="job.lastRun"
						:click="start"
					/>
				</ul>
				<h2 @click="showSettings = !showSettings">
					<p class="d-flex justify-content-between" style="align-items: center">
						Settings:
						<font-awesome-icon style="margin-left: 0.5rem" size="xs" :icon="['fa-solid', showSettings ? 'chevron-up' : 'chevron-down']" />
					</p>
				</h2>
				<hr />
				<div v-if="showSettings">
					<div v-for="(setting, key) of settings" :key="key" class="mb-3 form-check">
						<template v-if="setting.type === 'checkbox'">
							<input
								type="checkbox"
								@change="
									(e) => {
										setting.value = e.target.checked;
										updateSettings();
									}
								"
								v-model="setting.value"
								class="form-check-input"
								:id="key"
							/>
							<label class="form-check-label" :for="key">{{ setting.title }}</label>
						</template>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import { mapActions, mapMutations, mapState } from 'vuex';
import JobListView from '@/components/Layout/JobListView.vue';

export default {
	components: { JobListView },
	data() {
		return {
			jobs: [],
			showJobs: false,
			showSettings: false,
		};
	},
	computed: {
		...mapState('auth', ['userInfo', 'authToken', 'settings']),
	},
	mounted() {
		this.load();
	},
	async unmounted() {
		this.jobs.forEach((job) => {
			const socketEvent = `${job.callpoint.replace('/', '').replaceAll('/', '_')}-end`;
			this.$socket.off(socketEvent);
		});
	},
	methods: {
		...mapActions('auth', ['updateSettings']),
		async load() {
			const response = await this.$networking.get('/managment/jobs/info');
			if (!response.success) return;
			this.jobs = response.json;
			this.jobs.forEach((job) => {
				const socketEvent = `${job.callpoint.replace('/', '').replaceAll('/', '_')}-end`;
				this.$socket.on(socketEvent, () => {
					job.running = false;
					this.$swal({
						toast: true,
						position: 'top-end',
						showConfirmButton: false,
						timer: 2500,
						icon: 'success',
						title: `${job.name} - Finished`,
						timerProgressBar: true,
					});
				});
			});
		},
		start(id) {
			const job = this.jobs.find((j) => j.id == id);
			job.running = true;
			job.lastRun = Date.now();
			this.$networking.get(`/managment${job.callpoint}`);
			this.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 2500,
				icon: 'warning',
				title: `${job.name} - Started!`,
				timerProgressBar: true,
			});
		},
	},
};
</script>
<style></style>
