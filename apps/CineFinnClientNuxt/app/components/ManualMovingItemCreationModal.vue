<template>
	<Modal v-model="proxyValue" size="xl" title="Create Manual Moving Item">
		<h3 class="text-center">{{ selectedSeries == '' && selectSubSystem === false ? 'List of Series' : 'Select SubSystem' }}</h3>

		<!-- Show affected Serieses -->
		<template v-if="movingSerieses.size > 0">
			<h5>Selected:</h5>
			<div v-auto-animate class="row row-cols-3 row-cols-lg-5 g-2 g-lg-3 d-flex justify-content-between gap-1 mb-4">
				<div v-for="id in movingSerieses.keys()" class="vstack gap-2">
					<span class="text-primary">
						{{ id }}
					</span>
					<span class="text-secondary">
						{{ indexStore.seriesById.get(id)?.title }}
					</span>
					<!-- <button class="btn btn-outline-danger col-3" @click="movingSerieses.delete(id)">Remove</button> -->
				</div>
			</div>
			<div v-if="selectSubSystem === false" class="d-flex justify-content-center mb-4">
				<button type="button" @click="nextStepSelectSubSystem()" style="width: 60%" class="btn btn-outline-success">Next</button>
			</div>
		</template>

		<!-- Select Serieses to move -->
		<div v-if="selectedSeries == '' && selectSubSystem === false" class="table-responsive-md">
			<div class="mb-3 ms-5 me-5">
				<label for="searchTerm" class="form-label">Search</label>
				<input
					v-model="searchTerm"
					type="text"
					class="form-control"
					id="searchTerm"
					aria-describedby="helpId"
					placeholder="Name or ID"
					autocomplete="off"
				/>
				<small id="helpId" class="form-text text-secondary">Name or ID of the Series</small>
			</div>
			<table class="table">
				<thead>
					<tr>
						<th scope="col">ID</th>
						<th scope="col">Title</th>
						<th scope="col">Actions</th>
					</tr>
				</thead>
				<tbody v-auto-animate>
					<tr
						v-for="serie in indexStore.series.filter(
							(x) => x.title.toLowerCase().includes(searchTerm.toLowerCase()) || x.UUID.toLowerCase().startsWith(searchTerm.toLowerCase()),
						)"
					>
						<td scope="row">{{ serie.UUID }}</td>
						<td>{{ serie.title }}</td>
						<td>
							<button type="button" class="btn btn-outline-primary me-3" @click="selectSeries(serie.UUID)" disabled>View</button>
							<template v-if="movingSerieses.has(serie.UUID)">
								<button type="button" @click="movingSerieses.delete(serie.UUID)" class="btn btn-outline-warning me-3">Remove Full</button>
							</template>
							<template v-else>
								<button type="button" @click="movingSerieses.add(serie.UUID)" class="btn btn-outline-danger me-3">Add Full</button>
							</template>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- <template v-if="selectedSeries !== ''">
			<div class="mb-3 d-flex justify-content-center">
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
									:title="langDetails[lang.toLowerCase()]?.title || 'None Title'"
								/>
							</td>
							<td>
								<template v-if="selectedEps.has(uniEp(episode))">
									<button type="button" @click="selectedEps.delete(uniEp(episode))" class="btn btn-outline-warning me-3">Delete Full EP</button>
								</template>
								<template v-else>
									<button type="button" disabled @click="selectedEps.add(uniEp(episode))" class="btn btn-outline-primary me-3">Select Full EP</button>
								</template>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</template> -->

		<!-- Select Subsystem to move to -->
		<template v-if="selectSubSystem === true && selectedSeries == '' && selectedSubSystem == ''">
			<h2 v-if="adminStore.subsystems.filter((x) => x.status == 'online').length == 0" class="text-center text-danger mb-5">
				No Active SubSystems found!
			</h2>

			<div class="row row-cols-2 row-cols-lg-5 g-2 g-lg-3 gap-3">
				<div class="card text-start">
					<div class="card-body">
						<h4 class="card-title text-warning">main</h4>
						<div class="d-grid gap-2">
							<button type="button" @click="selectedSubSystem = 'main'" class="btn btn-outline-primary mt-2">Select</button>
						</div>
					</div>
				</div>
				<div v-for="subsystem in adminStore.subsystems" :key="subsystem.id" class="card text-start">
					<div class="card-body">
						<h4
							class="card-title"
							:class="{
								'text-danger': subsystem.status === 'offline',
								'text-success': subsystem.status === 'online',
							}"
						>
							{{ subsystem.id }}
						</h4>
						<div v-if="subsystem.status == 'online'" class="d-grid gap-2">
							<button type="button" @click="selectedSubSystem = subsystem.id" class="btn btn-outline-primary mt-2">Select</button>
						</div>
					</div>
				</div>
			</div>
		</template>
		<!-- Last Check & Submit -->
		<template v-if="selectSubSystem === true && selectedSubSystem !== ''">
			<div class="text-center">
				<h2>Your About to send the above shown Serie/s!</h2>
				<h2>To The SubSystem:</h2>
				<h3>{{ selectedSubSystem }}</h3>
				<button type="button" class="btn btn-outline-warning mt-3 mb-4" @click="cancelMoving()">Cancel</button>
			</div>
			<div class="d-grid gap-2">
				<button type="button" class="btn btn-outline-success mt-3 mb-4" @click="submitMoving()">Do it</button>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts" setup>
const indexStore = useIndexStore();
const adminStore = useAdminStore();

const props = defineProps<{
	modelValue: boolean;
}>();

const emit = defineEmits<{
	(e: 'update:modelValue', value: boolean): void;
}>();

const proxyValue = computed({
	get: () => props.modelValue,
	set: (val) => emit('update:modelValue', val),
});

const selectedSeries = ref('');
const searchTerm = ref('');
const selectSubSystem = ref(false);
const selectedSubSystem = ref('');

const movingSerieses = ref(new Set<string>());

function nextStepSelectSubSystem() {
	selectSubSystem.value = true;
	selectedSubSystem.value = '';
	selectedSeries.value = '';
}

async function selectSeries(seriesID: string) {
	selectedSeries.value = seriesID;
	// await watchStore.loadSeriesInfo(seriesID, false);
}

function cancelMoving() {
	selectSubSystem.value = false;
	selectedSubSystem.value = '';
	searchTerm.value = '';
	movingSerieses.value = new Set();
}

function submitMoving() {
	// adminStore.moveAllItems();
}
</script>

<style></style>
