<template>
	<div class="franchise-page min-vh-100 text-white">
		<!-- Loading Spinner -->
		<div v-if="false" class="d-flex justify-content-center align-items-center min-vh-100">
			<div class="spinner-border text-primary" role="status" style="width: 4rem; height: 4rem"></div>
		</div>

		<!-- Not Found -->
		<div v-else-if="!franchise" class="d-flex justify-content-center align-items-center min-vh-100 text-center">
			<div>
				<h1 class="fw-bold mb-4 display-4">Franchise Not Found</h1>
				<button class="btn btn-outline-light btn-lg px-4 rounded-pill" @click="goBack">
					<font-awesome-icon :icon="['fa-solid', 'fa-arrow-left']" class="me-2" />
					Go Back
				</button>
			</div>
		</div>

		<!-- Franchise Page -->
		<div v-else>
			<!-- Hero Section -->
			<div class="hero-section position-relative">
				<div class="hero-image-wrapper">
					<img :src="franchise.backgroundImage || '/placeholder.svg'" :alt="franchise.name" class="hero-image" />
					<div class="hero-overlay"></div>
				</div>

				<div class="hero-content position-absolute bottom-0 start-0 end-0">
					<div class="container px-4 px-lg-5 pb-5">
						<div class="row align-items-end">
							<div class="col-lg-8">
								<div :initial="{ opacity: 0, y: 30 }" :animate="{ opacity: 1, y: 0 }" class="franchise-logo mb-4">
									<img :src="franchise.logo || '/placeholder.svg'" :alt="`${franchise.name} logo`" class="img-fluid franchise-logo-img" />
								</div>
								<p class="hero-description lead mb-4 text-white-50">{{ franchise.description }}</p>
								<div class="franchise-meta d-flex gap-4 text-white-50">
									<div class="meta-item">
										<span class="meta-number">{{ franchise.totalContent }}</span>
										<span class="meta-label ms-2">Titles</span>
									</div>
									<div class="meta-divider"></div>
									<div class="meta-item">
										<span class="meta-number">{{ franchise.subFranchises.length }}</span>
										<span class="meta-label ms-2">Collections</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Sticky Sub-Franchise Navigation -->
			<div class="sub-franchise-nav sticky-top" ref="stickyNav" :class="{ 'nav-scrolled': isNavScrolled }">
				<div class="container px-4 px-lg-5">
					<div class="nav-wrapper d-flex align-items-center gap-2 py-3 overflow-auto">
						<button class="nav-pill" :class="{ active: activeSection === 'all' }" @click="scrollToSection('all')">
							<span class="nav-icon">
								<font-awesome-icon :icon="['fa-solid', 'fa-grid-2']" />
							</span>
							<span class="nav-text">All Content</span>
						</button>

						<div class="nav-divider"></div>

						<button
							v-for="sf in franchise.subFranchises"
							:key="sf.id"
							class="nav-pill"
							:class="{ active: activeSection === sf.id }"
							@click="scrollToSection(sf.id)"
						>
							<span class="nav-text">{{ sf.name }}</span>
							<span class="nav-count">{{ sf.content.length }}</span>
						</button>
					</div>
				</div>
			</div>

			<!-- Content Sections -->
			<div class="content-sections py-5">
				<div class="container px-4 px-lg-5">
					<!-- All Content Grid (when no specific section selected or as overview) -->
					<div id="section-all" class="content-section mb-5" ref="sectionAll">
						<div class="section-header mb-4 d-flex align-items-center justify-content-between">
							<div>
								<h2 class="section-title h3 mb-1">All Content</h2>
								<p class="section-subtitle text-white-50 mb-0">Complete {{ franchise.name }} collection</p>
							</div>
						</div>

						<div class="content-grid row g-4">
							<div v-for="content in allContent" :key="content.id" class="col-6 col-sm-4 col-md-3 col-xl-2">
								<content-card :content="content" @click="watchContent(content.id)" />
							</div>
						</div>
					</div>

					<!-- Individual Sub-Franchise Sections -->
					<div
						v-for="sf in franchise.subFranchises"
						:key="sf.id"
						:id="`section-${sf.id}`"
						class="content-section sub-franchise-section mb-5"
						:data-section="sf.id"
					>
						<!-- Sub-Franchise Header -->
						<div class="sub-franchise-header mb-4 p-4 rounded-4 bg-glass">
							<div class="row align-items-center g-4">
								<div class="col-auto">
									<div class="sub-franchise-logo-wrapper">
										<img :src="sf.logo || '/placeholder.svg'" :alt="sf.name" class="sub-franchise-logo" />
									</div>
								</div>
								<div class="col">
									<h2 class="sub-franchise-title h4 mb-2">{{ sf.name }}</h2>
									<p class="sub-franchise-desc text-white-50 mb-0">{{ sf.description }}</p>
								</div>
								<div class="col-auto">
									<span class="content-count-badge"> {{ sf.content.length }} titles </span>
								</div>
							</div>
						</div>

						<!-- Content Grid for this Sub-Franchise -->
						<div class="content-grid row g-4">
							<div v-for="content in sf.content" :key="content.id" class="col-6 col-sm-4 col-md-3 col-xl-2">
								<ContentCard :content="content" @click="watchContent(content.id)" />
							</div>
						</div>
					</div>

					<!-- Empty State -->
					<div v-if="franchise.subFranchises.length === 0 && franchise.mainContent.length === 0" class="text-center py-5 text-secondary">
						<font-awesome-icon :icon="['fa-solid', 'fa-film']" class="display-1 mb-3 opacity-25" />
						<p class="lead">No content available for this franchise.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ContentCard from '~/components/ContentCard.vue';

