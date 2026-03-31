<template>
	<div>
		<Modal v-model="toggleShowSeriesModal" :title="`List Series ${selectedShowSeriesSubSystem}`" size="lg">
			<div class="mb-3 ms-5 me-5">
				<label for="searchTerm" class="form-label">Search</label>
				<input v-model="searchTerm" type="text" class="form-control" id="searchTerm" aria-describedby="helpId" placeholder="Name or ID" />
				<small id="helpId" class="form-text text-secondary">Name or ID of the Series</small>
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
							v-for="serie in getSeriesList(subsystems.find((x) => x.id == selectedShowSeriesSubSystem)?.series ?? []).filter(
								(x) => x?.title.toLowerCase().includes(searchTerm.toLowerCase()) || x?.UUID.toLowerCase().startsWith(searchTerm.toLowerCase()),
							)"
						>
							<template v-if="serie !== undefined">
								<td scope="row">{{ serie.UUID }}</td>
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
		</Modal>
		<ManualMovingItemCreationModal v-model="toggleShowManualMovingItemCreationModal" />
		<h2 class="text-center">SubSystems</h2>
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-if="error" class="alert alert-danger" role="alert"><strong>Error:</strong> {{ error }}</div>
		<div class="row row-cols-2 row-cols-lg-5 g-2 g-lg-3 d-flex justify-content-between gap-3">
			<div v-for="subsystem in subsystems" :key="subsystem.id" class="card mb-3" style="max-width: 540px">
				<div class="card-body">
					<h5 class="card-title" :class="{ 'text-danger': subsystem.status == 'offline', 'text-success': subsystem.status == 'online' }">
						{{ subsystem.id }}
					</h5>
					<div class="card-text">
						<ul class="list-group list-group-flush">
							<li class="list-group-item">PToken: {{ subsystem.status == 'offline' ? 'Offline' : subsystem.ptoken }}</li>
							<li class="list-group-item">
								Endpoint:
								{{ subsystem.status == 'offline' ? 'Offline' : subsystem.endpoint ? subsystem.endpoint : '*Socket Transmit*' }}
							</li>
							<li v-if="subsystem.status == 'online'" class="list-group-item">bandwidth: {{ subsystem.bandwidth }} MB/s</li>
							<li class="list-group-item">Series: {{ subsystem.status == 'offline' ? 'Offline' : subsystem.series.length }}</li>
							<li v-if="subsystem.status == 'online' && subsystem.diskStats" class="list-group-item">
								Disk Usage:
								<div class="progress mt-2 mb-1" style="height: 25px">
									<div
										class="progress-bar"
										:class="getBarColor(subsystem.diskStats)"
										role="progressbar"
										:style="{ width: `${getUsagePercentage(subsystem.diskStats)}%` }"
										aria-valuenow="25"
										aria-valuemin="0"
										aria-valuemax="100"
									>
										{{ getUsagePercentage(subsystem.diskStats).toFixed(2) }}%
									</div>
								</div>
								<span> Used: {{ formatBytes(subsystem.diskStats.toalSize - subsystem.diskStats!.freeSize) }} </span>
								<br />
								<span> Free: {{ formatBytes(subsystem.diskStats!.freeSize) }} </span>
							</li>
						</ul>
						<div v-if="subsystem.status == 'online'" class="d-grid gap-2">
							<button type="button" @click="showSeriesModal(subsystem.id)" class="btn btn-outline-primary mt-2">List</button>
						</div>
					</div>
				</div>
			</div>
		</div>
		<h2 class="text-center mt-3 mb-5">MovingList ({{ adminStore.movingItems.length }})</h2>
		<div class="d-flex justify-content-center">
			<button type="button" class="btn btn-outline-primary me-4" @click="toggleShowManualMovingItemCreationModal = true">Add Item</button>
			<button type="button" class="btn btn-outline-warning me-4" @click="adminStore.moveAllItems()">
				Move All ({{ adminStore.movingItems.length }})
			</button>
			<button type="button" class="btn btn-outline-warning me-4" @click="adminStore.moveAllAdditionalItems()">
				Move Additional ({{ adminStore.movingItems.filter((x) => x.meta.isAdditional).length }})
			</button>
			<button type="button" class="btn btn-outline-danger" @click="adminStore.removeAdditionalItems()">Remove Additional Items</button>
		</div>
		<hr />
		<div v-auto-animate v-for="item in adminStore.movingItems" :key="item.ID" class="row">
			<div class="col-auto ms-5 me-auto">
				<h4 class="mb-1">
					{{ indexStore.seriesById.get(item.serie_UUID)?.title?.split('').splice(0, 50).join('') }}({{ item.serie_UUID }}) -- {{ item.ID }} -
					{{ item.meta.isAdditional ? 'Additional' : 'System' }}
				</h4>
				<div class="d-flex gap-2">
					<h5
						:class="{
							'text-success': isSubSystemOnline(item.fromSubID),
							'text-danger': !isSubSystemOnline(item.fromSubID),
						}"
					>
						{{ item.fromSubID }}
					</h5>
					<h5>=></h5>
					<h5
						:class="{
							'text-success': isSubSystemOnline(item.toSubID),
							'text-danger': !isSubSystemOnline(item.toSubID),
						}"
					>
						{{ item.toSubID }}
					</h5>
				</div>
				<!-- <h5>{{ item.fromSubID }} => p{{ item.toSubID }}</h5> -->
				<div class="d-flex gap-3 mb-3">
					<template v-if="item.meta.movingStarted == 0">
						<button v-if="!enqueuedMovingItems.has(item.ID)" @click="adminStore.moveItem(item.ID)" type="button" class="btn btn-outline-warning">
							Move
						</button>
						<button v-else class="btn btn-outline-warning" type="button" disabled>
							<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
							<span role="status">Moving...</span>
						</button>
					</template>
				</div>
			</div>
			<div class="ms-5 mb-3" style="width: 95%" v-if="item.meta.movingStarted !== 0">
				<div class="progress mt-2 mb-2" style="height: 30px">
					<div
						class="progress-bar progress-bar-striped progress-bar-animated bg-primary"
						role="progressbar"
						:style="{ width: `${item.meta.progress}%` }"
						:aria-valuenow="item.meta.progress"
						aria-valuemin="0"
						aria-valuemax="100"
					>
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
</template>

