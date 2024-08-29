<template>
	<div v-if="adminStore.loading" class="d-flex justify-content-center">
		<div class="spinner-border" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
	</div>
	<Modal id="disabledSeriesModal" size="xl" v-model:show="toggleSeriesModal">
		<template #title>Detailed Disabled Series Overview</template>
		<template #body>
			<h3 class="text-center">List of disabled Series</h3>
			<div class="table-responsive-md">
				<table class="table">
					<thead>
						<tr>
							<th scope="col">ID</th>
							<th scope="col">Title</th>
							<th scope="col">Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="serie in indexStore.series.filter((x) => x.infos.disabled)" class="">
							<td scope="row">{{ serie.ID }}</td>
							<td>{{ serie.title }}</td>
							<td>
								<button type="button" disabled class="btn btn-outline-primary me-3">Enable</button>
								<button type="button" disabled class="btn btn-outline-danger me-3">Delete</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template>
	</Modal>
	<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-6 gap-3">
		<div class="col-auto text-center">
			<h2 class="text-center">Accounts</h2>
			<h4 class="text-center">{{ adminStore.overview?.accounts }}</h4>
		</div>
		<div class="col-auto text-center">
			<h2 class="text-center">Series</h2>
			<!-- <h4 class="text-center">{{ adminStore.overview?.series }}</h4> -->
			<h4 class="text-center">{{ indexStore.series.length }}</h4>
			<span
				v-if="indexStore.series.filter((x) => x.infos.disabled).length !== 0"
				@click="toggleSeriesModal = true"
				style="left: 28% !important; top: 30% !important; cursor: pointer"
				class="position-absolute translate-middle badge rounded-pill bg-danger-subtle text-danger-emphasis"
				>{{ indexStore.series.filter((x) => x.infos.disabled).length }}</span
			>
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
import Modal from '@/components/Modal.vue';
import { useAdminStore } from '@/stores/admin.store';
import { useIndexStore } from '@/stores/index.store';
import { onMounted, ref } from 'vue';

const toggleSeriesModal = ref(false);

const adminStore = useAdminStore();
const indexStore = useIndexStore();

onMounted(async () => {
	document.title = `Cinema | Admin-Overview`;
});
</script>
