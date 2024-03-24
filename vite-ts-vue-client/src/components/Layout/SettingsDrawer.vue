<template>
	<div>
		<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasSettings" aria-labelledby="offcanvasSettingsLabel">
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Infos - Settings</h5>
				<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
			</div>
			<div class="offcanvas-body">
				<h2>User Infos:</h2>
				<pre v-if="settings.developerMode.value">{{ userInfo }}</pre>
				<hr />
				<ul class="list-group list-group-flush mb-2">
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
					<li class="list-group-item">
						<h5>
							<b>Rolle:</b> <span class="text-muted">{{ roleIDToName(userInfo.role) }}</span>
						</h5>
					</li>
				</ul>
				<template v-if="jobs.some((x) => userInfo.role >= x?.role)">
					<pre v-if="settings.developerMode.value">{{ { showJobs, showSettings } }}</pre>
					<h2 @click="showJobs = !showJobs">
						<p class="d-flex justify-content-between" style="align-items: center">
							Jobs:
							<font-awesome-icon style="margin-left: 0.5rem" size="xs" :icon="['fa-solid', showJobs ? 'chevron-up' : 'chevron-down']" />
						</p>
					</h2>
					<hr />
					<ul v-if="showJobs" class="list-group list-group-flush mb-3">
						<pre v-if="settings.developerMode.value">{{ jobs }}</pre>
						<template v-for="job in jobs">
							<JobListView
								v-if="parseInt(String(userInfo.role)) >= parseInt(String(job.role))"
								:id="job.id"
								:title="job.name"
								:callpoint="job.callpoint"
								:key="job.id"
								:running="job.running"
								:lastRun="job.lastRun"
								:click="start" />
						</template>
					</ul>
				</template>
				<h2 @click="showSettings = !showSettings">
					<p class="d-flex justify-content-between" style="align-items: center">
						Settings:
						<font-awesome-icon style="margin-left: 0.5rem" size="xs" :icon="['fa-solid', showSettings ? 'chevron-up' : 'chevron-down']" />
					</p>
				</h2>
				<hr />
				<div v-if="showSettings">
					<pre v-if="settings.developerMode.value">{{ settings }}</pre>
					<div v-for="(setting, key) of settings" :key="key" class="mb-3 form-check">
						<template v-if="setting.type === 'checkbox'">
							<input
								type="checkbox"
								@change="
									(event) => {
										setting.value = (event.target as any).checked;
										updateSettings();
									}
								"
								v-model="setting.value"
								class="form-check-input"
								:id="key" />
							<label class="form-check-label" :for="key">{{ setting.title }}</label>
						</template>
					</div>

					<div class="d-grid gap-2">
						<button type="button" @click="resetSettings()" class="btn btn-outline-danger">Reset to Default Settings</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { mapActions, mapWritableState } from 'pinia';
import JobListView from '@/components/Layout/JobListView.vue';
import { roleIDToName } from '@/utils/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { Job } from '@/types';
import { useAxios } from '@/utils';

export default {
	components: { JobListView },
	data() {
		return {
			jobs: [] as Job[],
			showJobs: false,
			showSettings: false,
		};
	},
	computed: {
		...mapWritableState(useAuthStore, ['userInfo', 'authToken', 'settings']),
	},
	mounted() {
		this.load();
	},
	async unmounted() {
		this.jobs.forEach((job) => {
			const socketEvent = `${job.callpoint.replace('/', '').replaceAll('/', '_')}-end`;
			this.$socket.off(socketEvent as 'jobEvent');
		});
	},
	methods: {
		...mapActions(useAuthStore, ['updateSettings', 'resetSettings']),
		roleIDToName,
		async load() {
			const response = await useAxios().get('/managment/jobs/info');
			try {
				this.jobs = response.data;
				this.jobs.forEach((job) => {
					const socketEvent = `${job.callpoint.replace('/', '').replaceAll('/', '_')}-end`;
					this.$socket.on(socketEvent as 'jobEvent', () => {
						if (!job.running) return;
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
			} catch (error) {}
		},
		async start(id: string) {
			const job = this.jobs.find((j) => j.id == id);
			if (!job) return;

			job.running = true;

			this.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 2500,
				icon: 'warning',
				title: `${job.name} - Started!`,
				timerProgressBar: true,
			});

			try {
				const response = await useAxios().get(`/managment${job.callpoint}`);
			} catch (error: any) {
				job.running = false;
				this.$swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 5500,
					icon: 'error',
					title: `${job.name} - ${error?.response?.data?.message || error.message}`,
					timerProgressBar: true,
				});
				return;
			}

			job.lastRun = Date.now();
		},
	},
};
</script>
<style></style>
