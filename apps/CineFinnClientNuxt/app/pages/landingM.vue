<template>
	<div data-bs-theme="dark" class="landing-m-page">
		<!-- ── FRANCHISE CAROUSEL ───────────────────────────────────────────────────── -->
		<div v-if="showFranchises" class="container mt-3 shadow-lg p-2 mb-3 mt-1 rounded franchise-container">
			<div class="franchise-carousel-wrapper">
				<button class="franchise-nav-btn franchise-nav-prev" @click="slidePrev(franchiseCarouselRef)" aria-label="Previous">
					<font-awesome-icon icon="fa-solid fa-chevron-left" size="lg" />
				</button>
				<Carousel ref="franchiseCarouselRef" v-bind="franchiseCarouselConfig">
					<Slide v-for="franchise in franchises" :key="franchise.id">
						<div class="carousel-item-wrapper" style="height: 100%; width: 100%">
							<div class="franchise-slide">
								<img :src="franchise.backgroundImage" class="d-block w-100 franchise-backdrop" :alt="franchise.slug" />
								<div class="franchise-gradient-start"></div>
								<div class="franchise-gradient-end"></div>
								<div class="franchise-content">
									<img :src="franchise.logo" :alt="franchise.slug" class="franchise-logo" />
									<p class="text-secondary mt-2 mb-1">{{ franchise.description }}</p>
									<p class="text-info mb-2">{{ franchise.contentCount }}</p>
									<NuxtLink class="btn btn-outline-info" :to="`/franchise/${franchise.slug}`">
										<font-awesome-icon :icon="['fas', 'circle-info']" class="me-2" />
										Mehr Infos
									</NuxtLink>
								</div>
							</div>
						</div>
					</Slide>
				</Carousel>
				<button class="franchise-nav-btn franchise-nav-next" @click="slideNext(franchiseCarouselRef)" aria-label="Next">
					<font-awesome-icon icon="fa-solid fa-chevron-right" size="lg" />
				</button>
			</div>
		</div>

		<!-- ── CONTENT ROWS ─────────────────────────────────────────────────────────── -->
		<div class="content-zone ssr-active px-2 px-lg-4">
			<!-- Dynamic carousels from API -->
			<template v-if="carouselData!.length > 0">
				<div v-for="carousel in carouselData" :key="carousel.id" class="content-row">
					<div class="row-header px-2">
						<div class="row-title-group">
							<font-awesome-icon :icon="carousel.icon" class="row-icon text-danger" />
							<span class="row-title" :title="carousel.description">{{ carousel.title }}</span>
						</div>
						<div class="carousel-nav-btns">
							<button class="nav-arrow-btn" @click="slidePrev(carousel.id)">
								<font-awesome-icon icon="fa-solid fa-chevron-left" size="lg" />
							</button>
							<button class="nav-arrow-btn" @click="slideNext(carousel.id)">
								<font-awesome-icon icon="fa-solid fa-chevron-right" size="lg" />
							</button>
						</div>
					</div>
					<!-- Series carousel (type === 'series') -->
					<Carousel
						v-if="carousel.type === 'series'"
						:ref="(el: any) => (carouselRefs[carousel.id] = el)"
						v-bind="{ ...carouselConfig, wrapAround: carousel.additionalMeta?.wrapAround }"
					>
						<Slide v-for="item in carousel.mappedItems" :key="item.UUID">
							<div class="carousel-slide-wrapper">
								<LandingSeriesCard
									:item="item"
									:show-episode-count="carousel.additionalMeta?.showWatchableCount"
									:show-new-ribbon="carousel.additionalMeta?.showNewRibbon"
									@navigate="navigateToSeries"
									@add-to-list="addToList"
									@show-info="showInfo"
								/>
							</div>
						</Slide>
					</Carousel>
					<!-- Entity/Episode carousel (type === 'entity') -->
					<Carousel v-else-if="carousel.type === 'entity'" :ref="(el: any) => (carouselRefs[carousel.id] = el)" v-bind="episodeCarouselConfig">
						<Slide v-for="item in carousel.mappedItems" :key="item.id">
							<div class="carousel-slide-wrapper episode-wrapper">
								<div class="ep-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false" @click.stop="playEpisode(item)">
									<div class="ep-thumb-wrap position-relative overflow-hidden rounded-3">
										<img :src="item.thumbnail" class="ep-thumb" :alt="item.episodeTitle" loading="lazy" />
										<div class="ep-play-layer" :class="{ visible: item._hovered }">
											<div class="ep-play-circle" @click.stop="playEpisode(item)">
												<font-awesome-icon :icon="['fas', 'play']" />
											</div>
										</div>
										<span class="ep-badge top-start">S{{ item.season }} E{{ item.episode }}</span>
										<span class="ep-badge top-end">{{ item.duration }}</span>
										<div class="ep-progress-track">
											<div class="ep-progress-fill" :style="{ width: item.progress + '%' }"></div>
										</div>
									</div>
									<div class="ep-info">
										<p class="ep-series">{{ item.seriesTitle }}</p>
										<p class="ep-episode">{{ item.episodeTitle }}</p>
										<p class="ep-pct"><font-awesome-icon :icon="['fas', 'clock']" class="me-1" />{{ Math.min(item.progress || 0, 100) }}% gesehen</p>
									</div>
								</div>
							</div>
						</Slide>
					</Carousel>
				</div>
			</template>
			<!-- Loading state -->
			<div v-else-if="status === 'pending'" class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'spinner']" class="row-icon text-danger fa-spin" />
						<span class="row-title">Laden...</span>
					</div>
				</div>
			</div>
			<!-- Error state -->
			<div v-else-if="status === 'error'" class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="row-icon text-danger" />
						<span class="row-title">Fehler beim Laden der Empfehlungen</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({
	middleware: 'auth',
});

