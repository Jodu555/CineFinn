<template>
	<div class="min-vh-100 bg-dark text-white">
		<!-- Loading Spinner -->
		<div v-if="isLoading" class="d-flex justify-content-center align-items-center min-vh-100">
			<div class="spinner-border text-primary" role="status" style="width: 4rem; height: 4rem"></div>
		</div>

		<!-- Not Found -->
		<div v-else-if="!franchise" class="d-flex justify-content-center align-items-center min-vh-100 text-center">
			<div>
				<h1 class="fw-bold mb-4">Franchise Not Found</h1>
				<button class="btn btn-outline-light" @click="goBack">
					<font-awesome-icon :icon="['fa-solid', 'fa-arrow-left']" class="me-2" />
					Go Back
				</button>
			</div>
		</div>

		<!-- Franchise Page -->
		<div v-else>
			<!-- Hero Section -->
			<div class="position-relative" style="height: 70vh; overflow: hidden">
				<img
					:src="franchise.backgroundImage || '/placeholder.svg'"
					:alt="franchise.name"
					class="w-100 h-100 object-fit-cover position-absolute top-0 start-0" />
				<div
					class="position-absolute top-0 start-0 w-100 h-100"
					style="background: linear-gradient(to top, #000, rgba(0, 0, 0, 0.6), transparent)"></div>

				<div class="position-absolute top-0 start-0 p-3">
					<button class="btn btn-outline-light btn-sm" @click="goBack">
						<font-awesome-icon :icon="['fa-solid', 'fa-arrow-left']" class="me-2" />
						Back
					</button>
				</div>

				<div class="position-absolute bottom-0 start-0 end-0 p-4 p-md-5">
					<div class="container">
						<div class="mb-4">
							<img :src="franchise.logo || '/placeholder.svg'" :alt="`${franchise.name} logo`" width="300" class="img-fluid" />
						</div>
						<p class="text-light mb-3">{{ franchise.description }}</p>
						<div class="text-secondary small">
							<span>{{ franchise.totalContent }} Titles</span>
							<span class="mx-2">•</span>
							<span>{{ franchise.subFranchises.length }} Sub-Franchises</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Content Section -->
			<div class="container py-5">
				<!-- Sub-Franchise Filter -->
				<div v-if="franchise.subFranchises.length" class="mb-4">
					<h2 class="h5 fw-semibold mb-3">Browse by Collection</h2>
					<div class="d-flex flex-wrap gap-2">
						<button
							class="btn"
							:class="selectedSubFranchise === null ? 'btn-primary' : 'btn-outline-light'"
							@click="selectedSubFranchise = null">
							All Content
						</button>
						<button
							v-for="sf in franchise.subFranchises"
							:key="sf.id"
							class="btn"
							:class="selectedSubFranchise === sf.id ? 'btn-primary' : 'btn-outline-light'"
							@click="selectedSubFranchise = sf.id">
							{{ sf.name }}
						</button>
					</div>
				</div>

				<!-- Selected Sub-Franchise Info -->
				<div v-if="selectedSubFranchise" class="p-4 mb-4 bg-secondary bg-opacity-25 rounded">
					<div v-if="selectedFranchise" class="d-flex align-items-center gap-3">
						<img :src="selectedFranchise.logo || '/placeholder.svg'" :alt="selectedFranchise.name" width="120" class="img-fluid" />
						<div>
							<h3 class="h6 fw-bold">{{ selectedFranchise.name }}</h3>
							<p class="text-light mb-1">{{ selectedFranchise.description }}</p>
							<small class="text-secondary">{{ selectedFranchise.content.length }} titles</small>
						</div>
					</div>
				</div>

				<!-- Content Grid -->
				<div class="row g-3">
					<div v-for="content in filteredContent" :key="content.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
						<div
							class="card bg-dark border-0 text-white h-100 position-relative overflow-hidden"
							style="cursor: pointer"
							@click="watchContent(content.id)">
							<img
								:src="content.poster || '/placeholder.svg'"
								:alt="content.title"
								class="card-img-top object-fit-cover"
								style="aspect-ratio: 2/3" />
							<span class="badge bg-secondary position-absolute top-0 end-0 m-2" style="background: rgba(0, 0, 0, 0.6) !important">
								{{ content.type === 'movie' ? 'Movie' : 'Series' }}
							</span>
							<div class="card-body p-2">
								<h6 class="card-title text-truncate mb-1">{{ content.title }}</h6>
								<div class="d-flex align-items-center small text-muted mb-1">
									<font-awesome-icon :icon="['fa-solid', 'fa-calendar']" class="me-1" />
									<span>{{ content.year }}</span>
									<span class="mx-1">•</span>
									<font-awesome-icon :icon="['fa-solid', 'fa-star']" class="text-warning me-1" />
									<span>{{ content.rating }}</span>
								</div>
								<div class="d-flex align-items-center small text-secondary mb-1">
									<font-awesome-icon :icon="['fa-solid', 'fa-clock']" class="me-1" />
									<span>{{ content.duration }}</span>
								</div>
								<div class="d-flex flex-wrap gap-1 mt-2">
									<span
										v-for="genre in content.genre.slice(0, 2)"
										:key="genre"
										class="badge bg-outline-light border text-light"
										style="border: 1px solid #6c757d; font-size: 0.7rem">
										{{ genre }}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty State -->
				<div v-if="filteredContent.length === 0" class="text-center py-5 text-secondary">No content found for this selection.</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

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

