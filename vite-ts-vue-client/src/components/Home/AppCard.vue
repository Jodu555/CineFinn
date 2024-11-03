<template>
	<div class="carousel-card" :class="{ active: isActive }">
		<div class="carousel-card-image">
			<div v-if="imageLoading" class="text-center justify-content-center mt-3">
				<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
					<span class="visually-hidden">Loading...</span>
				</div>
			</div>
			<img ref="image" :src="searchItem.url" />
		</div>

		<div class="carousel-card-details">
			<div class="title"><span>Title:</span> {{ searchItem.title.split(' ').slice(0, 10).join(' ').trim() }}</div>
			<div><span>Year:</span> {{ searchItem.infos?.startDate || '?' }} - {{ searchItem.infos?.endDate || '?' }}</div>
			<div><span>Overview:</span> {{ searchItem.infos.description?.split(' ').slice(0, 30).join(' ').trim() }}...</div>
			<br />
			<div><span>ID:</span> {{ searchItem.ID }}</div>
			<br />
			<router-link class="btn btn-outline-primary btn-sm" :to="'/watch?id=' + searchItem.ID">Go & Watch</router-link>
			<!-- <router-link class="btn btn-outline-primary btn-sm" :to="'/watch?id=' + searchItem.ID">Play</router-link> -->
		</div>
	</div>
</template>

<script setup lang="ts">
import type { BrowseSerie } from '@/types';
import { onMounted, ref } from 'vue';

const props = defineProps<{
	searchItem: BrowseSerie;
	isActive: Boolean;
}>();
const image = ref<HTMLImageElement | null>(null);
const imageLoading = ref(true);
onMounted(() => {
	if (!image.value) return;
	image.value.addEventListener('load', () => {
		imageLoading.value = false;
	});
	image.value.addEventListener('error', () => console.log('Error on Loading Image', props.searchItem.ID));
});
</script>

<style lang="scss" scoped>
.carousel-card {
	cursor: pointer;
	transition: all 0.5s;
	border-radius: 20px;

	padding: 30px 10px;

	&:hover,
	&.active {
		transform: scale(1.15);
		border-radius: 20px;
	}

	&:hover .carousel-card-image img,
	&.active .carousel-card-image img {
		transition: opacity 0.2s ease-in-out;
		opacity: 0.1;
		border-radius: 20px;
	}

	.carousel-card-image {
		img {
			// max-width: 20vw;
			// min-width: 20vw;
			max-width: 18rem;
			min-width: 17rem;
			// max-width: 17rem;
			// min-width: 16rem;
			min-height: 24rem;
			max-height: 20rem;
			width: 100%;
			object-fit: cover;
			border-radius: 20px;
		}
	}

	.carousel-card-details {
		display: none;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 0.8em;
		width: 70%;
		height: 70%;
		transition: all 0.5s;
		overflow: hidden;
		overflow-y: auto;

		.title {
			text-transform: uppercase;
			font-weight: bold;
		}
	}

	&:hover .carousel-card-details,
	&.active .carousel-card-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	span {
		font-size: 1.1em;
		font-weight: bold;
		text-transform: uppercase;
		padding-right: 6px;
		color: rgb(220, 31, 43);
	}
}
</style>
