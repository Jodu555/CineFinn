<template>
	<div>
		<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasSettings"
			aria-labelledby="offcanvasSettingsLabel">
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Infos - Settings</h5>
				<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
			</div>
			<div class="offcanvas-body">
				<h2>User Infos:</h2>
				<pre v-if="settings.developerMode.value">{{ userInfo }}</pre>
				<hr />
				<ul class="list-group list-group-flush mb-2" style="background: transparent;">
					<li class="list-group-item">
						<h5>
							<b>Username:</b> <span class="text-secondary">{{ userInfo.username }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>E-Mail:</b> <span class="text-secondary">{{ userInfo.email }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>Rolle:</b> <span class="text-secondary">{{ roleIDToName(userInfo.role) }}</span>
						</h5>
					</li>
					<!-- <li class="list-group-item">
						<h5>
							<b>Password: </b>
							<span class="text-secondary"><a href="#" @click="togglePasswordResetModal = true">Reset</a></span>
						</h5>
					</li> -->
				</ul>
				<template v-if="jobs.some((x) => userInfo.role >= x?.role)">
					<pre v-if="settings.developerMode.value">{{ { showJobs, showSettings } }}</pre>
					<h2 @click="showJobs = !showJobs">
						<p class="d-flex justify-content-between" style="align-items: center">
							Jobs:
							<font-awesome-icon style="margin-left: 0.5rem" size="xs"
								:icon="['fa-solid', showJobs ? 'chevron-up' : 'chevron-down']" />
						</p>
					</h2>
					<hr />
					<ul v-if="showJobs" class="list-group list-group-flush mb-3">
						<pre v-if="settings.developerMode.value">{{ jobs }}</pre>
						<template v-for="job in jobs">
							<JobListView v-if="parseInt(String(userInfo.role)) >= parseInt(String(job.role))"
								:id="job.id" :title="job.name" :callpoint="job.callpoint" :key="job.id"
								:running="job.running" :lastRun="job.lastRun" :click="start" />
						</template>
					</ul>
				</template>
				<h2 @click="showSettings = !showSettings">
					<p class="d-flex justify-content-between" style="align-items: center">
						Settings:
						<font-awesome-icon style="margin-left: 0.5rem" size="xs"
							:icon="['fa-solid', showSettings ? 'chevron-up' : 'chevron-down']" />
					</p>
				</h2>
				<hr />
				<div v-if="showSettings">
					<pre v-if="settings.developerMode.value">{{ settings }}</pre>
					<div v-for="(setting, key) of settings" :key="key" class="">
						<div v-if="setting.type === 'checkbox'" class="mb-3 form-check">
							<input type="checkbox" @change="
								(event) => {
									setting.value = (event.target as any).checked;
									updateSettings();
								}
							" v-model="setting.value" class="form-check-input" :id="key" />
							<label class="form-check-label" :for="key">{{ setting.title }}</label>
						</div>
					</div>

					<div class="d-grid gap-2">
						<button type="button" @click="resetSettings()" class="btn btn-outline-danger">Reset to Default
							Settings</button>
					</div>
				</div>
			</div>
		</div>
		<Modal id="toggleShowSeries" size="xl" v-model:show="togglePasswordResetModal">
			<template #title>Password Reset</template>
			<template #body>
				<div class="form-check form-switch">
					<input v-model="showPasswords" class="form-check-input" type="checkbox" id="flexSwitchCheckChecked"
						checked />
					<label class="form-check-label" for="flexSwitchCheckChecked">Show Passwords</label>
				</div>

				<form @submit.prevent="" class="card-text" id="loginForm">
					<fieldset>
						<div class="form-group">
							<InputValidator v-model="form.oldPassword" v-model:valid="form.oldPasswordValid"
								:type="showPasswords ? 'text' : 'password'" id="old-password" name="Old Password"
								autocomplete="old-password" placeholder="Enter Old Password"
								:rules="rules.passwordRules" />
						</div>
						<div class="form-group">
							<InputValidator v-model="form.newPassword" v-model:valid="form.newPasswordValid"
								:type="showPasswords ? 'text' : 'password'" id="new-password" name="New Password"
								autocomplete="current-password" placeholder="Enter Password"
								:rules="rules.passwordRules" />
						</div>
						<div class="form-group">
							<InputValidator v-model="form.newPasswordAgain" v-model:valid="form.newPasswordAgainValid"
								:type="showPasswords ? 'text' : 'password'" id="repeat-new-password" name="Password"
								autocomplete="current-password" placeholder="Enter Password"
								:rules="computedRules.passwordAgainRules" />
						</div>
						<button type="submit"
							:disabled="!(form.oldPasswordValid && form.newPasswordValid && form.newPasswordAgainValid && !showPasswords)"
							class="mt-4 btn btn-primary">
							Reset Password
						</button>
					</fieldset>
				</form>
			</template>
		</Modal>
	</div>
</template>
<script lang="ts">
import { mapActions, mapWritableState } from 'pinia';
import JobListView from '@/components/Layout/JobListView.vue';
import { roleIDToName } from '@/utils/constants';
import { useAuthStore } from '@/stores/auth.store';
import { useAxios } from '@/utils';
import type { Job } from '@Types/session';
import Modal from '@/components/Modal.vue';
import InputValidator from '@/components/InputValidator.vue';

export default {
	components: { JobListView, Modal, InputValidator },
	data() {
		return {
			jobs: [] as Job[],
			showJobs: false,
			showSettings: false,
			togglePasswordResetModal: false,
			showPasswords: false,
			form: {
				oldPassword: '',
				oldPasswordValid: false,

				newPassword: '',
				newPasswordValid: false,
				newPasswordAgain: '',
				newPasswordAgainValid: false,
			},
			rules: {
				passwordRules: [
					(value: string) => !!value || 'Cannot be empty.',
					(value: string) => (value.length >= 3 && value.length <= 100) || 'Must be at least 3 Characters and can only be 100',
				],
			},
		};
	},
	computed: {
		...mapWritableState(useAuthStore, ['userInfo', 'authToken', 'settings']),
		computedRules() {
			return {
				passwordAgainRules: [
					...this.rules.passwordRules,
					(value: string) => value.toString() == this.form.newPassword.toString() || 'Passwords do not match',
				],
			};
		},
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
			} catch (error) { }
		},
		async start(id: string) {

			let extra = '';
			let job: Job | undefined;
			if (id.endsWith('-smart') || id.endsWith('-old')) {
				extra = id.split('-')[1];
				job = this.jobs.find((j) => j.id == id.replace('-smart', '').replace('-old', ''));
			} else {
				job = this.jobs.find((j) => j.id == id);
			}
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
				const actualCallPoint = `/managment${job.callpoint}${extra ? `-${extra}` : ''}`;
				const response = await useAxios().get(actualCallPoint);
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
