<template>
	<div class="container">
		<div>
			<h1>Info</h1>
			<p>Auth Token: {{ authStore.authToken }}</p>
			<p>Series: {{ indexStore.series.length }}</p>
			<p>Selected Category: {{ selectedCategory }}</p>
			<p>{{ selectedSeries.length }}</p>
		</div>
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
			<EntityCard v-for="entity in selectedSeries" class="border-success" :entity="entity" :key="entity.ID" />
			<!-- <EntityCard v-for="entity in selectedSeries"
                :highlighted="scrolledToLastSeries && entity.ID == showScrollToLastSeries" class="border-success"
                :entity="entity" :key="entity.ID" /> -->
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({
	middleware: 'auth',
});

const authStore = useAuthStore();
const indexStore = useIndexStore();

const selectedCategory = ref('Alle');
const sort = ref(false);

const selectedSeries = computed(() => {
	let arr = [];
	if (selectedCategory.value == 'Alle') {
		arr = indexStore.series;
	} else {
		arr = indexStore.series.filter((i) => i.tags[0] == selectedCategory.value);
	}

	if (sort.value) {
		arr = JSON.parse(JSON.stringify(arr)).reverse();
	}
	return arr;
});

const categories = computed(() => {
	const cats = [...new Set(indexStore.series.map((i) => i.tags[0]!))];
	cats.unshift('Alle');
	return cats;
});
</script>

<style scoped></style>