const franchiseData: Record<string, FranchiseData> = {
	'star-wars': {
		id: 'star-wars',
		name: 'Star Wars',
		description: 'A long time ago in a galaxy far, far away... Experience the epic space saga that changed cinema forever.',
		backgroundImage: '/test/star-wars-space-battle-scene-with-starships.jpg',
		logo: '/test/star-wars-logo.jpg',
		totalContent: 12,
		subFranchises: [
			{
				id: 'original-trilogy',
				name: 'Original Trilogy',
				description: 'The classic trilogy that started it all',
				logo: '/test/star-wars-original-trilogy-logo.jpg',
				content: [
					{
						id: 'sw-4',
						title: 'A New Hope',
						year: 1977,
						rating: 8.6,
						duration: '2h 1m',
						description: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy.',
						poster: '/test/placeholder.svg?height=346&width=230&query=Star Wars A New Hope movie poster',
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
						poster: '/test/star-wars-empire-strikes-back-movie-poster.jpg',
						type: 'movie',
						genre: ['Sci-Fi', 'Adventure'],
					},
				],
			},
			{
				id: 'prequel-trilogy',
				name: 'Prequel Trilogy',
				description: "The story of Anakin Skywalker's fall to the dark side",
				logo: '/test/star-wars-prequel-trilogy-logo.jpg',
				content: [
					{
						id: 'sw-1',
						title: 'The Phantom Menace',
						year: 1999,
						rating: 6.5,
						duration: '2h 16m',
						description: 'Young Anakin Skywalker is discovered and begins his journey.',
						poster: '/test/placeholder.svg?height=346&width=230&query=Star Wars Phantom Menace movie poster',
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
				poster: '/test/the-mandalorian-poster.png',
				type: 'series',
				genre: ['Sci-Fi', 'Western'],
			},
		],
	},
	barbie: {
		id: 'barbie',
		name: 'Barbie',
		description: 'Enter the pink world of Barbie with movies, specials, and animated adventures.',
		backgroundImage: '/test/barbie-pink-dreamhouse-fantasy-world.jpg',
		logo: '/test/barbie-logo-pink.jpg',
		totalContent: 8,
		subFranchises: [
			{
				id: 'barbie-movies',
				name: 'Barbie Movies',
				description: 'Feature-length Barbie adventures',
				logo: '/test/barbie-movies-logo-pink.jpg',
				content: [
					{
						id: 'barbie-2023',
						title: 'Barbie',
						year: 2023,
						rating: 7.0,
						duration: '1h 54m',
						description: 'Barbie and Ken are having the time of their lives in the colorful world of Barbie Land.',
						poster: '/test/placeholder.svg?height=346&width=230&query=Barbie 2023 movie poster pink',
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
				poster: '/test/barbie-dreamhouse-adventures-series-poster.jpg',
				type: 'series',
				genre: ['Animation', 'Family'],
			},
		],
	},
	mcu: {
		id: 'mcu',
		name: 'Marvel Cinematic Universe',
		description: 'The interconnected universe of Marvel superheroes spanning movies and series.',
		backgroundImage: '/test/marvel-superheroes-action-scene.jpg',
		logo: '/test/marvel-studios-logo.jpg',
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

const isLoading = ref(true);
const selectedSubFranchise = ref<string | null>(null);
const franchise = ref<FranchiseData | null>(null);

onMounted(() => {
	franchise.value = franchiseData[slug] || null;
	if (franchise.value) {
		isLoading.value = false;
	}
});

const goBack = () => router.back();

const selectedFranchise = computed(() => franchise.value?.subFranchises.find((sf) => sf.id === selectedSubFranchise.value));

const filteredContent = computed(() => {
	if (!franchise.value) return [];
	if (selectedSubFranchise.value) {
		return franchise.value.subFranchises.find((sf) => sf.id === selectedSubFranchise.value)?.content || [];
	}
	return [...franchise.value.mainContent, ...franchise.value.subFranchises.flatMap((sf) => sf.content)];
});

const watchContent = (contentId: string) => {
	router.push(`/watch/${contentId}`);
};
</script>

<style scoped>
.object-fit-cover {
	object-fit: cover;
}
</style>