import 'vue3-carousel/carousel.css';
import LandingSeriesCard from '~/components/LandingSeriesCard.vue';
import useAPIURL from '~/hooks/useAPIURL';
import { useIndexStore } from '~/stores/index.store';
import type { FrontendSeries, timestamped, WatchableEntity } from '@cinefinn/types/database';

const authStore = useAuthStore();
const indexStore = useIndexStore();

type AdditionalCarouselMeta = {
	showNewRibbon?: boolean;
	showWatchableCount?: boolean;
	wrapAround?: boolean;
};

type CarouselMeta = {
	order: number;
	id: string;
	title: string;
	icon: string[];
	description: string;
	userspecific: boolean;
	returnItemsCount: number;
	additionalMeta?: AdditionalCarouselMeta;
};

type CarouselAddEntity = {
	type: 'entity';
	items: {
		watchTime: number;
		entity: WatchableEntity & timestamped & { additional: AdditionalEntityData };
	}[];
};

type AdditionalEntityData = {
	imageFile: string;
	season: number;
	episode: number;
};

type CarouselAddSeries = {
	type: 'series';
	items: {
		UUID: string;
		episodeCount: number;
	}[];
};

type CarouselResponseItem = CarouselMeta & (CarouselAddEntity | CarouselAddSeries);

const { data, status } = useFetch<CarouselResponseItem[]>(`${useAPIURL()}/recommendations`, {
	key: 'recommendations',
	server: true,
	headers: {
		'auth-token': authStore.authToken,
	},
});

const mapSeriesItem = (UUID: string): FrontendSeries | undefined => {
	return indexStore.seriesById.get(UUID);
};

const mapEntityItem = (entity: WatchableEntity & timestamped & { additional: AdditionalEntityData }, watchTime: number): EpisodeItem => {
	const seriesData = indexStore.seriesById.get(entity.serie_UUID);
	const url = new URL(
		useAPIURL() + `/images/${entity.serie_UUID}/previewImages/${entity.watchable_UUID}/${entity.UUID}/${entity.additional.imageFile}`,
	);
	url.searchParams.append('auth-token', useAuthStore().authToken);
	return {
		id: entity.UUID,
		seriesId: entity.serie_UUID,
		seriesTitle: seriesData?.title || '',
		episodeTitle: seriesData?.title || '',
		season: entity.additional.season,
		episode: entity.additional.episode,
		thumbnail: url.href,
		progress: watchTime,
		duration: `${Math.floor(entity.runtime / 60)} Min.`,
	};
};

