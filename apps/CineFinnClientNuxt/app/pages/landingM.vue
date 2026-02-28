<template>
	<div data-bs-theme="dark" class="landing-m-page">
		<!-- ── FRANCHISE CAROUSEL ───────────────────────────────────────────────────── -->
		<div v-if="showFranchises" class="container mt-3 shadow-lg p-2 mb-3 mt-1 rounded franchise-container">
			<Carousel v-bind="franchiseCarouselConfig">
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
								<button class="btn btn-outline-info">
									<font-awesome-icon :icon="['fas', 'circle-info']" class="me-2" />
									Mehr Infos
								</button>
							</div>
						</div>
					</div>
				</Slide>

				<template #addons>
					<Navigation>
						<template #prev>
							<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="xl" class="carousel-nav-icon" />
						</template>
						<template #next>
							<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="xl" class="carousel-nav-icon" />
						</template>
					</Navigation>
				</template>
			</Carousel>
		</div>

		<!-- ── CONTENT ROWS ─────────────────────────────────────────────────────────── -->
		<div class="content-zone px-2 px-lg-4">
			<!-- 1. Beliebt bei dir -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'fire']" class="row-icon text-danger" />
						<span class="row-title">Beliebt bei dir</span>
					</div>
					<a href="#" class="see-all" @click.prevent="seeAllCategory('popular')"
						>Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']"
					/></a>
				</div>
				<Carousel v-bind="carouselConfig">
					<Slide v-for="item in popularForYou" :key="item.id">
						<div class="carousel-slide-wrapper">
							<div class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
								<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
									<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
									<div class="series-overlay" :class="{ visible: item._hovered }">
										<div class="series-overlay-actions">
											<button class="sov-btn sov-btn-light" @click.stop="navigateToSeries(item.id)">
												<font-awesome-icon :icon="['fas', 'play']" />
											</button>
											<button class="sov-btn" @click.stop="addToList(item.id)">
												<font-awesome-icon :icon="['fas', 'plus']" />
											</button>
											<button class="sov-btn ms-auto" @click.stop="showInfo(item.id)">
												<font-awesome-icon :icon="['fas', 'chevron-down']" />
											</button>
										</div>
										<p class="sov-title">{{ item.title }}</p>
										<div class="sov-meta">
											<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
											<span class="sov-year">{{ yearLabel(item) }}</span>
										</div>
										<div class="sov-genres">
											<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
										</div>
									</div>
								</div>
								<div class="series-info">
									<p class="series-label-title">{{ item.title }}</p>
									<p class="series-label-year">{{ yearLabel(item) }}</p>
								</div>
							</div>
						</div>
					</Slide>
					<template #addons>
						<Navigation>
							<template #prev>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl" class="carousel-nav-icon" />
							</template>
							<template #next>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl" class="carousel-nav-icon" />
							</template>
						</Navigation>
					</template>
				</Carousel>
			</div>

			<!-- 2. Neu & Beliebt -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'sparkles']" class="row-icon text-danger" />
						<span class="row-title">Neu & Beliebt</span>
						<span class="badge bg-danger ms-2" style="font-size: 0.65rem">NEU</span>
					</div>
					<a href="#" class="see-all" @click.prevent="seeAllCategory('new')">Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']" /></a>
				</div>
				<Carousel v-bind="carouselConfig">
					<Slide v-for="item in newAndPopular" :key="item.id">
						<div class="carousel-slide-wrapper">
							<div class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
								<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
									<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
									<div class="series-overlay" :class="{ visible: item._hovered }">
										<div class="series-overlay-actions">
											<button class="sov-btn sov-btn-light" @click.stop="navigateToSeries(item.id)">
												<font-awesome-icon :icon="['fas', 'play']" />
											</button>
											<button class="sov-btn" @click.stop="addToList(item.id)">
												<font-awesome-icon :icon="['fas', 'plus']" />
											</button>
											<button class="sov-btn ms-auto" @click.stop="showInfo(item.id)">
												<font-awesome-icon :icon="['fas', 'chevron-down']" />
											</button>
										</div>
										<p class="sov-title">{{ item.title }}</p>
										<div class="sov-meta">
											<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
											<span class="sov-year">{{ yearLabel(item) }}</span>
										</div>
										<div class="sov-genres">
											<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
										</div>
									</div>
									<span class="new-ribbon">NEU</span>
								</div>
								<div class="series-info">
									<p class="series-label-title">{{ item.title }}</p>
									<p class="series-label-year">{{ yearLabel(item) }}</p>
								</div>
							</div>
						</div>
					</Slide>
					<template #addons>
						<Navigation>
							<template #prev>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl" class="carousel-nav-icon" />
							</template>
							<template #next>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl" class="carousel-nav-icon" />
							</template>
						</Navigation>
					</template>
				</Carousel>
			</div>

			<!-- 3. Filme -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'film']" class="row-icon text-danger" />
						<span class="row-title">Filme</span>
					</div>
					<a href="#" class="see-all" @click.prevent="seeAllCategory('movies')"
						>Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']"
					/></a>
				</div>
				<Carousel v-bind="carouselConfig">
					<Slide v-for="item in movies" :key="item.id">
						<div class="carousel-slide-wrapper">
							<div class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
								<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
									<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
									<div class="series-overlay" :class="{ visible: item._hovered }">
										<div class="series-overlay-actions">
											<button class="sov-btn sov-btn-light" @click.stop="navigateToSeries(item.id)">
												<font-awesome-icon :icon="['fas', 'play']" />
											</button>
											<button class="sov-btn" @click.stop="addToList(item.id)">
												<font-awesome-icon :icon="['fas', 'plus']" />
											</button>
											<button class="sov-btn ms-auto" @click.stop="showInfo(item.id)">
												<font-awesome-icon :icon="['fas', 'chevron-down']" />
											</button>
										</div>
										<p class="sov-title">{{ item.title }}</p>
										<div class="sov-meta">
											<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
											<span class="sov-year">{{ yearLabel(item) }}</span>
										</div>
										<div class="sov-genres">
											<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
										</div>
									</div>
								</div>
								<div class="series-info">
									<p class="series-label-title">{{ item.title }}</p>
									<p class="series-label-year">{{ yearLabel(item) }}</p>
								</div>
							</div>
						</div>
					</Slide>
					<template #addons>
						<Navigation>
							<template #prev>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl" class="carousel-nav-icon" />
							</template>
							<template #next>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl" class="carousel-nav-icon" />
							</template>
						</Navigation>
					</template>
				</Carousel>
			</div>

			<!-- 4. Serien -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'tv']" class="row-icon text-danger" />
						<span class="row-title">Serien</span>
					</div>
					<a href="#" class="see-all" @click.prevent="seeAllCategory('series')"
						>Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']"
					/></a>
				</div>
				<Carousel v-bind="carouselConfig">
					<Slide v-for="item in series" :key="item.id">
						<div class="carousel-slide-wrapper">
							<div class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
								<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
									<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
									<div class="series-overlay" :class="{ visible: item._hovered }">
										<div class="series-overlay-actions">
											<button class="sov-btn sov-btn-light" @click.stop="navigateToSeries(item.id)">
												<font-awesome-icon :icon="['fas', 'play']" />
											</button>
											<button class="sov-btn" @click.stop="addToList(item.id)">
												<font-awesome-icon :icon="['fas', 'plus']" />
											</button>
											<button class="sov-btn ms-auto" @click.stop="showInfo(item.id)">
												<font-awesome-icon :icon="['fas', 'chevron-down']" />
											</button>
										</div>
										<p class="sov-title">{{ item.title }}</p>
										<div class="sov-meta">
											<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
											<span class="sov-year">{{ yearLabel(item) }}</span>
										</div>
										<div class="sov-genres">
											<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
										</div>
									</div>
									<div v-if="item.episodeCount" class="episode-count-badge">
										<font-awesome-icon :icon="['fas', 'film']" class="me-1" />
										{{ item.episodeCount }} Folgen
									</div>
								</div>
								<div class="series-info">
									<p class="series-label-title">{{ item.title }}</p>
									<p class="series-label-year">{{ yearLabel(item) }}</p>
								</div>
							</div>
						</div>
					</Slide>
					<template #addons>
						<Navigation>
							<template #prev>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl" class="carousel-nav-icon" />
							</template>
							<template #next>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl" class="carousel-nav-icon" />
							</template>
						</Navigation>
					</template>
				</Carousel>
			</div>

			<!-- 5. Meine Liste -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'bookmark']" class="row-icon text-danger" />
						<span class="row-title">Meine Liste</span>
					</div>
					<a href="#" class="see-all" @click.prevent="seeAllCategory('mylist')">Bearbeiten <font-awesome-icon :icon="['fas', 'pen']" /></a>
				</div>
				<Carousel v-bind="carouselConfig">
					<Slide v-for="item in myList" :key="item.id">
						<div class="carousel-slide-wrapper">
							<div class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
								<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
									<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
									<div class="series-overlay" :class="{ visible: item._hovered }">
										<div class="series-overlay-actions">
											<button class="sov-btn sov-btn-light" @click.stop="navigateToSeries(item.id)">
												<font-awesome-icon :icon="['fas', 'play']" />
											</button>
											<button class="sov-btn sov-btn-danger" @click.stop="addToList(item.id)">
												<font-awesome-icon :icon="['fas', 'minus']" />
											</button>
											<button class="sov-btn ms-auto" @click.stop="showInfo(item.id)">
												<font-awesome-icon :icon="['fas', 'chevron-down']" />
											</button>
										</div>
										<p class="sov-title">{{ item.title }}</p>
										<div class="sov-meta">
											<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
											<span class="sov-year">{{ yearLabel(item) }}</span>
										</div>
										<div class="sov-genres">
											<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
										</div>
									</div>
								</div>
								<div class="series-info">
									<p class="series-label-title">{{ item.title }}</p>
									<p class="series-label-year">{{ yearLabel(item) }}</p>
								</div>
							</div>
						</div>
					</Slide>
					<template #addons>
						<Navigation>
							<template #prev>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl" class="carousel-nav-icon" />
							</template>
							<template #next>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl" class="carousel-nav-icon" />
							</template>
						</Navigation>
					</template>
				</Carousel>
			</div>

			<!-- 6. Weiterschauen -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'clock-rotate-left']" class="row-icon text-danger" />
						<span class="row-title">Weiterschauen</span>
					</div>
					<a href="#" class="see-all" @click.prevent="seeAllCategory('continue')"
						>Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']"
					/></a>
				</div>
				<Carousel v-bind="episodeCarouselConfig">
					<Slide v-for="item in continueWatching" :key="item.id">
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
									<p class="ep-pct"><font-awesome-icon :icon="['fas', 'clock']" class="me-1" />{{ item.progress }}% gesehen</p>
								</div>
							</div>
						</div>
					</Slide>
					<template #addons>
						<Navigation>
							<template #prev>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl" class="carousel-nav-icon" />
							</template>
							<template #next>
								<font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl" class="carousel-nav-icon" />
							</template>
						</Navigation>
					</template>
				</Carousel>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({
	middleware: 'auth',
});

