<template>
	<div>
		<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasSettings" aria-labelledby="offcanvasSettingsLabel">
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Infos - Settings</h5>
				<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
			</div>
			<div class="offcanvas-body">
				<h2>User Infos:</h2>
				<pre v-if="authStore.user.settings.developerMode.value">{{ authStore.user }}</pre>
				<hr />
				<ul class="list-group list-group-flush mb-2" style="background: transparent">
					<li class="list-group-item">
						<h5>
							<b>Username:</b> <span class="text-secondary">{{ authStore.user.username }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>E-Mail:</b> <span class="text-secondary">{{ authStore.user.email }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>Rolle:</b> <span class="text-secondary">{{ roleIDToName(authStore.user.role) }}</span>
						</h5>
					</li>
				</ul>
				<div v-if="authStore.user.role >= Role.Mod">
					<h2>Jobs</h2>
					<hr />
					<ul v-if="managmentStore.error === ''" class="list-group list-group-flush mb-3">
						<JobCard v-for="(jobName, jobType) in managmentStore.jobRegistry" :job-type="jobType" :key="jobType" />
					</ul>
					<div v-else class="alert alert-danger" role="alert"><strong>Error:</strong> {{ managmentStore.error }}</div>
					<!-- <pre
						>{{ data }}
					</pre
					> -->
				</div>
				<div>
					<h2>Settings</h2>
					<hr />
					<div v-for="(setting, key) of authStore.user.settings" :key="key">
						<template v-if="setting.type === 'checkbox'">
							<div class="mb-3 form-check">
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
									:id="key"
								/>
								<label class="form-check-label" :for="key">{{ setting.title }}</label>
							</div>
						</template>

						<template v-if="setting.type === 'select'">
							<div class="mb-3 form-check">
								<label class="form-check-label" :for="key">{{ setting.title }}</label>
								<select
									class="form-select"
									:id="key"
									v-model="setting.value"
									@change="
										(event) => {
											setting.value = (event.target as any).checked;
											updateSettings();
										}
									"
								>
									<option v-for="option in setting.options" :key="option" :value="option">
										{{ option }}
									</option>
								</select>
							</div>
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
<script setup lang="ts">
import { Role } from '@cinefinn/types/database';
import JobCard from './JobCard.vue';

const authStore = useAuthStore();
const managmentStore = useManagmentStore();

if (authStore.loggedIn && authStore.user?.role >= Role.Mod) {
	await callOnce(managmentStore.loadJobs, { mode: 'navigation' });
}

function updateSettings() {
	useSocket().emit('updateSettings', authStore.user.settings);
}

function resetSettings() {
	useSocket().emit('resetSettings');
}
</script>
<style></style>
