<template>
	<div>
		<h2 class="text-center">Preview Image Generation</h2>
		<div v-for="job in jobs" :key="job.id" class="row">
			<div class="col-auto ms-5 me-auto">
				<h4 class="text-center align-middle h-100" style="transform: translate(0px, 35%)">{{ job.name }} - Series Name</h4>
			</div>
			<div class="col-auto" style="border-left: 3px solid rgb(222, 226, 230); opacity: 0.05; transform: translate(0px, 25px); height: 100px"></div>
			<div class="col-auto">
				<Progress :percentage="job.progress" />
			</div>
			<hr />
		</div>
		<p class="text-center mt-4">Last Update: {{ lastUpdate }}</p>
		<!-- <div v-for="job in jobs" :key="job.id">
			<div class="">
				<div class="me-auto">
					<h4 class="text-center align-middle">{{ job.name }}</h4>
				</div>
				<div>
					<Progress :percentage="job.progress" />
				</div>
			</div>
			<hr />
		</div> -->
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

const lastUpdate = ref<string>();
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

	previewImageQueue.jobs.push(
		{
			id: 123,
			name: '479fd',
			progress: 45,
			timestamp: 1523,
			data: null,
		},
		{
			id: 123,
			name: '479fd',
			progress: 29,
			timestamp: 1523,
			data: null,
		}
	);

	jobs.value = previewImageQueue.jobs;
	lastUpdate.value = new Date().toLocaleTimeString();
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