import 'vue3-carousel/carousel.css';
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel';

const ready = ref(false);

onMounted(() => {
	ready.value = true;
});

const router = useRouter();

// ── Navigation Helpers ──────────────────────────────────────────────────────
const navigateToSeries = (id: number) => {
	console.log('Navigate to series:', id);
	router.push(`/watch/${id}`);
};

const addToList = (id: number) => {
	console.log('Add to list:', id);
};

const showInfo = (id: number) => {
	console.log('Show info:', id);
	router.push(`/watch/${id}`);
};

const playEpisode = (item: EpisodeItem) => {
	console.log('Play episode:', item);
	router.push(`/watch/${item.seriesId}`);
};

const seeAllCategory = (category: string) => {
	console.log('See all:', category);
	// Future: navigate to category page or open a modal
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface Series {
	id: number;
	title: string;
	description: string;
	cover: string;
	yearStart: number;
	yearEnd: number | null;
	genres: string[];
	rating: string;
	episodeCount?: number;
	_hovered?: boolean;
}

interface EpisodeItem {
	id: number;
	seriesId: number;
	seriesTitle: string;
	episodeTitle: string;
	season: number;
	episode: number;
	thumbnail: string;
	progress?: number;
	duration: string;
	_hovered?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const yearLabel = (item: Series): string => {
	if (!item.yearEnd) return `${item.yearStart}–`;
	if (item.yearStart === item.yearEnd) return `${item.yearStart}`;
	return `${item.yearStart}–${item.yearEnd}`;
};

// ── Carousel Configs ─────────────────────────────────────────────────────────
const franchiseCarouselConfig = {
	itemsToShow: 1,
	snapAlign: 'center',
	pauseAutoplayOnHover: true,
	autoplay: 1000 * 2,
	transition: 600,
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
		600: { itemsToShow: 1.2, snapAlign: 'center' },
		900: { itemsToShow: 1.8, snapAlign: 'center' },
		1224: { itemsToShow: 2.2, snapAlign: 'start' },
		1600: { itemsToShow: 2.8, snapAlign: 'start' },
		1800: { itemsToShow: 3.2, snapAlign: 'start' },
		2000: { itemsToShow: 3.5, snapAlign: 'start' },
		2500: { itemsToShow: 4.2, snapAlign: 'start' },
		3150: { itemsToShow: 4.8, snapAlign: 'start' },
		3550: { itemsToShow: 5.2, snapAlign: 'start' },
	},
};

// ── Franchise Data ───────────────────────────────────────────────────────────
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

// ── Beliebt bei dir ─────────────────────────────────────────────────────────
const popularForYou = reactive<Series[]>([
	{
		id: 100,
		title: 'Dark Horizons',
		description: '',
		cover: 'https://picsum.photos/seed/pf100/460/500',
		yearStart: 2019,
		yearEnd: 2024,
		genres: ['Sci-Fi', 'Thriller'],
		rating: '16+',
	},
	{
		id: 101,
		title: 'Waldgeister',
		description: '',
		cover: 'https://picsum.photos/seed/pf101/460/500',
		yearStart: 2018,
		yearEnd: 2023,
		genres: ['Fantasy', 'Drama'],
		rating: '12+',
	},
	{
		id: 102,
		title: 'Neon City',
		description: '',
		cover: 'https://picsum.photos/seed/pf102/460/500',
		yearStart: 2020,
		yearEnd: 2022,
		genres: ['Sci-Fi', 'Krimi'],
		rating: '16+',
	},
	{
		id: 103,
		title: 'Blutlinie',
		description: '',
		cover: 'https://picsum.photos/seed/pf103/460/500',
		yearStart: 2021,
		yearEnd: 2024,
		genres: ['Drama', 'Thriller'],
		rating: '18+',
	},
	{
		id: 104,
		title: 'Quantensprung',
		description: '',
		cover: 'https://picsum.photos/seed/pf104/460/500',
		yearStart: 2022,
		yearEnd: 2024,
		genres: ['Sci-Fi'],
		rating: '16+',
	},
	{
		id: 105,
		title: 'Stellar Abyss',
		description: '',
		cover: 'https://picsum.photos/seed/pf105/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Sci-Fi', 'Drama'],
		rating: '12+',
	},
	{
		id: 106,
		title: 'Grenzland',
		description: '',
		cover: 'https://picsum.photos/seed/pf106/460/500',
		yearStart: 2010,
		yearEnd: 2023,
		genres: ['Drama'],
		rating: '16+',
		episodeCount: 312,
	},
]);

