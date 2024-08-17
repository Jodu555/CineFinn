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

			<h2 class="text-center mt-3 mb-5">MovingList</h2>
			<hr />
			<div v-auto-animate v-for="item in adminStore.subsystems.movingItems" :key="item.filePath" class="row">
				<div class="col-auto ms-5 me-auto mb-3">
					<h4 class="mb-2">#{{ item.seriesID }}</h4>
					<h5>{{ item.fromSubID }} => {{ item.toSubID }}</h5>
					<h6>
						{{ item.filePath }}
					</h6>
				</div>
				<hr />
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useAdminStore } from '@/stores/admin.store';
import { onMounted, ref } from 'vue';

const adminStore = useAdminStore();

function idtoSock(id: string) {
	return adminStore.subsystems.subSockets.find((x) => x.id == id);
}

onMounted(async () => {
	document.title = `Cinema | Admin-SubSystems`;
});
</script>

<style></style>
