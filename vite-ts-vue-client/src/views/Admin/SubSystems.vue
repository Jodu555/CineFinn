<template>
	<div class="container">
		<h2 class="text-center">SubSystems</h2>
		<div v-if="adminStore.loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-else>
			<p class="text-center display-6">{{ adminStore.subsystems.subSockets.length }} / {{ adminStore.subsystems.knownSubSystems.length }}</p>
			<div class="row row-cols-2 row-cols-lg-5 g-2 g-lg-3 d-flex justify-content-between gap-3">
				<div v-for="subsystemID in adminStore.subsystems.knownSubSystems" :key="subsystemID" class="card mb-3" style="max-width: 540px">
					<div class="card-body">
						<h5 class="card-title">{{ subsystemID }}</h5>
						<div class="card-text">
							<ul class="list-group list-group-flush">
								<li class="list-group-item">PToken: {{ idtoSock(subsystemID) == undefined ? 'Offline' : idtoSock(subsystemID)?.ptoken }}</li>
								<li class="list-group-item">
									Endpoint:
									{{
										idtoSock(subsystemID) == undefined
											? 'Offline'
											: idtoSock(subsystemID)?.endpoint
											? idtoSock(subsystemID)?.endpoint
											: '*Socket Transmit*'
									}}
								</li>
								<li v-if="idtoSock(subsystemID) !== undefined" class="list-group-item">Readrate: {{ idtoSock(subsystemID)?.readrate }}</li>
								<li class="list-group-item">
									Series: {{ idtoSock(subsystemID) == undefined ? 'Offline' : idtoSock(subsystemID)?.affectedSeriesIDs.length }}
								</li>
							</ul>
							<div v-if="idtoSock(subsystemID) !== undefined" class="d-grid gap-2">
								<button
									type="button"
									@click="
										toggleShowSeries = true;
										selectedSubSystem = subsystemID;
									"
									class="btn btn-outline-primary mt-2">
									List
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			<Modal id="toggleShowSeries" size="xl" v-model:show="toggleShowSeries">
				<template #title>Series for {{ selectedSubSystem }}</template>
				<template #body>
					<div class="mb-3 ms-5 me-5">
						<label for="searchTerm" class="form-label">Search</label>
						<input v-model="searchTerm" type="text" class="form-control" id="searchTerm" aria-describedby="helpId" placeholder="Name or ID" />
						<small id="helpId" class="form-text text-muted">Name or ID of the Series</small>
					</div>
					<div class="d-flex justify-content-center">
						<table class="table" style="width: 75%; max-width: 85%">
							<thead>
								<tr>
									<th scope="col">ID</th>
									<th scope="col">Title</th>
									<th scope="col">Actions</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="serie in idtoSock(selectedSubSystem)
										?.affectedSeriesIDs.map((x) => indexStore.series.find((y) => y.ID == x))
										.filter(
											(x) => x?.title.toLowerCase().includes(searchTerm.toLowerCase()) || x?.ID.toLowerCase().startsWith(searchTerm.toLowerCase())
										)">
									<template v-if="serie !== undefined">
										<td scope="row">{{ serie.ID }}</td>
										<td>{{ serie.title }}</td>
										<td>-</td>
									</template>
									<template v-else>
										<td scope="row">-</td>
										<td>-</td>
										<td>-</td>
									</template>
								</tr>
							</tbody>
						</table>
					</div>
				</template>
			</Modal>

			<Modal id="selectSeriesToMove" size="xl" v-model:show="toggleSelectEntityToMoveModal">
				<template #title>Detailed Disabled Series Overview</template>
				<template #body>
					<h3 class="text-center">List of Series</h3>
					<template v-if="movingSerieses.size > 0">
						<h5>Selected:</h5>
						<div class="row row-cols-3 row-cols-lg-5 g-2 g-lg-3 d-flex justify-content-between gap-1 mb-3">
							<div v-for="id in movingSerieses.keys()">
								<span class="text-primary">
									{{ id }}
								</span>
							</div>
						</div>
						<div class="d-flex justify-content-center mb-4">
							<button type="button" @click="selectedSeries = ''" style="width: 60%" class="btn btn-outline-success">Next</button>
						</div>
					</template>

					<div v-if="selectedSeries == ''" class="table-responsive-md">
						<div class="mb-3 ms-5 me-5">
							<label for="searchTerm" class="form-label">Search</label>
							<input v-model="searchTerm" type="text" class="form-control" id="searchTerm" aria-describedby="helpId" placeholder="Name or ID" />
							<small id="helpId" class="form-text text-muted">Name or ID of the Series</small>
						</div>
						<table class="table">
							<thead>
								<tr>
									<th scope="col">ID</th>
									<th scope="col">Title</th>
									<th scope="col">Actions</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="serie in indexStore.series.filter(
										(x) => x.title.toLowerCase().includes(searchTerm.toLowerCase()) || x.ID.toLowerCase().startsWith(searchTerm.toLowerCase())
									)">
									<td scope="row">{{ serie.ID }}</td>
									<td>{{ serie.title }}</td>
									<td>
										<button type="button" class="btn btn-outline-primary me-3" @click="selectSeries(serie.ID)">View</button>
										<template v-if="movingSerieses.has(serie.ID)">
											<button type="button" @click="movingSerieses.delete(serie.ID)" class="btn btn-outline-warning me-3">Remove Full</button>
										</template>
										<template v-else>
											<button type="button" @click="movingSerieses.add(serie.ID)" class="btn btn-outline-danger me-3">Add Full</button>
										</template>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
					<template v-if="selectedSeries !== ''">
						<div class="d-flex justify-content-center">
							<button type="button" @click="selectedSeries = ''" style="width: 50%" class="btn btn-outline-secondary">Back</button>
						</div>

						<div class="d-flex justify-content-center">
							<table class="table" style="width: 85%">
								<thead>
									<tr>
										<th scope="col">SExEP</th>
										<th scope="col">Langugages</th>
										<th scope="col">Actions</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="episode in indexStore.series.find((x) => x.ID == selectedSeries)?.seasons.flat()">
										<td scope="row">{{ episode.season }}x{{ episode.episode }}</td>
										<td>
											<img
												v-for="lang in episode.langs"
												:key="lang"
												class="flag shadow mb-1 mt-1 bg-body"
												:src="`/flag-langs/${lang.toLowerCase()}.svg`"
												:alt="langDetails[lang.toLowerCase()]?.alt || 'None Alt'"
												:title="langDetails[lang.toLowerCase()]?.title || 'None Title'" />
										</td>
										<td>
											<template v-if="selectedEps.has(uniEp(episode))">
												<button type="button" @click="selectedEps.delete(uniEp(episode))" class="btn btn-outline-warning me-3">Delete Full EP</button>
											</template>
											<template v-else>
												<button type="button" disabled @click="selectedEps.add(uniEp(episode))" class="btn btn-outline-primary me-3">
													Select Full EP
												</button>
											</template>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</template>
				</template>
			</Modal>

			<h2 class="text-center mt-3 mb-5">MovingList ({{ adminStore.subsystems.movingItems.length }})</h2>
			<div class="d-flex justify-content-center">
				<button type="button" class="btn btn-outline-primary" @click="toggleSelectEntityToMoveModal = true">Add Item</button>
			</div>

			<hr />
			<div v-auto-animate v-for="item in adminStore.subsystems.movingItems" :key="item.ID" class="row">
				<div class="col-auto ms-5 me-auto mb-3">
					<h4 class="mb-2">#{{ item.seriesID }} -- {{ item.ID }}</h4>
					<div class="d-flex gap-2">
						<h5
							:class="{
								'text-success': adminStore.subsystems.subSockets.find((x) => x.id == item.fromSubID) || item.fromSubID == 'main',
								'text-danger': adminStore.subsystems.subSockets.find((x) => x.id == item.fromSubID) == undefined && item.fromSubID != 'main',
							}">
							{{ item.fromSubID }}
						</h5>
						<h5>=></h5>
						<h5
							:class="{
								'text-success': adminStore.subsystems.subSockets.find((x) => x.id == item.toSubID) || item.toSubID == 'main',
								'text-danger': adminStore.subsystems.subSockets.find((x) => x.id == item.toSubID) == undefined && item.toSubID != 'main',
							}">
							{{ item.toSubID }}
						</h5>
					</div>
					<!-- <h5>{{ item.fromSubID }} => p{{ item.toSubID }}</h5> -->
					<div class="d-flex gap-3">
						<h6 class="mt-2">
							{{ item.filePath }}
						</h6>
						<button v-if="!item.meta.isMoving" @click="moveItem(item.ID)" type="button" class="btn btn-outline-warning">Move</button>
					</div>
				</div>
				<div class="ms-5 mb-3" style="width: 95%" v-if="item.meta.isMoving">
					<div class="progress mt-2 mb-2" style="height: 30px">
						<div
							class="progress-bar progress-bar-striped progress-bar-animated bg-primary"
							role="progressbar"
							:style="{ width: `${item.meta.progress}%` }"
							:aria-valuenow="item.meta.progress"
							aria-valuemin="0"
							aria-valuemax="100">
							<span class="h5 mt-2">{{ item.meta.progress }}%</span>
						</div>
					</div>
					<div>
						<span class="text-center text-warning h6">- {{ item.meta.result }}</span>
					</div>
				</div>
				<hr />
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import Modal from '@/components/Modal.vue';
import { useAdminStore } from '@/stores/admin.store';
import { useIndexStore } from '@/stores/index.store';
import { useWatchStore } from '@/stores/watch.store';
import type { SerieEpisode } from '@/types';
import { langDetails } from '@/utils/constants';
import { useSocket } from '@/utils/socket';
import { onMounted, ref } from 'vue';

const indexStore = useIndexStore();
const watchStore = useWatchStore();
const adminStore = useAdminStore();

const toggleSelectEntityToMoveModal = ref(false);
const toggleShowSeries = ref(false);
const selectedSubSystem = ref('');

const searchTerm = ref('');
const selectedSeries = ref('');

const selectedEps = ref(new Set());

const movingSerieses = ref<Set<string>>(new Set());

function uniEp(episode: SerieEpisode) {
	return `${episode.filePath}_${episode.langs.join('^')}_${episode.subID}`;
}

// function addFullEp(episode: SerieEpisode) {
// 	episode.langs.forEach(l => {

// 	})
// }

function idtoSock(ID: string) {
	return adminStore.subsystems.subSockets.find((x) => x.id == ID);
}

async function selectSeries(seriesID: string) {
	selectedSeries.value = seriesID;
	await watchStore.loadSeriesInfo(seriesID, false);
}

function moveItem(ID: string) {
	useSocket().emit('move-moving-item', { ID });
}

onMounted(async () => {
	document.title = `Cinema | Admin-SubSystems`;
});
</script>

<style scoped>
.flag {
	margin-left: 16px;
	width: 45px;
	cursor: pointer;
}
</style>