// ── Neu & Beliebt ─────────────────────────────────────────────────────────
const newAndPopular = reactive<Series[]>([
	{
		id: 200,
		title: 'Die Küstenräuber',
		description: '',
		cover: 'https://picsum.photos/seed/na10/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Abenteuer', 'Drama'],
		rating: '16+',
	},
	{
		id: 201,
		title: 'Cybergeist',
		description: '',
		cover: 'https://picsum.photos/seed/na11/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Krimi'],
		rating: '12+',
	},
	{
		id: 202,
		title: 'Feuertaufe',
		description: '',
		cover: 'https://picsum.photos/seed/na12/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Action', 'Drama'],
		rating: '16+',
	},
	{
		id: 203,
		title: 'Mondschatten',
		description: '',
		cover: 'https://picsum.photos/seed/na13/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Mystery'],
		rating: '12+',
	},
	{
		id: 204,
		title: 'Das Labyrinth',
		description: '',
		cover: 'https://picsum.photos/seed/na14/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Thriller', 'Mystery'],
		rating: '18+',
	},
	{
		id: 205,
		title: 'Eiszeit',
		description: '',
		cover: 'https://picsum.photos/seed/na15/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Drama'],
		rating: '16+',
	},
	{
		id: 206,
		title: 'Stadtgold',
		description: '',
		cover: 'https://picsum.photos/seed/na16/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Drama'],
		rating: '12+',
	},
]);

