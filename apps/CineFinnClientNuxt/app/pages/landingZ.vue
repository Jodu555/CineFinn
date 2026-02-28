<template>
	<div data-bs-theme="dark" class="bg-black text-white min-vh-100">
		<!-- Navbar -->
		<nav v-if="false" class="navbar navbar-expand-lg navbar-dark bg-transparent position-absolute w-100 z-3 px-4 py-3">
			<div class="container-fluid">
				<a class="navbar-brand fw-bold fs-3 text-danger" href="#"> <font-awesome-icon :icon="['fas', 'clapperboard']" class="me-2" />StreamFlix </a>
				<div class="d-flex align-items-center">
					<button class="btn btn-link text-white">
						<font-awesome-icon :icon="['fas', 'magnifying-glass']" size="lg" />
					</button>
					<div class="dropdown ms-3">
						<a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown">
							<img src="https://picsum.photos/seed/avatar/40/40" alt="Profile" class="rounded-circle" width="32" height="32" />
						</a>
						<ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end">
							<li><a class="dropdown-item" href="#">Profile</a></li>
							<li><a class="dropdown-item" href="#">Settings</a></li>
							<li><hr class="dropdown-divider" /></li>
							<li><a class="dropdown-item" href="#">Logout</a></li>
						</ul>
					</div>
				</div>
			</div>
		</nav>

		<!-- Hero Section -->
		<section v-if="false" class="hero-section position-relative d-flex align-items-center" style="min-height: 80vh">
			<div class="hero-bg position-absolute top-0 start-0 w-100 h-100">
				<img :src="featuredItem.backdrop" class="w-100 h-100 object-fit-cover" alt="Featured" />
				<div class="gradient-overlay position-absolute top-0 start-0 w-100 h-100"></div>
			</div>

			<div class="container position-relative z-2 pt-5 mt-5">
				<div class="row">
					<div class="col-lg-6 col-md-8">
						<span class="badge bg-danger mb-3 fs-6 fw-normal">FEATURED</span>
						<h1 class="display-3 fw-bold mb-3">{{ featuredItem.title }}</h1>
						<p class="lead mb-4 text-white-50">{{ featuredItem.description }}</p>
						<div class="d-flex gap-3 mb-4 align-items-center text-white-50">
							<span class="fw-bold text-white">{{ getYearRange(featuredItem) }}</span>
							<span class="border px-2 small">HD</span>
							<span>16+</span>
							<span>{{ featuredItem.episodes }} Folgen</span>
						</div>
						<div class="d-flex gap-3">
							<button class="btn btn-light px-4 py-2 fw-bold d-flex align-items-center">
								<font-awesome-icon :icon="['fas', 'play']" class="me-2" />
								Jetzt spielen
							</button>
							<button class="btn btn-secondary px-4 py-2 fw-bold d-flex align-items-center bg-secondary bg-opacity-50 border-0">
								<font-awesome-icon :icon="['fas', 'circle-info']" class="me-2" />
								Details
							</button>
							<button class="btn btn-outline-light rounded-circle p-2" style="width: 42px; height: 42px">
								<font-awesome-icon :icon="['fas', 'plus']" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Content Rows -->
		<div class="container-fluid px-4 pb-5 position-relative z-2" style="margin-top: -100px">
			<!-- Weiterschauen (Widescreen Cards) -->
			<content-row title="Weiterschauen" icon="clock-rotate-left">
				<template #default>
					<div v-for="item in continueWatchingData" :key="item.id" class="me-3 flex-shrink-0">
						<widescreen-card :item="item" :show-progress="true" />
					</div>
				</template>
			</content-row>

			<!-- Neu hinzugefügt (Standard Cards) -->
			<content-row title="Neu hinzugefügt" icon="sparkles">
				<template #default>
					<div v-for="item in newlyAddedData" :key="item.id" class="me-3 flex-shrink-0">
						<standard-card :item="item" />
					</div>
				</template>
			</content-row>

			<!-- Neue Folgen (Widescreen Cards) -->
			<content-row title="Neue Folgen" icon="film">
				<template #default>
					<div v-for="item in newEpisodesData" :key="item.id" class="me-3 flex-shrink-0">
						<widescreen-card :item="item" :show-progress="false" badge-text="NEU" />
					</div>
				</template>
			</content-row>

			<!-- Für deinen nächsten Marathon (Standard Cards) -->
			<content-row title="Für deinen nächsten Marathon" icon="trophy">
				<template #default>
					<div v-for="item in marathonData" :key="item.id" class="me-3 flex-shrink-0">
						<standard-card :item="item" />
					</div>
				</template>
			</content-row>

			<!-- Brand aktuell (Standard Cards) -->
			<content-row title="Brand aktuell" icon="fire">
				<template #default>
					<div v-for="item in brandCurrentData" :key="item.id" class="me-3 flex-shrink-0">
						<standard-card :item="item" badge-text="AKTUELL" />
					</div>
				</template>
			</content-row>

			<!-- Nochmal ansehen (Standard Cards) -->
			<content-row title="Nochmal ansehen" icon="rotate-left">
				<template #default>
					<div v-for="item in rewatchData" :key="item.id" class="me-3 flex-shrink-0">
						<standard-card :item="item" show-check />
					</div>
				</template>
			</content-row>

			<!-- Meine Liste (Standard Cards) -->
			<content-row title="Meine Liste" icon="bookmark">
				<template #default>
					<div v-for="item in mylistData" :key="item.id" class="me-3 flex-shrink-0">
						<standard-card :item="item" />
					</div>
				</template>
			</content-row>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';

