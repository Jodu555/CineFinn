<template>
	<li class="list-group-item">
		<h5>{{ jobName }}</h5>

		<template v-if="currentJob != undefined">
			<div v-if="isRunning">
				<span class="text-secondary">Loading...</span>
				<div class="d-flex justify-content-center">
					<div class="spinner-grow text-info" style="width: 3rem; height: 3rem" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
				</div>
				<div class="text-muted" style="overflow: scroll; overflow-x: scroll; max-height: 200px">
					<p v-for="line in reversedLogs" :key="line" class="mb-0">{{ line.slice(0, 100) }}</p>
				</div>
			</div>
			<div class="row" v-else>
				<p class="mb-0">Latest Run: {{ new Date(jobPosNegCompletedAt).toLocaleString() }}</p>
				<p :class="{ 'mb-0': currentJob!.failed_at != 0 }">
					Latest Duration: {{ msToReadable(jobPosNegCompletedAt - +currentJob!.created_at || 0) }}
				</p>
				<p v-if="currentJob!.failed_at != 0" class="text-danger">Latest Run Failed!</p>
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
</template>

<script lang="ts" setup>
import type { JobType } from '@cinefinn/types/database';
import useAPIURL from '~/hooks/useAPIURL';

const managmentStore = useManagmentStore();
const authStore = useAuthStore();

const props = withDefaults(
	defineProps<{
		jobType: JobType;
	}>(),
	{
		jobType: 'crawl',
	},
);

const jobName = computed(() => managmentStore.jobRegistry[props.jobType]);

async function run(id: JobType) {
	const response = await $fetch(`${useAPIURL()}/managment/job/${id}`, {
		method: 'GET',
		headers: {
			'auth-token': authStore.authToken,
		},
	});
	await managmentStore.loadJobs();
}

const currentJob = computed(() => managmentStore.jobs.sort((a, b) => b.created_at - a.created_at).find((x) => x.type === props.jobType));

const isRunning = computed(() => currentJob.value?.finished_at == 0 && currentJob.value?.failed_at == 0);

const reversedLogs = computed(() => {
	// 1. Get the current logs array
	const logs = currentJob.value?.logs || [];

	// 2. Use a spread operator to create a copy before reversing
	// This prevents mutating the reactive store state directly (which is good practice)
	const reversed = [...logs].reverse();

	// 3. Return the sliced array. This calculation only runs when logs changes.
	return reversed.slice(0, 50);
});

const jobPosNegCompletedAt = computed(() => {
	if (currentJob.value == undefined) {
		return 0;
	}
	return +currentJob.value.finished_at || +currentJob.value.failed_at;
});
</script>

<style></style>