// ── Filme ───────────────────────────────────────────────────────────────────
const movies = reactive<Series[]>([
	{
		id: 300,
		title: 'Der Letzte Ritter',
		description: '',
		cover: 'https://picsum.photos/seed/mv300/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Action', 'Fantasy'],
		rating: '12+',
	},
	{
		id: 301,
		title: 'Nachtschwärmer',
		description: '',
		cover: 'https://picsum.photos/seed/mv301/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Thriller', 'Krimi'],
		rating: '16+',
	},
	{
		id: 302,
		title: 'Sonnenuntergang',
		description: '',
		cover: 'https://picsum.photos/seed/mv302/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Drama', 'Romantik'],
		rating: '12+',
	},
	{
		id: 303,
		title: 'Metal Storm',
		description: '',
		cover: 'https://picsum.photos/seed/mv303/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Action', 'Sci-Fi'],
		rating: '16+',
	},
	{
		id: 304,
		title: 'Das Geheimnis',
		description: '',
		cover: 'https://picsum.photos/seed/mv304/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Mystery', 'Thriller'],
		rating: '14+',
	},
	{
		id: 305,
		title: 'Freaks',
		description: '',
		cover: 'https://picsum.photos/seed/mv305/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Horror', 'Thriller'],
		rating: '18+',
	},
]);

