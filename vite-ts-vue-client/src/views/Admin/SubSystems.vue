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
			<div class="d-flex justify-content-between gap-3">
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
								<li class="list-group-item">
									Series: {{ idtoSock(subsystemID) == undefined ? 'Offline' : idtoSock(subsystemID)?.affectedSeriesIDs.length }}
								</li>
							</ul>
						</div>
					</div>
				</div>
			</div>

			<h2 class="text-center mt-3 mb-5">MovingList ({{ adminStore.subsystems.movingItems.length }})</h2>
			<div class="d-flex justify-content-center">
				<!-- This Could show a modal where either a whole series a single season or some episodes can be made to a moving -->
				<button type="button" disabled class="btn btn-outline-primary">Add Item</button>
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
import { useAdminStore } from '@/stores/admin.store';
import { useSocket } from '@/utils/socket';
import { onMounted, ref } from 'vue';

const adminStore = useAdminStore();

function idtoSock(ID: string) {
	return adminStore.subsystems.subSockets.find((x) => x.id == ID);
}

function moveItem(ID: string) {
	useSocket().emit('move-moving-item', { ID });
}

onMounted(async () => {
	document.title = `Cinema | Admin-SubSystems`;
});
</script>

<style></style>
