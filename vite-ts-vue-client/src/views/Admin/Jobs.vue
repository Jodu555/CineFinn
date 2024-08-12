<template>
	<div>
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-6 gap-3">
			<Progress v-for="job in jobs" :id="job.id" :percentage="job.progress" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import Progress from '@/components/Admin/Progress.vue';
import { useAxios } from '@/utils';
import { BULLBOARDAPIURL } from '@/utils/__nogit';
import { onMounted, onUnmounted, ref } from 'vue';

interface Job {
	id: number;
	timestamp: number;
	name: string;
	progress: number;
	data: any;
}

const jobs = ref<Job[]>([]);

async function loadJobs() {
	const response = await useAxios().get<{
		queues: {
			name: string;
			jobs: Job[];
		}[];
	}>(BULLBOARDAPIURL, {
		headers: {
			token: 'testtokenLULW',
		},
	});

	if (response.status !== 200) return;

	const previewImageQueue = response.data.queues.find((x) => (x.name = 'previewImageQueue'));
	if (!previewImageQueue) return;

	jobs.value = previewImageQueue.jobs;
}

let interval: NodeJS.Timeout;

onMounted(async () => {
	await loadJobs();
	interval = setInterval(async () => {
		await loadJobs();
	}, 1500);
});

onUnmounted(() => {
	clearInterval(interval);
});
</script>

<style></style>