// ── Serien ───────────────────────────────────────────────────────────────────
const series = reactive<Series[]>([
	{
		id: 400,
		title: 'Grenzland',
		description: '',
		cover: 'https://picsum.photos/seed/se400/460/500',
		yearStart: 2010,
		yearEnd: 2023,
		genres: ['Drama'],
		rating: '16+',
		episodeCount: 312,
	},
	{
		id: 401,
		title: 'Precinct 9',
		description: '',
		cover: 'https://picsum.photos/seed/se401/460/500',
		yearStart: 2008,
		yearEnd: 2021,
		genres: ['Krimi', 'Drama'],
		rating: '18+',
		episodeCount: 284,
	},
	{
		id: 402,
		title: 'Himmel & Erde',
		description: '',
		cover: 'https://picsum.photos/seed/se402/460/500',
		yearStart: 2015,
		yearEnd: 2022,
		genres: ['History', 'Drama'],
		rating: '18+',
		episodeCount: 156,
	},
	{
		id: 403,
		title: 'Klinikum 12',
		description: '',
		cover: 'https://picsum.photos/seed/se403/460/500',
		yearStart: 2012,
		yearEnd: 2025,
		genres: ['Drama', 'Medical'],
		rating: '16+',
		episodeCount: 420,
	},
	{
		id: 404,
		title: 'Codebreaker',
		description: '',
		cover: 'https://picsum.photos/seed/se404/460/500',
		yearStart: 2016,
		yearEnd: 2024,
		genres: ['Thriller', 'Sci-Fi'],
		rating: '16+',
		episodeCount: 198,
	},
	{
		id: 405,
		title: 'Dynastien',
		description: '',
		cover: 'https://picsum.photos/seed/se405/460/500',
		yearStart: 2014,
		yearEnd: 2023,
		genres: ['History', 'Drama'],
		rating: '16+',
		episodeCount: 240,
	},
]);