const carouselData = computed(() => {
	if (!data.value) return [];
	return data.value
		.map((carousel) => {
			if (carousel.type === 'series') {
				return {
					...carousel,
					mappedItems: carousel.items.map((item) => mapSeriesItem(item.UUID)).filter(Boolean) as FrontendSeries[],
				};
			} else {
				return {
					...carousel,
					mappedItems: carousel.items.map((item) => mapEntityItem(item.entity, item.watchTime)),
				};
			}
		})
		.sort((a, b) => a.order - b.order);
});

const ready = ref(false);

const carouselRefs = ref<{ [key: string]: any }>({});
const franchiseCarouselRef = ref<any>(null);

const slidePrev = (carouselId?: any) => {
	if (carouselId && typeof carouselId === 'string') {
		carouselRefs.value[carouselId]?.prev();
	} else {
		carouselId?.prev();
	}
};
const slideNext = (carouselId?: any) => {
	if (carouselId && typeof carouselId === 'string') {
		carouselRefs.value[carouselId]?.next();
	} else {
		carouselId?.next();
	}
};

onMounted(async () => {
	await indexStore.loadSeries();
	ready.value = true;
});

const router = useRouter();

const navigateToSeries = (id: string) => {
	console.log('Navigate to series:', id);
	router.push(`/watch/${id}`);
};

const addToList = (id: string) => {
	console.log('Add to list:', id);
};

const showInfo = (id: string) => {
	console.log('Show info:', id);
	router.push(`/watch/${id}`);
};

const playEpisode = (item: EpisodeItem) => {
	console.log('Play episode:', item);
	router.push(`/watch/${item.seriesId}`);
};

interface EpisodeItem {
	id: string;
	seriesId: string;
	seriesTitle: string;
	episodeTitle: string;
	season: number;
	episode: number;
	thumbnail: string;
	progress?: number;
	duration: string;
	_hovered?: boolean;
}

const franchiseCarouselConfig = {
	itemsToShow: 1,
	snapAlign: 'center',
	pauseAutoplayOnHover: true,
	autoplay: 1000 * 7,
	transition: 800,
	wrapAround: true,
	gap: 15,
};

const carouselConfig = {
	itemsToShow: 1,
	snapAlign: 'center',
	pauseAutoplayOnHover: true,
	// autoplay: 1000 * 1,
	transition: 400,
	wrapAround: true,
	gap: 15,
	breakpoints: {
		450: { itemsToShow: 1.4, snapAlign: 'center' },
		600: { itemsToShow: 1.8, snapAlign: 'center' },
		900: { itemsToShow: 3, snapAlign: 'center' },
		1224: { itemsToShow: 4.4, snapAlign: 'start' },
		1600: { itemsToShow: 5.5, snapAlign: 'start' },
		1800: { itemsToShow: 6.5, snapAlign: 'start' },
		2000: { itemsToShow: 6.5, snapAlign: 'start' },
		2500: { itemsToShow: 8.5, snapAlign: 'start' },
		3150: { itemsToShow: 9.5, snapAlign: 'start' },
		3550: { itemsToShow: 10.5, snapAlign: 'start' },
	},
};

const episodeCarouselConfig = {
	itemsToShow: 1,
	snapAlign: 'center',
	pauseAutoplayOnHover: true,
	transition: 400,
	wrapAround: true,
	gap: 24,
	breakpoints: {
		450: { itemsToShow: 1, snapAlign: 'center' },
		520: { itemsToShow: 1.8, snapAlign: 'center' },
		680: { itemsToShow: 2.0, snapAlign: 'center' },
		780: { itemsToShow: 2.4, snapAlign: 'center' },
		990: { itemsToShow: 3.0, snapAlign: 'center' },
		1200: { itemsToShow: 3.6, snapAlign: 'center' },
		1440: { itemsToShow: 4.5, snapAlign: 'start' },
		1600: { itemsToShow: 4.8, snapAlign: 'start' },
		1800: { itemsToShow: 5.2, snapAlign: 'start' },
		2080: { itemsToShow: 6.5, snapAlign: 'start' },
		2500: { itemsToShow: 7.5, snapAlign: 'start' },
		3150: { itemsToShow: 8.5, snapAlign: 'start' },
		3550: { itemsToShow: 9.5, snapAlign: 'start' },
	},
};

const showFranchises = ref(true);

