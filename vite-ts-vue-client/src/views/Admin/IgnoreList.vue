<template>
	<div class="container">
		<h2 class="text-center">IgnoreList</h2>
		<div v-if="adminStore.loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-else>
			<div class="d-flex justify-content-center">
				<div class="mb-3 ms-5 me-5">
					<AutoComplete :options="{ placeholder: 'Add a Series', clearAfterSelect: true }" :data="autoCompleteSeries" :select-fn="addIgnoranceItem" />
				</div>
			</div>

			<!-- <div class="mb-3 ms-5 me-5">
				<label for="searchTerm" class="form-label">Search</label>
				<input v-model="searchTerm" type="text" class="form-control" id="searchTerm" aria-describedby="helpId" placeholder="Name or ID" />
				<small id="helpId" class="form-text text-muted">Name or ID of the Series</small>
			</div> -->
			<div class="d-flex justify-content-center">
				<div class="table-responsive">
					<table class="table table-dark w-auto">
						<thead>
							<tr>
								<th scope="col">ID</th>
								<th scope="col">Name</th>
								<th scope="col">Action</th>
							</tr>
						</thead>
						<tbody class="table-group-divider" v-auto-animate>
							<tr v-for="entity in entitys">
								<td scope="row">{{ entity.ID }}</td>
								<td>{{ entity.title }}</td>
								<td>
									<button type="button" class="btn btn-outline-danger" @click="removeIgnoranceItem(entity.ID)">Delete</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import EntityCard from '@/components/Home/EntityCard.vue';
import AutoComplete from '@/components/Layout/AutoComplete.vue';
import Modal from '@/components/Modal.vue';
import { useAdminStore } from '@/stores/admin.store';
import { useIndexStore } from '@/stores/index.store';
import type { Serie } from '@/types';
import { useAxios } from '@/utils';
import { langDetails } from '@/utils/constants';
import { useSocket } from '@/utils/socket';
import axios from 'axios';
import { computed, onMounted, ref } from 'vue';

const indexStore = useIndexStore();
const adminStore = useAdminStore();

const ignoreList = ref<{ ID: string; title: string }[]>([]);

const autoCompleteSeries = computed(() => {
	return indexStore.series.map((x) => ({ value: x.title, ID: x.ID })).filter((x) => x.value);
});

async function addIgnoranceItem(ID: string) {
	const serie = indexStore.series.find((x) => x.ID == ID);
	if (serie) {
		if (!ignoreList.value.find((x) => x.ID == serie.ID)) {
			const obj = {
				ID: serie.ID,
				title: serie.title,
			};
			ignoreList.value.push(obj);

			const response = await axios.put('http://localhost:3799/ignore/item', obj);

			console.log(response.status);
		}
	}
}

async function removeIgnoranceItem(ID: string) {
	ignoreList.value = ignoreList.value.filter((x) => x.ID != ID);
	const response = await axios.delete('http://localhost:3799/ignore/item/' + ID);
	console.log(response.status);
}

const entitys = computed(() => {
	return indexStore.series.filter((x) => ignoreList.value.find((y) => y.ID == x.ID));
});

onMounted(async () => {
	document.title = `Cinema | Admin-IgnoreList`;

	const response = await axios.get<{ ID: string; title: string }[]>('http://localhost:3799/ignore');
	// ignoreList.value = response.data;

	// for (const ignoreItem of ignoreList.value) {
	// 	const serie = indexStore.series.find((x) => x.ID == ignoreItem.ID);
	// 	if (serie) {
	// 		entitys.value.push(serie);
	// 	}
	// }
});
</script>

<style scoped>
.dp-img {
	max-width: 18rem;
	min-width: 17rem;
	min-height: 24rem;
	max-height: 20rem;
	width: 100%;
	object-fit: cover;
	border-radius: 25px;
}
</style>