// ── Meine Liste ────────────────────────────────────────────────────────────
const myList = reactive<Series[]>([
	{
		id: 500,
		title: 'Schattenläufer',
		description: '',
		cover: 'https://picsum.photos/seed/ml60/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Thriller'],
		rating: '16+',
	},
	{
		id: 501,
		title: 'Mondschatten',
		description: '',
		cover: 'https://picsum.photos/seed/ml61/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Mystery'],
		rating: '12+',
	},
	{
		id: 502,
		title: 'Klinikum 12',
		description: '',
		cover: 'https://picsum.photos/seed/ml62/460/500',
		yearStart: 2012,
		yearEnd: 2025,
		genres: ['Drama', 'Medical'],
		rating: '16+',
	},
	{
		id: 503,
		title: 'Lichtjahre',
		description: '',
		cover: 'https://picsum.photos/seed/ml63/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Sci-Fi', 'Mystery'],
		rating: '12+',
	},
	{
		id: 504,
		title: 'Eisenbahn der Seelen',
		description: '',
		cover: 'https://picsum.photos/seed/ml64/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Drama', 'Fantasy'],
		rating: '12+',
	},
	{
		id: 505,
		title: 'Stahl und Seide',
		description: '',
		cover: 'https://picsum.photos/seed/ml65/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Drama'],
		rating: '12+',
	},
]);

// ── Weiterschauen ─────────────────────────────────────────────────────────
const continueWatching = reactive<EpisodeItem[]>([
	{
		id: 600,
		seriesId: 100,
		seriesTitle: 'Dark Horizons',
		episodeTitle: 'Die letzte Brücke',
		season: 2,
		episode: 7,
		thumbnail: 'https://picsum.photos/seed/cw1/640/360',
		progress: 63,
		duration: '48 Min.',
	},
	{
		id: 601,
		seriesId: 102,
		seriesTitle: 'Neon City',
		episodeTitle: 'Schwarzmarkt',
		season: 1,
		episode: 3,
		thumbnail: 'https://picsum.photos/seed/cw2/640/360',
		progress: 28,
		duration: '42 Min.',
	},
	{
		id: 602,
		seriesId: 101,
		seriesTitle: 'Waldgeister',
		episodeTitle: 'Das Erwachen',
		season: 3,
		episode: 11,
		thumbnail: 'https://picsum.photos/seed/cw3/640/360',
		progress: 81,
		duration: '55 Min.',
	},
	{
		id: 603,
		seriesId: 105,
		seriesTitle: 'Stellar Abyss',
		episodeTitle: 'Jenseits der Leere',
		season: 3,
		episode: 2,
		thumbnail: 'https://picsum.photos/seed/cw4/640/360',
		progress: 45,
		duration: '51 Min.',
	},
	{
		id: 604,
		seriesId: 103,
		seriesTitle: 'Blutlinie',
		episodeTitle: 'Verrat',
		season: 2,
		episode: 5,
		thumbnail: 'https://picsum.photos/seed/cw5/640/360',
		progress: 10,
		duration: '44 Min.',
	},
	{
		id: 605,
		seriesId: 104,
		seriesTitle: 'Quantensprung',
		episodeTitle: 'Parallelwelten',
		season: 1,
		episode: 8,
		thumbnail: 'https://picsum.photos/seed/cw6/640/360',
		progress: 72,
		duration: '58 Min.',
	},
]);
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600;9..40,700;9..40,800&display=swap');

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

.carousel-nav-icon {
	color: white;
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
