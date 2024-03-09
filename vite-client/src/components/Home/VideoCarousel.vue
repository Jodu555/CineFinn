<script>
import { defineComponent } from 'vue';
import { Carousel, Navigation, Slide, Pagination } from 'vue3-carousel';
import 'vue3-carousel/dist/carousel.css';
import AppCard from './AppCard.vue';
export default defineComponent({
	name: 'Breakpoints',
	components: {
		AppCard,
		Carousel,
		Slide,
		Navigation,
		Pagination,
	},
	props: ['category', 'list', 'wrapAround'],
	data: () => ({
		settings: {
			itemsToShow: 1,
			snapAlign: 'center',
		},
		breakpoints: {
			//This Works by taking the default from settings and then for example 450 works until somehting other is specified so 450 up to in this case 600
			450: {
				itemsToShow: 1.4,
				snapAlign: 'center',
			},
			600: {
				itemsToShow: 1.8,
				snapAlign: 'center',
			},
			900: {
				itemsToShow: 3,
				snapAlign: 'center',
			},
			1224: {
				itemsToShow: 4.4,
				snapAlign: 'start',
			},
			1600: {
				itemsToShow: 5.5,
				snapAlign: 'start',
			},
			1800: {
				itemsToShow: 6.5,
				snapAlign: 'start',
			},
		},
		activeMovieIndex: 0,
		activeSeriesIndex: 0,
		activeIdx: null,
	}),
});
</script>

<template>
	<main class="container-centered">
		<h1 class="ms-4">{{ category }}:</h1>
		<Carousel :settings="settings" :wrap-around="wrapAround" :breakpoints="breakpoints">
			<Slide v-for="(movie, index) in list" :key="movie">
				<div class="carousel__item" @click="activeIdx == index ? (activeIdx = -1) : (activeIdx = index)">
					<AppCard :searchItem="movie" :isActive="activeIdx == index" :itemType="'movie'"></AppCard>
				</div>
			</Slide>

			<template #addons>
				<Navigation>
					<template #prev>
						<font-awesome-icon icon="fa-solid fa-chevron-left" size="2xl" />
					</template>
					<template #next>
						<font-awesome-icon icon="fa-solid fa-chevron-right" size="2xl" beat />
					</template>
				</Navigation>
				<Pagination />
			</template>
		</Carousel>
	</main>
</template>

<style lang="scss" scoped>
// CARD PREVIEW
.card-preview {
	display: flex;
	align-items: center;
	height: 100vh;
	background-repeat: no-repeat;
	background-size: cover;
	padding-top: 70px;

	.overlay {
		display: flex;
		width: 100%;
		height: 100%;
		background: linear-gradient(to left, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.6));
	}

	.card-preview-details {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 10px;

		.preview-title {
			text-transform: uppercase;
			font-weight: bold;
			font-size: 18px;
		}

		.title,
		.overview {
			text-transform: uppercase;
			font-weight: bold;
			font-size: 22px;
			color: rgb(220, 31, 43);
		}

		.preview-overview {
			width: 30%;
			font-weight: bold;
		}

		.title-text {
			color: white;
		}

		.overview-text {
			color: white;
			text-transform: lowercase;
			font-size: 0.6em;

			&::first-letter {
				text-transform: uppercase;
			}
		}
	}
}

//END CARD PREVIEW
main {
	padding-top: 30px;

	h2 {
		font-size: 30px;
		margin-bottom: 20px;
	}

	.carousel {
		text-align: start;
	}

	.fa-solid.fa-chevron-right {
		font-size: 46px;
		padding-right: 20px;
		color: white;
		transition: all 0.4s ease-in-out;
	}

	.fa-solid.fa-chevron-left {
		font-size: 50px;
		padding-left: 20px;
		color: white;
		transition: all 0.5s ease-in-out;
	}

	.fa-solid.fa-chevron-right:hover,
	.fa-solid.fa-chevron-left:hover {
		transform: scale(1.4);
	}

	.carousel:hover .fa-solid.fa-chevron-right,
	.carousel:hover .fa-solid.fa-chevron-left {
		transform: scale(1.4);
	}
}
</style>