definePageMeta({
	middleware: 'auth',
});

interface Content {
	id: string;
	title: string;
	year: number;
	rating: number;
	duration: string;
	description: string;
	poster: string;
	type: 'movie' | 'series';
	genre: string[];
}

interface SubFranchise {
	id: string;
	name: string;
	description: string;
	logo: string;
	content: Content[];
}

interface FranchiseData {
	id: string;
	name: string;
	description: string;
	backgroundImage: string;
	logo: string;
	totalContent: number;
	subFranchises: SubFranchise[];
	mainContent: Content[];
}

// Data remains the same as your original
const franchiseData: Record<string, FranchiseData> = {
	'star-wars': {
		id: 'star-wars',
		name: 'Star Wars',
		description: 'A long time ago in a galaxy far, far away... Experience the epic space saga that changed cinema forever.',
		backgroundImage: 'https://cinema.jodu555.de/test/star-wars-space-battle-scene-with-starships.jpg',
		logo: 'https://cinema.jodu555.de/test/star-wars-logo.jpg',
		totalContent: 12,
		subFranchises: [
			{
				id: 'original-trilogy',
				name: 'Original Trilogy',
				description: 'The classic trilogy that started it all',
				logo: 'https://cinema.jodu555.de/test/star-wars-original-trilogy-logo.jpg',
				content: [
					{
						id: 'sw-4',
						title: 'A New Hope',
						year: 1977,
						rating: 8.6,
						duration: '2h 1m',
						description: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy.',
						poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Star Wars A New Hope movie poster',
						type: 'movie',
						genre: ['Sci-Fi', 'Adventure'],
					},
					{
						id: 'sw-5',
						title: 'The Empire Strikes Back',
						year: 1980,
						rating: 8.7,
						duration: '2h 4m',
						description: 'The Empire strikes back against the Rebel Alliance.',
						poster: 'https://cinema.jodu555.de/test/star-wars-empire-strikes-back-movie-poster.jpg',
						type: 'movie',
						genre: ['Sci-Fi', 'Adventure'],
					},
				],
			},
			{
				id: 'prequel-trilogy',
				name: 'Prequel Trilogy',
				description: "The story of Anakin Skywalker's fall to the dark side",
				logo: 'https://cinema.jodu555.de/test/star-wars-prequel-trilogy-logo.jpg',
				content: [
					{
						id: 'sw-1',
						title: 'The Phantom Menace',
						year: 1999,
						rating: 6.5,
						duration: '2h 16m',
						description: 'Young Anakin Skywalker is discovered and begins his journey.',
						poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Star Wars Phantom Menace movie poster',
						type: 'movie',
						genre: ['Sci-Fi', 'Adventure'],
					},
				],
			},
		],
		mainContent: [
			{
				id: 'mandalorian',
				title: 'The Mandalorian',
				year: 2019,
				rating: 8.8,
				duration: '3 Seasons',
				description: 'A lone bounty hunter in the outer reaches of the galaxy.',
				poster: 'https://cinema.jodu555.de/test/the-mandalorian-poster.png',
				type: 'series',
				genre: ['Sci-Fi', 'Western'],
			},
		],
	},
	barbie: {
		id: 'barbie',
		name: 'Barbie',
		description: 'Enter the pink world of Barbie with movies, specials, and animated adventures.',
		backgroundImage: 'https://cinema.jodu555.de/test/barbie-pink-dreamhouse-fantasy-world.jpg',
		logo: 'https://cinema.jodu555.de/test/barbie-logo-pink.jpg',
		totalContent: 8,
		subFranchises: [
			{
				id: 'barbie-movies',
				name: 'Barbie Movies',
				description: 'Feature-length Barbie adventures',
				logo: 'https://cinema.jodu555.de/test/barbie-movies-logo-pink.jpg',
				content: [
					{
						id: 'barbie-2023',
						title: 'Barbie',
						year: 2023,
						rating: 7.0,
						duration: '1h 54m',
						description: 'Barbie and Ken are having the time of their lives in the colorful world of Barbie Land.',
						poster: 'https://cinema.jodu555.de/test/placeholder.svg?height=346&width=230&query=Barbie 2023 movie poster pink',
						type: 'movie',
						genre: ['Comedy', 'Fantasy'],
					},
				],
			},
		],
		mainContent: [
			{
				id: 'barbie-dreamhouse',
				title: 'Barbie: Dreamhouse Adventures',
				year: 2018,
				rating: 6.2,
				duration: '4 Seasons',
				description: 'Follow Barbie and her sisters in their Malibu adventures.',
				poster: 'https://cinema.jodu555.de/test/barbie-dreamhouse-adventures-series-poster.jpg',
				type: 'series',
				genre: ['Animation', 'Family'],
			},
		],
	},
	mcu: {
		id: 'mcu',
		name: 'Marvel Cinematic Universe',
		description: 'The interconnected universe of Marvel superheroes spanning movies and series.',
		backgroundImage: 'https://cinema.jodu555.de/test/marvel-superheroes-action-scene.jpg',
		logo: 'https://cinema.jodu555.de/test/marvel-studios-logo.jpg',
		totalContent: 35,
		subFranchises: [
			{
				id: 'spider-man',
				name: 'Spider-Man',
				description: 'Your friendly neighborhood Spider-Man',
				logo: '/spider-man-logo-red-blue.jpg',
				content: [
					{
						id: 'spiderman-homecoming',
						title: 'Spider-Man: Homecoming',
						year: 2017,
						rating: 7.4,
						duration: '2h 13m',
						description: 'Peter Parker balances his life as Spider-Man with his high school life.',
						poster: '/placeholder.svg?height=346&width=230&query=Spider-Man Homecoming movie poster',
						type: 'movie',
						genre: ['Action', 'Adventure'],
					},
					{
						id: 'spiderman-ffh',
						title: 'Spider-Man: Far From Home',
						year: 2019,
						rating: 7.4,
						duration: '2h 9m',
						description: 'Spider-Man swings into action in Europe.',
						poster: '/images/spiderman.png',
						type: 'movie',
						genre: ['Action', 'Adventure'],
					},
				],
			},
			{
				id: 'avengers',
				name: 'Avengers',
				description: "Earth's Mightiest Heroes",
				logo: '/avengers-logo-marvel.jpg',
				content: [
					{
						id: 'avengers-1',
						title: 'The Avengers',
						year: 2012,
						rating: 8.0,
						duration: '2h 23m',
						description: "Earth's mightiest heroes must come together to stop an alien invasion.",
						poster: '/placeholder.svg?height=346&width=230&query=The Avengers 2012 movie poster',
						type: 'movie',
						genre: ['Action', 'Sci-Fi'],
					},
					{
						id: 'avengers-endgame',
						title: 'Avengers: Endgame',
						year: 2019,
						rating: 8.4,
						duration: '3h 1m',
						description: "The Avengers assemble once more to reverse Thanos' actions.",
						poster: '/avengers-endgame-inspired-poster.png',
						type: 'movie',
						genre: ['Action', 'Drama'],
					},
				],
			},
		],
		mainContent: [
			{
				id: 'iron-man',
				title: 'Iron Man',
				year: 2008,
				rating: 7.9,
				duration: '2h 6m',
				description: 'Tony Stark becomes the armored superhero Iron Man.',
				poster: '/iron-man-2008-movie-poster-red-gold.jpg',
				type: 'movie',
				genre: ['Action', 'Sci-Fi'],
			},
			{
				id: 'loki',
				title: 'Loki',
				year: 2021,
				rating: 8.2,
				duration: '2 Seasons',
				description: "The God of Mischief steps out of his brother's shadow.",
				poster: '/loki-tv-series-poster-green-gold.jpg',
				type: 'series',
				genre: ['Action', 'Fantasy'],
			},
		],
	},
};

