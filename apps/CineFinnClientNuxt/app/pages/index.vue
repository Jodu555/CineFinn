<template>
	<div class="container">
		<!-- <button @click="indexStore.loadSeries()">Load Series</button> -->
		<div class="d-none d-md-block">
			<div class="mt-4 d-flex justify-content-center align-items-center">
				<h3>Showing {{ selectedSeries.length }} / {{ indexStore.series.length }} Serie(s)</h3>
			</div>
		</div>
		<div class="mb-4 d-flex justify-content-between">
			<div class="d-flex gap-4">
				<span v-for="cat in categories" @click="selectedCategory = cat" :key="cat"
					:class="selectedCategory == cat ? 'btn btn-outline-primary' : 'btn btn-outline-secondary'">
					{{ cat }}
				</span>
			</div>
			<div>
				<button class="btn btn-outline-info z-100" @click="() => (sort = !sort)">Sort {{ buttonInfo }}</button>
			</div>
		</div>
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
			<EntityCard v-for="(entity, idx) in selectedSeries" :series-i-d="entity.UUID" :key="entity.UUID"
				@add-to-playlist="onAddToPlaylist" />
			<!-- <EntityCard v-for="entity in selectedSeries"
                :highlighted="scrolledToLastSeries && entity.ID == showScrollToLastSeries" class="border-success"
                :entity="entity" :key="entity.ID" /> -->
		</div>
		<AddToPlaylistDialog ref="addToPlaylistDialog" :item-u-u-i-d="selectedSeriesToAddToPlaylist || ''"
			:content-title="selectedSeries.find(x => x.UUID === selectedSeriesToAddToPlaylist)?.title || ''">
			<template #trigger>
				<div></div>
			</template>
		</AddToPlaylistDialog>

	</div>
</template>

<script lang="ts" setup>
import type { FrontendSeries } from '@cinefinn/types/database';
import AddToPlaylistDialog from '~/components/AddToPlaylistDialog.vue';
import EntityCard from '~/components/EntityCard.vue';

definePageMeta({
	middleware: 'auth',
});

const indexStore = useIndexStore();

const addToPlaylistDialog = useTemplateRef('addToPlaylistDialog');

const selectedSeriesToAddToPlaylist = ref<string | null>(null);

const onAddToPlaylist = (seriesUUID: string) => {
	selectedSeriesToAddToPlaylist.value = seriesUUID;
	nextTick(() => {
		if (!addToPlaylistDialog.value) return
		addToPlaylistDialog.value.openModal();
	})
};


const selectedCategory = ref('Alle');

const sort = ref(false);
const buttonInfo = computed(() => {
	return sort.value ? '↑' : '↓';
});

const selectedSeries = computed(() => {
	let arr = [];
	if (selectedCategory.value == 'Alle') {
		arr = indexStore.series;
	} else {
		arr = indexStore.series.filter((i) => i.tags[0]! == selectedCategory.value);
	}

	if (sort.value) {
		arr = JSON.parse(JSON.stringify(arr)).reverse();
	}
	return arr as FrontendSeries[];
});

const categories = computed(() => {
	const cats = [...new Set(indexStore.series.map((i) => i.tags[0]!))];
	cats.unshift('Alle');
	return cats;
});

// onMounted(async () => {
// 	preloadImagesForNotSelectedCategories();
// });

// watch(selectedCategory, () => {
// 	preloadImagesForNotSelectedCategories();
// });

function preloadImagesForNotSelectedCategories() {
	// const prefetchedImages = new Set<HTMLImageElement>();
	// for (const cat of categories.value) {
	// 	// if (cat == 'Alle') continue;
	// 	if (cat == selectedCategory.value) continue;
	// 	// console.log('Preloading Category:', cat);
	// 	const catSeries = indexStore.series.filter((i) => i.tags[0]! == cat).slice(0, 10);
	// 	catSeries.forEach((s) => {
	// 		// indexStore.prefetchSeries(s.UUID);
	// 		const img = new Image();
	// 		const url = new URL('https://cinema-api.jodu555.de' + `/images/${s.UUID}/cover.jpg`);
	// 		url.searchParams.append('auth-token', 'SECR-DEV');
	// 		img.src = url.href;
	// 		prefetchedImages.add(img);
	// 		// console.log('Preloading', url.href);
	// 	});
	// }
}

preloadRouteComponents('/watch/:SID');
</script>

<style scoped></style>
