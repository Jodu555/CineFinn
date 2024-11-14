<template>
	<div>
		<div v-auto-animate style="z-index: 100">
			<a v-auto-animate v-if="backToTop" @click="scrollToTop()" id="backToTop" class="btn btn-primary btn-lg back-to-top" role="button"
				><font-awesome-icon icon="fa-solid fa-up-long" size="xl"
			/></a>
		</div>
		<div v-if="useIndexStore().loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div class="container accordion accordion-flush" id="accordionFlushExample">
			<div v-for="categorie of categories" :key="categorie.title" class="accordion-item">
				<h2 class="accordion-header">
					<button
						class="accordion-button collapsed"
						type="button"
						data-bs-toggle="collapse"
						:data-bs-target="'#flush-' + categorie.title"
						aria-expanded="false"
						:aria-controls="'flush-' + categorie.title">
						{{ categorie.title }} / {{ categorie.entitys.length }}
					</button>
				</h2>
				<div :id="'flush-' + categorie.title" class="accordion-collapse collapse">
					<div class="accordion-body">
						<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
							<EntityCard v-for="entity in categorie.entitys" :entity="entity" :key="entity.title" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script setup lang="ts">
import EntityCard from '@/components/Home/EntityCard.vue';
import { useIndexStore } from '@/stores/index.store';
import type { Serie } from '@Types/classes';
import { ref, onBeforeUnmount, computed, onMounted } from 'vue';
const backToTop = ref(false);

onMounted(() => {
	document.title = `Cinema | Jodu555`;
});

window.addEventListener('scroll', handleScroll, { passive: true });

onBeforeUnmount(() => {
	window.removeEventListener('scroll', handleScroll);
});

function handleScroll(e: Event) {
	const height = document.documentElement.offsetHeight;

	const mapping = map(
		document.documentElement.scrollTop,
		[0, height],
		[0, window.innerHeight - (document.querySelector('.footer')?.getBoundingClientRect().height || 0) - 25]
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

function map(value: number, oldRange: number[], newRange: number[]) {
	// console.log(value, oldRange, newRange);
	const newValue = ((value - oldRange[0]) * (newRange[1] - newRange[0])) / (oldRange[1] - oldRange[0]) + newRange[0];
	return Math.min(Math.max(newValue, newRange[0]), newRange[1]);
}

function scrollToTop() {
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

const categories = computed(() => {
	const categories: Record<string, { title: string; entitys: Serie[] }> = {};
	useIndexStore().series.forEach((i) => {
		if (categories[i.categorie] == undefined) {
			categories[i.categorie] = {
				title: i.categorie,
				entitys: [i],
			};
		} else {
			categories[i.categorie].entitys.push(i);
		}
	});
	return categories;
});
</script>
<style lang="css">
.back-to-top {
	position: fixed;
	/* bottom: 64px; */
	right: 25px;
	/* display: none; */
}
</style>