const franchises = ref([
	{
		id: 1,
		name: 'Star Wars',
		slug: 'star-wars',
		description: 'A galaxy far, far away...',
		backgroundImage: 'https://cinema.jodu555.de/test/star-wars-space-battle-scene-with-starships.jpg',
		logo: 'https://cinema.jodu555.de/test/star-wars-logo.jpg',
		contentCount: '12 Movies & Series',
	},
	{
		id: 2,
		name: 'Barbie',
		slug: 'barbie',
		description: "Life in plastic, it's fantastic!",
		backgroundImage: 'https://cinema.jodu555.de/test/barbie-pink-dreamhouse-fantasy-world.jpg',
		logo: 'https://cinema.jodu555.de/test/barbie-logo-pink.jpg',
		contentCount: '8 Movies & Specials',
	},
	{
		id: 3,
		name: 'Marvel Cinematic Universe',
		slug: 'mcu',
		description: "Earth's Mightiest Heroes",
		backgroundImage: 'https://cinema.jodu555.de/test/marvel-superheroes-action-scene.jpg',
		logo: 'https://cinema.jodu555.de/test/marvel-studios-logo.jpg',
		contentCount: '30+ Movies & Series',
	},
]);

if (import.meta.client) {
	const inter = setInterval(() => {
		removeSSRActive();
	}, 5);
	const removeSSRActive = () => {
		const el = document.querySelector('.ssr-active');
		if (el) {
			el.classList.remove('ssr-active');
			clearInterval(inter);
		} else {
			const otherEl = document.querySelector('.content-zone');
			if (otherEl) {
				if (otherEl.classList.contains('ssr-active')) {
					otherEl.classList.remove('ssr-active');
					clearInterval(inter);
				} else {
					clearInterval(inter);
				}
			}
		}
	};
	removeSSRActive();
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600;9..40,700;9..40,800&display=swap');

.ssr-active .carousel__slide {
	width: auto !important;
}

:root {
	--cs-bg: #090910;
	--cs-surface: #11111a;
	--cs-accent: #e5091a;
	--cs-accent-glow: rgba(229, 9, 26, 0.35);
	--cs-text: #eeeef5;
	--cs-muted: #7777a0;
	--cs-overlay: linear-gradient(to top, rgba(5, 5, 15, 0.97) 0%, rgba(5, 5, 15, 0.7) 55%, transparent 100%);
	--radius: 10px;
	--t: 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

*,
*::before,
*::after {
	box-sizing: border-box;
}

.landing-m-page {
	background-color: var(--cs-bg);
	min-height: 100vh;
	font-family: 'DM Sans', sans-serif;
	color: var(--cs-text);
	overflow-x: hidden;
}

/* ── Franchise Carousel ───────────────────────────────────────────────────── */
.franchise-container {
	background: var(--cs-surface);
	overflow: hidden;
}

.franchise-carousel-wrapper {
	position: relative;
	display: flex;
	align-items: center;
}

.franchise-carousel-wrapper .carousel {
	flex: 1;
}

.franchise-nav-btn {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	z-index: 10;
	background: rgba(0, 0, 0, 0.65);
	backdrop-filter: blur(8px);
	border: 1px solid rgba(255, 255, 255, 0.15);
	border-radius: 50%;
	width: 44px;
	height: 44px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--cs-text);
	cursor: pointer;
	transition: all var(--t);
	opacity: 0;
}

.franchise-carousel-wrapper:hover .franchise-nav-btn {
	opacity: 1;
}

.franchise-nav-btn:hover {
	background: rgba(0, 0, 0, 0.85);
	border-color: rgba(255, 255, 255, 0.35);
	transform: translateY(-50%) scale(1.1);
}

.franchise-nav-prev {
	left: 10px;
}

.franchise-nav-next {
	right: 10px;
}

@media (hover: none) and (pointer: coarse) {
	.franchise-nav-btn {
		opacity: 1;
	}
}

.franchise-slide {
	position: relative;
	height: 45vh;
	min-height: 300px;
}

.franchise-backdrop {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.franchise-gradient-start {
	position: absolute;
	inset: 0;
	background-image: linear-gradient(45deg, #000000c7, transparent);
}

.franchise-gradient-end {
	position: absolute;
	inset: 0;
	background-image: linear-gradient(273deg, #000000c7, transparent);
}

.franchise-content {
	position: absolute;
	bottom: 1.25rem;
	left: 10%;
	padding-top: 1.25rem;
	padding-bottom: 1.25rem;
}

.franchise-logo {
	height: 5rem;
	width: 5rem;
	object-fit: contain;
}

.carousel-slide-wrapper {
	padding: 6px;
	height: 100%;
	width: 100%;
}

.carousel-slide-wrapper.episode-wrapper {
	padding: 12px;
}

/* ── Content Zone ─────────────────────────────────────────────────────────── */
.content-zone {
	position: relative;
	z-index: 5;
	padding-bottom: 2rem;
}

.content-row {
	margin-bottom: 0.5rem;
	padding: 0.75rem 0;
}

.row-header {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	margin-bottom: 0.9rem;
}

.row-title-group {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex: 1;
	min-width: 0;
}

.row-icon {
	font-size: 0.88rem;
}

.row-title {
	font-weight: 700;
	font-size: 1rem;
	color: var(--cs-text);
	letter-spacing: 0.01em;
	white-space: nowrap;
}

.see-all {
	font-size: 0.78rem;
	color: var(--cs-muted);
	text-decoration: none;
	white-space: nowrap;
	opacity: 0;
	transition:
		opacity var(--t),
		color var(--t);
	display: flex;
	align-items: center;
	gap: 0.3rem;
}

.content-row:hover .see-all {
	opacity: 1;
}

.see-all:hover {
	color: var(--cs-text);
}

.carousel-nav-btns {
	display: flex;
	gap: 0.5rem;
}

.nav-arrow-btn {
	background: rgba(255, 255, 255, 0.1);
	border: none;
	border-radius: 50%;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--cs-text);
	cursor: pointer;
	transition:
		background var(--t),
		transform 0.15s;
}

.nav-arrow-btn:hover {
	background: rgba(255, 255, 255, 0.25);
	transform: scale(1.1);
}

/* ── Series Card ─────────────────────────────────────────────────────────────── */
.series-card {
	flex-shrink: 0;
	width: 230px;
	cursor: pointer;
	margin: 0 auto;
}

.series-thumb-wrap {
	width: 230px;
	height: 250px;
	background: var(--cs-surface);
	border-radius: var(--radius) !important;
}

.series-thumb {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	border-radius: var(--radius);
	transition:
		transform var(--t),
		box-shadow var(--t);
}

.series-card:hover .series-thumb {
	transform: scale(1.05);
	box-shadow: 0 14px 42px rgba(0, 0, 0, 0.75);
}

.series-overlay {
	position: absolute;
	inset: 0;
	background: var(--cs-overlay);
	border-radius: var(--radius);
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	padding: 10px;
	opacity: 0;
	transition: opacity var(--t);
}

.series-overlay.visible {
	opacity: 1;
}

.series-overlay-actions {
	display: flex;
	gap: 6px;
	align-items: center;
	margin-bottom: 8px;
}

.sov-btn {
	width: 30px;
	height: 30px;
	border-radius: 50% !important;
	border: 1.5px solid rgba(255, 255, 255, 0.55);
	background: rgba(0, 0, 0, 0.5);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.72rem;
	cursor: pointer;
	padding: 0;
	transition:
		background var(--t),
		transform 0.15s;
}

.sov-btn:hover {
	background: rgba(255, 255, 255, 0.22);
	transform: scale(1.12);
}

.sov-btn-light {
	background: #fff !important;
	color: #000 !important;
	border-color: #fff !important;
}

.sov-btn-light:hover {
	background: #ddd !important;
}

.sov-btn-danger {
	border-color: var(--cs-accent) !important;
}

.sov-btn-danger:hover {
	background: var(--cs-accent) !important;
	border-color: var(--cs-accent) !important;
}

.sov-title {
	margin: 0 0 5px;
	font-size: 0.82rem;
	font-weight: 700;
	color: #fff;
	line-height: 1.25;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.sov-meta {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 5px;
}

.sov-year {
	font-size: 0.72rem;
	color: rgba(255, 255, 255, 0.6);
}

.sov-genres {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.genre-chip {
	font-size: 0.62rem;
	padding: 2px 7px;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 20px;
	color: rgba(255, 255, 255, 0.65);
	letter-spacing: 0.01em;
}

.new-ribbon {
	position: absolute;
	top: 10px;
	left: -1px;
	background: var(--cs-accent);
	color: #fff;
	font-size: 0.62rem;
	font-weight: 700;
	padding: 3px 8px 3px 6px;
	letter-spacing: 0.06em;
	border-radius: 0 4px 4px 0;
	box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
}

.episode-count-badge {
	position: absolute;
	bottom: 8px;
	left: 8px;
	background: rgba(0, 0, 0, 0.72);
	backdrop-filter: blur(4px);
	color: rgba(255, 255, 255, 0.85);
	font-size: 0.62rem;
	padding: 3px 7px;
	border-radius: 6px;
}

.series-info {
	padding: 6px 2px 0;
	max-width: 230px;
}

.series-label-title {
	margin: 0 0 2px;
	font-size: 0.82rem;
	font-weight: 600;
	color: var(--cs-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.series-label-year {
	margin: 0;
	font-size: 0.72rem;
	color: var(--cs-muted);
}

/* ── Episode Card (16:9) ───────────────────────────────────────────────────── */
.ep-card {
	flex-shrink: 0;
	width: 306px;
	cursor: pointer;
	margin: 8px auto;
}

.ep-thumb-wrap {
	width: 306px;
	height: 172px;
	background: var(--cs-surface);
	border-radius: var(--radius) !important;
	position: relative;
}

.ep-thumb {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	border-radius: var(--radius);
	transition:
		transform var(--t),
		filter var(--t);
}

.ep-card:hover .ep-thumb {
	transform: scale(1.04);
	filter: brightness(0.85);
}

.ep-play-layer {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.35);
	border-radius: var(--radius);
	opacity: 0;
	transition: opacity var(--t);
}

.ep-play-layer.visible {
	opacity: 1;
}

.ep-play-circle {
	width: 52px;
	height: 52px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.65);
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(6px);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.1rem;
	color: #fff;
	transition:
		transform 0.15s,
		background var(--t);
}

.ep-play-layer.visible .ep-play-circle:hover {
	transform: scale(1.12);
	background: rgba(229, 9, 26, 0.75);
	border-color: var(--cs-accent);
}

.ep-badge {
	position: absolute;
	background: rgba(0, 0, 0, 0.72);
	color: rgba(255, 255, 255, 0.88);
	font-size: 0.62rem;
	font-weight: 600;
	padding: 3px 7px;
	border-radius: 5px;
	backdrop-filter: blur(3px);
}

.ep-badge.top-start {
	top: 8px;
	left: 8px;
}

.ep-badge.top-end {
	top: 8px;
	right: 8px;
}

.ep-progress-track {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 3px;
	background: rgba(255, 255, 255, 0.18);
	border-radius: 0 0 var(--radius) var(--radius);
	overflow: hidden;
}

.ep-progress-fill {
	height: 100%;
	background: var(--cs-accent);
	border-radius: 2px;
	box-shadow: 0 0 6px var(--cs-accent-glow);
	transition: width 0.4s ease;
}

.ep-info {
	padding: 7px 2px 0;
	max-width: 306px;
}

.ep-series {
	margin: 0 0 1px;
	font-size: 0.84rem;
	font-weight: 700;
	color: var(--cs-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.ep-episode {
	margin: 0 0 2px;
	font-size: 0.75rem;
	color: var(--cs-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.ep-pct {
	margin: 0;
	font-size: 0.7rem;
	color: var(--cs-accent);
	font-weight: 500;
}

/* ── Responsive ─────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
	.series-card {
		width: 150px;
	}
	.series-thumb-wrap {
		width: 150px;
		height: 165px;
	}
	.series-info {
		max-width: 150px;
	}
	.ep-card {
		width: 280px;
	}
	.ep-thumb-wrap {
		width: 280px;
		height: 158px;
	}
	.ep-info {
		max-width: 280px;
	}
}

@media (max-width: 480px) {
	.series-card {
		width: 130px;
	}
	.series-thumb-wrap {
		width: 130px;
		height: 143px;
	}
	.series-info {
		max-width: 130px;
	}
	.franchise-slide {
		height: 35vh;
		min-height: 200px;
	}
	.franchise-logo {
		height: 3rem;
		width: 3rem;
	}
}
</style>
