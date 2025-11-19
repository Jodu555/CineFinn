<template>
	<div>
		<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasSettings" aria-labelledby="offcanvasSettingsLabel">
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Infos - Settings</h5>
				<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
			</div>
			<div class="offcanvas-body">
				<h2>User Infos:</h2>
				<pre v-if="authStore.user.settings.deleveloperMode">{{ authStore.user }}</pre>
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
				<template v-if="authStore.user.role > 1">
					<h2>Jobs</h2>
					<hr />
					<ul class="list-group list-group-flush mb-3">
						<li v-for="(jobName, jobType) in jobRegistry" :key="jobType" class="list-group-item">
							<h5>{{ jobName }}</h5>

							<template v-if="getJob(jobType) != undefined">
								<div v-if="getJob(jobType)!.finished_at == 0 && getJob(jobType)!.failed_at == 0">
									<span class="text-secondary">Loading...</span>
									<div class="d-flex justify-content-center">
										<div class="spinner-grow text-info" style="width: 3rem; height: 3rem" role="status">
											<span class="visually-hidden">Loading...</span>
										</div>
									</div>
								</div>
								<div class="row" v-else>
									<p>Latest Run: {{ new Date(+getJob(jobType)!.finished_at || 0).toLocaleString() }}</p>
									<p>Latest Duration: {{ msToReadable(+getJob(jobType)!.finished_at - +getJob(jobType)!.created_at || 0) }}</p>

									<!-- <template v-if="jobType === 'checkForUpdates'">
										<div class="btn-group" role="group" aria-label="Button group name">
											<button type="button" @click="click(jobType)" class="btn btn-outline-info">Smart</button>
											<button type="button" @click="click(jobType)" class="btn btn-outline-warning">Old</button>
										</div>
									</template> -->
									<button @click="run(jobType)" class="btn btn-outline-info">Start</button>
								</div>
							</template>
							<template v-else>
								<!-- Job not found -->
								<div class="row">
									<button @click="run(jobType)" class="btn btn-outline-info">Start</button>
								</div>
							</template>
						</li>
					</ul>
					<!-- <pre
						>{{ data }}
					</pre
					> -->
				</template>
			</div>
		</div>
	</div>
</template>
<script setup lang="ts">
import type { Job, JobType, timestamped } from '@cinefinn/types/database';
import useAPIURL from '~/hooks/useAPIURL';

const jobRegistry = {
	crawl: 'Crawl the Archive',
	generatePreviewImages: 'Generate Preview Images',
	'checkForUpdates-old': 'Check for Updates Old',
	'checkForUpdates-smart': 'Check for Updates Smart',
} as Record<JobType, string>;

const authStore = useAuthStore();
onMounted(() => {
	console.log('SettingsDrawer mounted');
	console.log(authStore.user);
});

const { data, status, refresh, error } = useFetch<[Job & timestamped]>(`${useAPIURL()}/managment/jobs/info`, {
	headers: {
		'auth-token': authStore.authToken,
	},
});

function getJob(id: JobType) {
	return data.value?.sort((a, b) => a.created_at - b.created_at).find((x) => x.type === id);
}

async function run(id: JobType) {
	const response = await $fetch(`${useAPIURL()}/managment/job/${id}`, {
		method: 'GET',
		headers: {
			'auth-token': authStore.authToken,
		},
	});
	await refresh();
}

function msToReadable(ms: number) {
	const milliseconds = Math.floor((ms % 1000) / 100);
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
	const days = Math.floor(ms / (1000 * 60 * 60 * 24));

	console.log({
		milliseconds,
		seconds,
		minutes,
		hours,
		days,
	});

	let result = '';
	if (days > 0) result += `${days}d `;
	if (hours > 0) result += `${hours}h `;
	if (minutes > 0) result += `${minutes}m `;
	if (seconds > 0) result += `${seconds}s`;
	if (milliseconds > 0) result += `.${milliseconds}ms`;
	return result.trim();
}

function timeAgo(timestamp: Date, locale = 'en') {
	let value;
	const diff = (new Date().getTime() - timestamp.getTime()) / 1000;
	const minutes = Math.floor(diff / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const months = Math.floor(days / 30);
	const years = Math.floor(months / 12);
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

	if (years > 0) {
		value = rtf.format(0 - years, 'year');
	} else if (months > 0) {
		value = rtf.format(0 - months, 'month');
	} else if (days > 0) {
		value = rtf.format(0 - days, 'day');
	} else if (hours > 0) {
		value = rtf.format(0 - hours, 'hour');
	} else if (minutes > 0) {
		value = rtf.format(0 - minutes, 'minute');
	} else {
		value = rtf.format(parseInt(String(0 - diff)), 'second');
	}
	return value;
}

function roleIDToName(id: number) {
	switch (id) {
		case 1:
			return 'User';
		case 2:
			return 'Moderator';
		case 3:
			return 'Administrator';
		default:
			return 'Unknown Role';
	}
}
</script>
<style></style>
