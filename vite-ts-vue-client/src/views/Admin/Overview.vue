<template>
	<div v-if="adminStore.loading" class="d-flex justify-content-center">
		<div class="spinner-border" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
	</div>
	<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-6 gap-3">
		<div class="col-auto text-center">
			<h2 class="text-center">Accounts</h2>
			<h4 class="text-center">{{ adminStore.overview?.accounts }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Series</h2>
			<h4 class="text-center">{{ adminStore.overview?.series }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Episodes</h2>
			<h4 class="text-center">{{ adminStore.overview?.episodes }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Movies</h2>
			<h4 class="text-center">{{ adminStore.overview?.movies }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">SubSystems</h2>
			<h4 class="text-center">{{ adminStore.overview?.connectedSubSystems }} ({{ adminStore.overview?.possibleSubSystems }})</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Sockets</h2>
			<h4 class="text-center">{{ adminStore.overview?.sockets || '0' }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Streams</h2>
			<h4 class="text-center">{{ adminStore.overview?.streams || '0' }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Scraper</h2>
			<h4 class="text-center">{{ adminStore.overview?.scraper ? 'Ja' : 'Nein' }}</h4>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useAdminStore } from '@/stores/admin.store';
import { onMounted, ref } from 'vue';

const adminStore = useAdminStore();

onMounted(async () => {
	document.title = `Cinema | Admin-Overview`;
});
</script>
