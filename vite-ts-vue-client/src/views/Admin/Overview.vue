<template>
	<div v-if="loading" class="d-flex justify-content-center">
		<div class="spinner-border" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
	</div>
	<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-6 gap-3">
		<div class="col-auto text-center">
			<h2 class="text-center">Accounts</h2>
			<h4 class="text-center">{{ overview?.accounts }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Series</h2>
			<h4 class="text-center">{{ overview?.series }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Episodes</h2>
			<h4 class="text-center">{{ overview?.episodes }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Movies</h2>
			<h4 class="text-center">{{ overview?.movies }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">SubSystems</h2>
			<h4 class="text-center">{{ overview?.connectedSubSystems }} ({{ overview?.possibleSubSystems }})</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Sockets</h2>
			<h4 class="text-center">{{ overview?.sockets || '0' }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Streams</h2>
			<h4 class="text-center">{{ overview?.streams || '0' }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Scraper</h2>
			<h4 class="text-center">{{ overview?.scraper ? 'Ja' : 'Nein' }}</h4>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useAxios } from '@/utils';
import { onMounted, ref } from 'vue';

const loading = ref(false);

interface Overview {
	accounts: number;
	series: number;
	episodes: number;
	movies: number;
	connectedSubSystems: number;
	possibleSubSystems: number;
	sockets: number;
	streams: number;
	scraper: boolean;
}

const overview = ref<Overview>();

onMounted(async () => {
	document.title = `Cinema | Admin-Overview`;

	loading.value = true;

	const response = await useAxios().get<Overview>('/admin/overview');

	if (response.status == 200) {
		overview.value = response?.data;
	}

	loading.value = false;
});
</script>

<style></style>
