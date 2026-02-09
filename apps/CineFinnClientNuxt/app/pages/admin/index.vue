<template>
	<div>
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-if="error" class="alert alert-danger" role="alert"><strong>Error:</strong> {{ error }}</div>
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-6 gap-3">
			<div class="col-auto text-center">
				<h2 class="text-center">Accounts</h2>
				<h4 class="text-center">{{ overview.accounts }}</h4>
			</div>
			<Modal v-model="toggleDisabledSeriesModal" title="Detailed Disabled Series Overview" size="xl">
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
								<td scope="row">{{ serie.UUID }}</td>
								<td>{{ serie.title }}</td>
								<td>
									<button type="button" disabled class="btn btn-outline-primary me-3">Enable</button>
									<button type="button" disabled class="btn btn-outline-danger me-3">Delete</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</Modal>
			<div class="col-auto text-center" style="position: relative">
				<h2 class="text-center">Series</h2>
				<!-- <h4 class="text-center">{{ overview.series }}</h4> -->
				<h4 class="text-center">{{ indexStore.series.length }}</h4>
				<span
					v-if="indexStore.series.filter((x) => x.infos.disabled).length !== 0"
					@click="toggleDisabledSeriesModal = true"
					style="left: 70% !important; top: -2% !important; cursor: pointer"
					class="position-absolute translate-middle badge rounded-pill bg-danger-subtle text-danger-emphasis"
					>{{ indexStore.series.filter((x) => x.infos.disabled).length }}</span
				>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Movies</h2>
				<h4 class="text-center">{{ overview.movies }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Seasons</h2>
				<h4 class="text-center">{{ overview.seasons }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Episodes</h2>
				<h4 class="text-center">{{ overview.episodes }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">WatchableEntitys</h2>
				<h4 class="text-center">{{ overview.watchableEntitys }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Total Runtime</h2>
				<h4 class="text-center">{{ overview.totalRuntime }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">SubSystems</h2>
				<h4 class="text-center">{{ overview.subsystems.online }} ({{ overview.subsystems.all }})</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Sockets</h2>
				<h4 class="text-center">{{ overview.sockets || '0' }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Watched Entitys</h2>
				<h4 class="text-center">{{ overview.watchHistoryEntrys }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Playlists</h2>
				<h4 class="text-center">{{ overview.playlists }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Ignorance Items</h2>
				<h4 class="text-center">{{ overview.ignoranceItems }}</h4>
			</div>
			<div class="col-auto text-center">
				<h2 class="text-center">Scraper</h2>
				<h4 class="text-center">{{ overview.scraper ? 'Ja' : 'Nein' }}</h4>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({
	middleware: 'auth',
});

const toggleDisabledSeriesModal = ref(false);

const adminStore = useAdminStore();
const indexStore = useIndexStore();

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);

const overview = computed(() => adminStore.overview);
</script>

<style></style>
