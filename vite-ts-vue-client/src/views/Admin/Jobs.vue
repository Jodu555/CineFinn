<template>
	<div>
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-6 gap-3">
			<Progress v-for="job in jobs" :percentage="job.progress" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import Progress from '@/components/Admin/Progress.vue';
import { useAxios } from '@/utils';
import { BULLBOARDAPIURL } from '@/utils/__nogit';
import { onMounted, ref } from 'vue';

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
	// const response = await useAxios().get(`https://corsproxy.io/?${encodeURIComponent(BULLBOARDAPIURL)}`);

	console.log(response);

	const previewImageQueue = response.data.queues.find((x) => (x.name = 'previewImageQueue'));
	if (previewImageQueue) {
		jobs.value = previewImageQueue.jobs;
	}
}

onMounted(async () => {
	await loadJobs();
});
</script>

<style></style>