<script lang="ts" setup>
import type { DiskStats } from '@cinefinn/types/socket';
import ManualMovingItemCreationModal from '~/components/ManualMovingItemCreationModal.vue';
import Modal from '~/components/Modal.vue';

definePageMeta({
	middleware: 'auth',
});

const indexStore = useIndexStore();
const adminStore = useAdminStore();

await Promise.all([
	await callOnce('loadSubsystems', () => adminStore.loadSubsystems(), { mode: 'navigation' }),
	await callOnce('loadMovingItems', () => adminStore.loadMovingItems(), { mode: 'navigation' }),
]);

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);
const subsystems = computed(() => adminStore.subsystems);
const enqueuedMovingItems = computed(() => adminStore.enqueuedMovingItems);

const toggleShowManualMovingItemCreationModal = ref(false);

const toggleShowSeriesModal = ref(false);
const selectedShowSeriesSubSystem = ref('');
const searchTerm = ref('');

function showSeriesModal(subSystem: string) {
	selectedShowSeriesSubSystem.value = subSystem;
	toggleShowSeriesModal.value = true;
}

function getSeriesList(seriesIDs: string[]) {
	return seriesIDs.map((id) => indexStore.seriesById.get(id));
}

function isSubSystemOnline(subID: string) {
	if (subID == 'main') return true;
	const subsystem = adminStore.subsystems.find((x) => x.id == subID);
	return subsystem != undefined && subsystem.status == 'online';
}

// await callOnce('loadSubsystems', () => adminStore.loadSubsystems(), { mode: 'navigation' });

function getBarColor(diskStats: DiskStats | null) {
	if (diskStats == null) return 'bg-primary-subtle';

	const usagePercentage = getUsagePercentage(diskStats);

	if (usagePercentage > 90) {
		return 'bg-danger-subtle';
	}
	if (usagePercentage > 50) {
		return 'bg-warning-subtle';
	}
	if (usagePercentage > 20) {
		return 'bg-success-subtle';
	}

	return 'bg-primary-subtle';
}

function getUsagePercentage(diskStats: DiskStats | null) {
	if (diskStats == null) return 0;
	return Math.abs((diskStats.freeSize / diskStats.toalSize - 1) * 100);
}

function formatBytes(bytes: number, decimals: number = 2, iec: boolean = false) {
	const { value, unit } = bytesToUnit(bytes, iec);
	return `${value.toFixed(decimals)} ${unit}`;
}

function bytesToUnit(bytes: number, iec: boolean = false): { value: number; unit: string } {
	const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const iecUnits = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

	const devider = iec ? 1024 : 1000;
	const unitArr = iec ? iecUnits : units;

	let unitIndex = 0;
	let value = bytes;
	while (value >= devider && unitIndex < unitArr.length - 1) {
		value /= devider;
		unitIndex++;
	}
	return {
		value,
		unit: unitArr[unitIndex]!,
	};
}
</script>

<style></style>