const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;

const franchise = computed(() => franchiseData[slug] || null);
const activeSection = ref('all');
const isNavScrolled = ref(false);
const stickyNav = ref<HTMLElement | null>(null);

useSeoMeta({
	title: computed(() => (franchise.value ? `Cinema | ${franchise.value.name}` : 'Cinema | Franchise')),
	description: computed(() => franchise.value?.description || ''),
});

// Combine main content and sub-franchise content for "All" view
const allContent = computed(() => {
	if (!franchise.value) return [];
	return [...franchise.value.mainContent, ...franchise.value.subFranchises.flatMap((sf) => sf.content)];
});

onMounted(() => {
	if (process.client) {
		window.addEventListener('scroll', handleScroll, { passive: true });
		setupIntersectionObserver();
	}
});

onUnmounted(() => {
	if (process.client) {
		window.removeEventListener('scroll', handleScroll);
	}
});

const goBack = () => router.back();

const handleScroll = () => {
	isNavScrolled.value = window.scrollY > 100;
};

const scrollToSection = (sectionId: string) => {
	const element = document.getElementById(`section-${sectionId}`);
	if (element) {
		const navHeight = stickyNav.value?.offsetHeight || 60;
		const navbarHeight = 60; // Bootstrap navbar height
		const totalOffset = navHeight + navbarHeight + 20;

		const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
		window.scrollTo({
			top: elementPosition - totalOffset,
			behavior: 'smooth',
		});
		activeSection.value = sectionId;
	}
};

