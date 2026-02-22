<template>
	<div class="container">
		<h1 class="text-center">Ignore List ({{ 0 }})</h1>
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-if="error" class="alert alert-danger" role="alert"><strong>Error:</strong> {{ error }}</div>
		<div>
			<div class="d-flex justify-content-center">
				<div class="mb-3 ms-5 me-5 mt-2">
					<AutoComplete
						:options="{ placeholder: 'Add a Series', clearAfterSelect: true, maximumItems: 7, inputWidth: '25rem' }"
						:data="autoCompleteSeries"
						:select-fn="addIgnoranceItem"
						:prefetch-fn="() => {}"
					/>
				</div>
			</div>
			<div class="d-flex justify-content-center">
				<div class="table-responsive">
					<table class="table table-dark w-auto">
						<thead>
							<tr>
								<th scope="col">UUID</th>
								<th scope="col">Title</th>
								<th scope="col">Lang</th>
								<th scope="col">Action</th>
								<th scope="col">Created At</th>
							</tr>
						</thead>
						<tbody class="table-group-divider" v-auto-animate>
							<tr v-for="item in ignoranceItems">
								<template v-if="item != undefined">
									<td scope="row">{{ item.serie_UUID }}</td>
									<td>{{ indexStore.seriesById.get(item.serie_UUID)?.title }}</td>
									<td>
										{{ item.lang || 'All' }}
									</td>
									<td>
										<button type="button" class="btn btn-outline-danger" @click="adminStore.deleteIgnoranceItem(item.serie_UUID)">Delete</button>
									</td>
									<td>
										{{ new Date(+item.created_at).toLocaleString() }}
									</td>
								</template>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import AutoComplete from '~/components/Layout/AutoComplete.vue';

definePageMeta({
	middleware: 'auth',
});

const adminStore = useAdminStore();
const indexStore = useIndexStore();

await callOnce('loadIgnoranceItems', () => adminStore.loadIgnoranceItems(), { mode: 'navigation' });

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);
const ignoranceItems = computed(() => adminStore.ignoranceItems);

const autoCompleteSeries = computed(() => {
	return indexStore.series.map((x) => ({ value: x.title, ID: x.UUID })).filter((x) => x.value);
});

async function addIgnoranceItem(ID: string) {
	const serie = indexStore.seriesById.get(ID);
	if (serie) {
		const obj = {
			serie_UUID: serie.UUID,
		};
		adminStore.createIgnoranceItem(obj);
	}
}
</script>

<style></style>