definePageMeta({
	middleware: 'auth',
});

// --- Interfaces ---
interface MediaItem {
	id: number;
	title: string;
	description: string;
	yearStart: number;
	yearEnd: number;
	cover: string; // 230x250
	backdrop?: string; // 16:9
	progress?: number; // 0-100
	episodes?: number;
}

// --- Helper for Dummy Data ---
const generateItems = (count: number, type: 'series' | 'movie', imageType: 'cover' | 'widescreen' = 'cover'): MediaItem[] => {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: count }, (_, i) => {
		const yearStart = currentYear - Math.floor(Math.random() * 10);
		// Logic: If movie, start === end. If series, end can be later.
		let yearEnd = yearStart;
		if (type === 'series') {
			yearEnd = Math.random() > 0.3 ? yearStart + Math.floor(Math.random() * 5) : currentYear; // ongoing or ended
		}

		const width = imageType === 'cover' ? 230 : 400; // Widescreen approx
		const height = imageType === 'cover' ? 250 : 225; // 16:9 aspect ratio

		return {
			id: i + Math.random(),
			title: (type === 'series'
				? ['Stranger Things', 'Breaking Bad', 'Dark', 'The Crown', 'Mandalorian', 'House of the Dragon'][i % 6]
				: ['Inception', 'Interstellar', 'Dune', 'Avatar', 'Gladiator', 'Matrix'][i % 6]) as string,
			description: 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor.',
			yearStart,
			yearEnd,
			cover: `https://picsum.photos/seed/${type}${i}${width}/${width}/${height}`,
			backdrop: `https://picsum.photos/seed/${type}${i}bg/1920/1080`,
			progress: type === 'series' ? Math.floor(Math.random() * 100) : undefined,
			episodes: type === 'series' ? Math.floor(Math.random() * 100) + 10 : undefined,
		};
	});
};

// --- Computed Year Range String ---
const getYearRange = (item: MediaItem) => {
	return item.yearStart === item.yearEnd ? `${item.yearStart}` : `${item.yearStart} – ${item.yearEnd}`;
};

// --- Dummy Data Definitions ---

// Featured Item
const featuredItem = ref(generateItems(1, 'series')[0]!);

// 1. Weiterschauen (Widescreen 16:9, Progress bar)
const continueWatchingData = ref(generateItems(10, 'series', 'widescreen'));

// 2. Neu hinzugefügt (Series, Covers)
const newlyAddedData = ref(generateItems(10, 'series'));

// 3. Neue Folgen (Widescreen 16:9, Badge "Neu")
const newEpisodesData = ref(generateItems(10, 'series', 'widescreen'));

// 4. Marathon (Series > 100 episodes logic simulated)
const marathonData = ref(generateItems(10, 'series').map((item) => ({ ...item, episodes: 100 + Math.floor(Math.random() * 200) })));

// 5. Brand aktuell (Series with recent updates)
const brandCurrentData = ref(generateItems(10, 'series'));

// 6. Nochmal ansehen (Completed)
const rewatchData = ref(generateItems(10, 'series'));

// 7. Meine Liste
const mylistData = ref(generateItems(10, 'series'));

