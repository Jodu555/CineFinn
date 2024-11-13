<template>
	<div v-auto-animate>
		<h2 class="text-center">Preview Image Generation</h2>

		<div class="mt-3 mb-5 d-flex justify-content-evenly">
			<button
				@click="toggleQueueStatus()"
				type="button"
				class="btn"
				:class="{ 'btn-outline-success': isPaused, 'btn-outline-danger': !isPaused }">
				{{ isPaused ? 'Resume' : 'Pause' }}
			</button>
			<button type="button" @click="retry('failed')" class="btn btn-outline-warning">Retry Failed</button>
		</div>

		<ul class="mt-3 nav justify-content-evenly nav-underline">
			<li style="cursor: pointer" v-for="queue in queues" class="nav-item me-5" @click="activeTab = queue.name">
				<a class="nav-link position-relative" :class="{ active: activeTab == queue.name }" aria-current="page">
					<h5>{{ upperCaseFirstLetter(queue.name) }}</h5>
					<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success-subtle text-success-emphasis">{{
						queue.jobs.length
					}}</span>
				</a>
			</li>
		</ul>
		<div v-auto-animate v-for="job in queues.find((x) => x.name == activeTab)?.jobs" :key="job.id" class="row">
			<div class="col-auto ms-5 me-auto">
				<div class="align-middle h-100" style="transform: translate(0px, 35%)">
					<h3 class="mb-3">#{{ job.id }} - {{ job.name }}</h3>
					<h4>
						"{{
							job.data?.entity?.primaryName
								? job.data?.entity?.primaryName.slice(0, 65).trim() +
								  String(job.data?.entity?.primaryName.slice(0, 65).length == job.data?.entity?.primaryName.length ? '' : '...')
								: '-'
						}}"{{ job.data?.entity ? (job.data?.entity as SerieEpisodeObject)?.season : -1 }}x{{
							job.data?.entity ? (job.data?.entity as SerieEpisodeObject)?.episode : -1
						}}
						On: {{ job.data?.generatorName ? job.data.generatorName : 'TBD' }} Lang: {{ job.data?.lang ? job.data.lang : '- -' }} Sub:
						{{ job.data?.entity?.subID ? job.data?.entity?.subID : 'main' }}
					</h4>
				</div>
			</div>
			<div
				class="col-auto"
				style="border-left: 3px solid rgb(222, 226, 230); opacity: 0.05; transform: translate(0px, 25px); height: 100px"></div>
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

		<!-- <Progress :percentage="testProgress" />
		<Progress :percentage="104.5" />
		<Progress :percentage="104.55" /> -->
	</div>
</template>

<script lang="ts" setup>
import Progress from '@/components/Admin/Progress.vue';
import { useAxios } from '@/utils';
import type { SerieEpisodeObject } from '@Types/classes';
import type { JobMeta } from '@Types/index';
import { onMounted, onUnmounted, ref } from 'vue';

function upperCaseFirstLetter(str: string) {
	return str.at(0)?.toUpperCase() + str.split('').slice(1).join('');
}

interface Job {
	id: number;
	timestamp: number;
	name: string;
	progress: number;
	data: JobMeta;
}

const lastUpdate = ref<string>();
const isPaused = ref<boolean>(false);
const queues = ref<{ name: string; jobs: Job[] }[]>([]);

const activeTab = ref('active');

// const testProgress = ref(0);

// const jobCountToLoad = 2048;
const jobCountToLoad = 10 ** 10;

async function loadJobsForQueue(queueType: string) {
	const response = await useAxios().get<{
		queues: {
			name: string;
			isPaused: boolean;
			jobs: Job[];
		}[];
	}>(`/bullboard/queues?activeQueue=previewImageQueue&page=1&jobsPerPage=${jobCountToLoad}&status=${queueType}`);

	if (response.status !== 200) return;

	const previewImageQueue = response.data.queues.find((x) => (x.name = 'previewImageQueue'));
	if (!previewImageQueue) return;

	const queue = queues.value.find((x) => x.name == queueType);

	if (queue) {
		queue.jobs = previewImageQueue.jobs;
	} else {
		queues.value.push({
			name: queueType,
			jobs: previewImageQueue.jobs,
		});
	}
	isPaused.value = previewImageQueue.isPaused;

	const typetonum = (type: string) => {
		switch (type) {
			case 'active':
				return 1;
			case 'waiting':
				return 2;
			case 'failed':
				return 3;
			case 'completed':
				return 4;

			default:
				return -1;
		}
	};

	queues.value.sort((a, b) => typetonum(a.name) - typetonum(b.name));
}

async function loadAllJobs() {
	await Promise.all([loadJobsForQueue('active'), loadJobsForQueue('waiting'), loadJobsForQueue('completed'), loadJobsForQueue('failed')]);
	lastUpdate.value = new Date().toLocaleTimeString();
}

let interval: NodeJS.Timeout;

onMounted(async () => {
	await loadAllJobs();

	document.title = `Cinema | Admin-Jobs`;

	interval = setInterval(async () => {
		// testProgress.value += 0.5;
		await loadAllJobs();
	}, 1500);
});

async function retry(queueType: string = 'failed') {
	const response = await useAxios().put(`/bullboard/queues/previewImageQueue/retry/${queueType}`, {});
	if (response.status !== 200) return;
}
async function pause() {
	const response = await useAxios().put(`/bullboard/queues/previewImageQueue/pause`, {});
	if (response.status !== 200) return;
}
async function resume() {
	const response = await useAxios().put(`/bullboard/queues/previewImageQueue/resume`, {});
	if (response.status !== 200) return;
}

async function toggleQueueStatus() {
	if (isPaused.value) {
		await resume();
	} else {
		await pause();
	}
	await loadAllJobs();
}

onUnmounted(() => {
	clearInterval(interval);
});
</script>

<style></style>