const setupIntersectionObserver = () => {
	if (!process.client) return;

	nextTick(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const sectionId = entry.target.getAttribute('data-section') || 'all';
						activeSection.value = sectionId;
					}
				});
			},
			{
				rootMargin: '-20% 0px -60% 0px',
				threshold: 0,
			},
		);

		// Observe all sections
		document.querySelectorAll('.content-section').forEach((section) => {
			observer.observe(section);
		});
	});
};

const watchContent = (contentId: string) => {
	router.push(`/watch/${contentId}`);
};
</script>

<style scoped>
/* CSS Variables for the dark theme */
.franchise-page {
	--franchise-bg: oklch(0.1436 0.0152 284.32);
	--franchise-surface: oklch(0.2 0.02 284.32);
	--franchise-accent: #3b82f6;
	--franchise-glass: rgba(255, 255, 255, 0.05);
	--franchise-glass-border: rgba(255, 255, 255, 0.1);
}

/* Hero Section */
.hero-section {
	height: 70vh;
	position: relative;
	overflow: hidden;
}

.hero-image-wrapper {
	position: absolute;
	inset: 0;
}

.hero-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transform: scale(1.1);
	animation: subtleZoom 20s ease-out forwards;
}

@keyframes subtleZoom {
	to {
		transform: scale(1);
	}
}

.hero-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(to top, oklch(0.1436 0.0152 284.32) 0%, rgba(9, 9, 16, 0.8) 30%, rgba(9, 9, 16, 0.4) 60%, transparent 100%);
}

.hero-content {
	z-index: 2;
	background: linear-gradient(to top, oklch(0.1436 0.0152 284.32), transparent);
	padding-bottom: 2rem;
}

.franchise-logo-img {
	max-height: 180px;
	width: auto;
	filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
}

.hero-description {
	max-width: 600px;
	line-height: 1.7;
	font-size: 1.125rem;
}

