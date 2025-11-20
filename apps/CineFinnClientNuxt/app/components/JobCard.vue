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
					<p v-for="line in currentJob!.logs.reverse().slice(0,3)" :key="line" class="mb-0">{{ line.slice(0, 100) }}</p>
				</div>
			</div>
			<div class="row" v-else>
				<p>Latest Run: {{ new Date(+currentJob!.finished_at || 0).toLocaleString() }}</p>
				<p>Latest Duration: {{ msToReadable(+currentJob!.finished_at - +currentJob!.created_at || 0) }}</p>
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
	}
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
</script>

<style></style>
