<template>
	<div class="container">
		<!-- <button @click="indexStore.loadSeries()">Load Series</button> -->
		<div v-auto-animate style="z-index: 100">
			<a v-auto-animate v-if="backToTop" @click="scrollToTop()" id="backToTop" class="btn btn-primary btn-lg back-to-top" role="button"
				><font-awesome-icon icon="fa-solid fa-up-long" size="xl"
			/></a>
		</div>
		<div class="d-none d-md-block">
			<div class="mt-4 d-flex justify-content-center align-items-center">
				<h3>Showing {{ selectedSeries.length }} / {{ indexStore.series.length }} Serie(s)</h3>
			</div>
		</div>
		<div class="mb-4 d-flex justify-content-between">
			<div class="d-flex gap-4">
				<span
					v-for="cat in categories"
					@click="selectedCategory = cat"
					:key="cat"
					:class="selectedCategory == cat ? 'btn btn-outline-primary' : 'btn btn-outline-secondary'"
				>
					{{ cat }}
				</span>
			</div>
			<div>
				<button class="btn btn-outline-info z-100" @click="() => (sort = !sort)">Sort {{ buttonInfo }}</button>
			</div>
		</div>
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
			<EntityCard
				v-for="(entity, idx) in selectedSeries"
				:series-i-d="entity.UUID"
				:key="entity.UUID"
				:index="idx"
				@add-to-playlist="onAddToPlaylist"
			/>
			<!-- <EntityCard v-for="entity in selectedSeries"
                :highlighted="scrolledToLastSeries && entity.ID == showScrollToLastSeries" class="border-success"
                :entity="entity" :key="entity.ID" /> -->
		</div>
		<AddToPlaylistDialog
			ref="addToPlaylistDialog"
			:item-u-u-i-d="selectedSeriesToAddToPlaylist || ''"
			:content-title="selectedSeries.find((x) => x.UUID === selectedSeriesToAddToPlaylist)?.title || ''"
		>
			<template #trigger>
				<div></div>
			</template>
		</AddToPlaylistDialog>
	</div>
</template>

<script lang="ts" setup>
import type { FrontendSeries } from '@cinefinn/types';
import AddToPlaylistDialog from '~/components/AddToPlaylistDialog.vue';
import EntityCard from '~/components/EntityCard.vue';

definePageMeta({
	middleware: 'auth',
});

useSeoMeta({
	title: 'Cinema | List',
});

const indexStore = useIndexStore();

const addToPlaylistDialog = useTemplateRef('addToPlaylistDialog');

const selectedSeriesToAddToPlaylist = ref<string | null>(null);

const onAddToPlaylist = (seriesUUID: string) => {
	selectedSeriesToAddToPlaylist.value = seriesUUID;
	nextTick(() => {
		if (!addToPlaylistDialog.value) return;
		addToPlaylistDialog.value.openModal();
	});
};

const sortCookie = useCookie('list-sort');
const categoryCookie = useCookie('list-category');

const selectedCategory = ref(categoryCookie.value || 'Alle');

const sort = ref(sortCookie.value === 'true' ? true : false);

watch([selectedCategory, sort], () => {
	console.log('Sorting or Categorys changes saving');
	sortCookie.value = sort.value.toString();
	categoryCookie.value = selectedCategory.value;
});

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

onMounted(() => {
	window.addEventListener('scroll', handleScroll, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener('scroll', handleScroll);
});

function handleScroll(e: Event) {
	const height = document.documentElement.offsetHeight;

	const mapping = map(
		document.documentElement.scrollTop,
		[0, height],
		[0, window.innerHeight - (document.querySelector('.footer')?.getBoundingClientRect().height || 0) - 25],
	);

	// console.log('SCROLL', height, document.documentElement.scrollTop);
	// console.log('MAPPING', Math.ceil(mapping));

	if (document.documentElement.scrollTop > 100) {
		backToTop.value = true;
		const backToTopElem = document.querySelector<HTMLDivElement>('#backToTop');
		if (backToTopElem) backToTopElem.style.top = `${Math.ceil(mapping)}px`;
	} else {
		backToTop.value = false;
	}
}

const backToTop = ref(false);

//This function maps a value from one range to another range and clamps it to the new range
function map(value: number, oldRange: number[], newRange: number[]) {
	const newValue = ((value - oldRange[0]!) * (newRange[1]! - newRange[0]!)) / (oldRange[1]! - oldRange[0]!) + newRange[0]!;
	return Math.min(Math.max(newValue, newRange[0]!), newRange[1]!);
}

function scrollToTop() {
	window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<style scoped>
.back-to-top {
	position: fixed;
	/* bottom: 64px; */
	right: 25px;
	/* display: none; */
}
</style>