.franchise-meta {
	padding-top: 1rem;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.meta-number {
	font-size: 1.5rem;
	font-weight: 700;
	color: white;
}

.meta-label {
	text-transform: uppercase;
	letter-spacing: 0.05em;
	font-size: 0.875rem;
}

.meta-divider {
	width: 1px;
	height: 30px;
	background: rgba(255, 255, 255, 0.2);
}

/* Sticky Navigation */
.sub-franchise-nav {
	top: 56px; /* Bootstrap navbar height */
	z-index: 1020;
	background: transparent;
	transition: all 0.3s ease;
	border-bottom: 1px solid transparent;
}

.nav-scrolled {
	background: color-mix(in oklab, var(--bs-body-bg) 85%, transparent);
	backdrop-filter: blur(12px);
	border-bottom-color: var(--franchise-glass-border);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.nav-wrapper {
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.nav-wrapper::-webkit-scrollbar {
	display: none;
}

.nav-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 1rem;
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 100px;
	color: rgba(255, 255, 255, 0.7);
	font-size: 0.875rem;
	font-weight: 500;
	white-space: nowrap;
	transition: all 0.2s ease;
	cursor: pointer;
}

.nav-pill:hover {
	background: rgba(255, 255, 255, 0.1);
	color: white;
	transform: translateY(-1px);
}

.nav-pill.active {
	background: var(--franchise-accent);
	border-color: var(--franchise-accent);
	color: white;
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.nav-icon {
	font-size: 0.875rem;
}

.nav-count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 20px;
	height: 20px;
	padding: 0 6px;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 10px;
	font-size: 0.75rem;
	font-weight: 600;
}

.nav-pill.active .nav-count {
	background: rgba(255, 255, 255, 0.3);
}

.nav-divider {
	width: 1px;
	height: 24px;
	background: rgba(255, 255, 255, 0.1);
	flex-shrink: 0;
}

/* Content Sections */
.content-sections {
	position: relative;
}

.content-section {
	scroll-margin-top: 140px; /* Account for both navbars */
}

.section-title {
	font-weight: 700;
	letter-spacing: -0.02em;
}

.section-subtitle {
	font-size: 0.95rem;
}

/* Sub-Franchise Header */
.bg-glass {
	background: var(--franchise-glass);
	backdrop-filter: blur(10px);
	border: 1px solid var(--franchise-glass-border);
}

.sub-franchise-header {
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.sub-franchise-logo-wrapper {
	width: 80px;
	height: 80px;
	background: rgba(0, 0, 0, 0.3);
	border-radius: 16px;
	padding: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(255, 255, 255, 0.1);
}

.sub-franchise-logo {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.sub-franchise-title {
	font-weight: 700;
	background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
}

.content-count-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.5rem 1rem;
	background: rgba(59, 130, 246, 0.15);
	color: #60a5fa;
	border: 1px solid rgba(59, 130, 246, 0.3);
	border-radius: 100px;
	font-size: 0.875rem;
	font-weight: 600;
}

/* Content Cards */
.content-grid {
	margin-top: -0.5rem;
}

/* Responsive adjustments */
@media (max-width: 991.98px) {
	.hero-section {
		height: 60vh;
	}

	.franchise-logo-img {
		max-height: 120px;
	}

	.hero-description {
		font-size: 1rem;
	}
}

@media (max-width: 767.98px) {
	.hero-section {
		height: 50vh;
	}

	.franchise-logo-img {
		max-height: 80px;
	}

	.sub-franchise-logo-wrapper {
		width: 60px;
		height: 60px;
		padding: 8px;
	}

	.meta-number {
		font-size: 1.25rem;
	}

	.meta-label {
		font-size: 0.75rem;
	}
}

/* Smooth scrolling */
html {
	scroll-behavior: smooth;
}

/* Content Card Component Styles (inline for single file) */
:deep(.content-card) {
	position: relative;
	border-radius: 12px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.05);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
	height: 100%;
}

:deep(.content-card:hover) {
	transform: translateY(-4px) scale(1.02);
	border-color: rgba(255, 255, 255, 0.2);
	box-shadow:
		0 20px 40px rgba(0, 0, 0, 0.4),
		0 0 0 1px rgba(255, 255, 255, 0.1);
}

:deep(.card-poster) {
	aspect-ratio: 2/3;
	width: 100%;
	object-fit: cover;
}

:deep(.card-badge) {
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(4px);
	padding: 0.25rem 0.75rem;
	border-radius: 100px;
	font-size: 0.75rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.card-content) {
	padding: 1rem;
}

:deep(.card-title) {
	font-weight: 600;
	font-size: 0.95rem;
	margin-bottom: 0.5rem;
	color: white;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

:deep(.card-meta) {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: rgba(255, 255, 255, 0.5);
	font-size: 0.8rem;
	margin-bottom: 0.5rem;
}

:deep(.card-genres) {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	margin-top: 0.75rem;
}

:deep(.genre-tag) {
	font-size: 0.7rem;
	padding: 0.25rem 0.5rem;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 4px;
	color: rgba(255, 255, 255, 0.7);
}
</style>