const StandardCard = defineComponent({
	name: 'StandardCard',
	props: {
		item: { type: Object, required: true },
		badgeText: { type: String, default: '' },
		showCheck: { type: Boolean, default: false },
	},
	setup(props) {
		const yearRange = computed(() => {
			const i = props.item as any;
			return i.yearStart === i.yearEnd ? `${i.yearStart}` : `${i.yearStart} – ${i.yearEnd}`;
		});

		return () =>
			h(
				'div',
				{
					class: 'card-container',
					style: { width: '230px', cursor: 'pointer' },
				},
				[
					h(
						'div',
						{
							class: 'card bg-dark border-0 overflow-hidden position-relative',
							// style: { width: '230px', height: '250px' },
						},
						[
							h('img', { src: props.item.cover, class: 'card-img-top w-100 h-100 object-fit-cover', alt: props.item.title }),
							h('div', { class: 'card-img-overlay d-flex flex-column justify-content-end p-0' }, [
								h('div', { class: 'card-footer bg-dark bg-opacity-75 border-0 p-2' }, [
									props.badgeText ? h('span', { class: 'badge bg-danger mb-1' }, props.badgeText) : null,
									h('h6', { class: 'mb-0 text-truncate text-white fw-bold' }, props.item.title),
									h('small', { class: 'text-white-50 d-flex justify-content-between align-items-center' }, [
										h('span', yearRange.value),
										props.showCheck ? h('font-awesome-icon', { icon: ['fas', 'check'], class: 'text-success' }) : null,
									]),
								]),
							]),
						],
					),
				],
			);
	},
});

// Widescreen Sub-Component for Continue Watching / New Episodes
const WidescreenCard = defineComponent({
	name: 'WidescreenCard',
	props: {
		item: { type: Object, required: true },
		showProgress: { type: Boolean, default: false },
		badgeText: { type: String, default: '' },
	},
	setup(props) {
		return () =>
			h(
				'div',
				{
					class: 'card-container-widescreen',
					style: { width: '300px', cursor: 'pointer' },
				},
				[
					h(
						'div',
						{
							class: 'card bg-secondary bg-opacity-10 border-0 overflow-hidden',
							style: { width: '300px' },
						},
						[
							h('div', { class: 'position-relative' }, [
								h('img', { src: props.item.backdrop, class: 'w-100', style: { height: '170px', objectFit: 'cover' }, alt: props.item.title }),
								props.badgeText ? h('span', { class: 'position-absolute top-0 start-0 m-2 badge bg-danger' }, props.badgeText) : null,
								h('div', { class: 'position-absolute top-50 start-50 translate-middle' }, [
									h(
										'div',
										{
											class: 'rounded-circle bg-white bg-opacity-75 p-2 d-flex align-items-center justify-content-center',
											style: { width: '40px', height: '40px' },
										},
										[h('font-awesome-icon', { icon: ['fas', 'play'], class: 'text-dark' })],
									),
								]),
							]),
							h('div', { class: 'card-body p-2' }, [
								h('h6', { class: 'card-title mb-1 text-truncate' }, props.item.title),
								props.showProgress
									? h('div', { class: 'progress mt-1', style: { height: '3px' } }, [
											h('div', { class: 'progress-bar bg-danger', style: { width: `${props.item.progress}%` } }),
										])
									: h('small', { class: 'text-white-50' }, `S${Math.floor(Math.random() * 5) + 1} F${Math.floor(Math.random() * 20) + 1}`),
							]),
						],
					),
				],
			);
	},
});
</script>

<style scoped>
/* Hero Gradient Overlay */
.gradient-overlay {
	background:
		linear-gradient(to right, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.7) 50%, rgba(0, 0, 0, 0) 100%),
		linear-gradient(to top, #000 0%, transparent 30%);
}

/* Custom Scrollbar Row */
.content-row {
	overflow-x: auto;
	scroll-behavior: smooth;
	scrollbar-width: none; /* Firefox */
	-ms-overflow-style: none; /* IE and Edge */
}

.content-row::-webkit-scrollbar {
	display: none; /* Chrome, Safari and Opera */
}

/* Hover Effects */
.card-container,
.card-container-widescreen {
	transition:
		transform 0.3s ease,
		z-index 0.3s ease;
}

.card-container:hover,
.card-container-widescreen:hover {
	transform: scale(1.05);
	z-index: 10;
}

/* Re-importing components hack for single file demo */
/* In a real Nuxt app, you would put these in /components */
</style>
