<template>
	<div class="container-fluid bg-dark text-white min-vh-100 py-4">
		<!-- Content Information -->
		<div class="container">
			<div class="row g-4">
				<!-- Main Content Info -->
				<div class="col-lg-8">
					<div class="row g-4 mb-4">
						<div class="col-auto">
							<img
								:src="content.cover"
								:alt="content.title"
								class="img-fluid rounded"
								style="width: 128px; height: 192px; object-fit: cover" />
						</div>
						<div class="col">
							<h1 class="display-5 fw-bold mb-3">{{ content.title }}</h1>

							<div class="d-flex flex-wrap align-items-center gap-3 mb-3">
								<span class="badge bg-secondary">{{ content.year }}</span>
								<span class="badge bg-danger">{{ content.type.toUpperCase() }}</span>
								<div class="d-flex align-items-center">
									<span class="text-warning me-1">★</span>
									<span class="fw-medium">{{ content.rating }}</span>
								</div>
								<span class="text-muted">{{ content.duration }}</span>
							</div>

							<div class="d-flex flex-wrap gap-2 mb-3">
								<span v-for="genre in content.genre" :key="genre" class="badge border border-secondary text-white">
									{{ genre }}
								</span>
							</div>

							<p class="text-muted mb-4">{{ content.description }}</p>

							<div class="d-flex gap-3">
								<button class="btn btn-danger">
									<span class="me-2">+</span>
									Add to Watchlist
								</button>
								<button class="btn btn-outline-light">
									<span class="me-2">★</span>
									Rate
								</button>
							</div>
						</div>
					</div>

					<!-- Episodes/Movies Section -->
					<div v-if="content.type !== 'movie' && (hasSeasons || hasMovies)" class="mb-4">
						<ul class="nav nav-tabs mb-4" role="tablist">
							<li v-if="hasSeasons" class="nav-item" role="presentation">
								<button
									:class="['nav-link', { active: activeTab === 'seasons' }]"
									@click="activeTab = 'seasons'"
									type="button"
									role="tab">
									Seasons
								</button>
							</li>
							<li v-if="hasMovies" class="nav-item" role="presentation">
								<button
									:class="['nav-link', { active: activeTab === 'movies' }]"
									@click="activeTab = 'movies'"
									type="button"
									role="tab">
									🎬 Movies ({{ content.movies?.length }})
								</button>
							</li>
						</ul>

						<div class="tab-content">
							<!-- Seasons Tab -->
							<div v-if="activeTab === 'seasons' && hasSeasons" class="tab-pane fade show active">
								<div
									class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
									<div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
										<h2 class="h5 mb-0">Episodes</h2>
										<select v-model="selectedSeason" class="form-select" style="width: auto">
											<option v-for="season in content.seasons" :key="season.number" :value="season.number">
												{{ season.title }} ({{ season.episodes.length }} episodes)
											</option>
										</select>
									</div>

									<div class="btn-group" role="group">
										<button
											type="button"
											:class="['btn', viewMode === 'grid' ? 'btn-danger' : 'btn-outline-secondary']"
											@click="viewMode = 'grid'">
											☰
										</button>
										<button
											type="button"
											:class="['btn', viewMode === 'compact' ? 'btn-danger' : 'btn-outline-secondary']"
											@click="viewMode = 'compact'">
											⊞
										</button>
									</div>
								</div>

								<!-- Grid View -->
								<div v-if="viewMode === 'grid'" class="d-flex flex-column gap-2">
									<div
										v-for="episode in currentSeasonData?.episodes"
										:key="episode.number"
										:class="[
											'card cursor-pointer',
											isEpisodeWatched(selectedSeason, episode.number) ? 'border-success bg-success bg-opacity-10' : '',
											isCurrentEpisode(selectedSeason, episode.number) ? 'border-primary border-2' : '',
										]"
										@click="handleEpisodeClick(selectedSeason, episode.number)"
										style="cursor: pointer">
										<div class="card-body p-3">
											<div class="d-flex align-items-center gap-3">
												<div
													:class="[
														'rounded d-flex align-items-center justify-content-center',
														isEpisodeWatched(selectedSeason, episode.number)
															? 'bg-success bg-opacity-25'
															: 'bg-secondary',
													]"
													style="width: 64px; height: 40px">
													<span v-if="isEpisodeWatched(selectedSeason, episode.number)" class="text-success">✓</span>
													<span v-else>▶</span>
												</div>
												<div class="flex-grow-1">
													<h3 :class="['h6 mb-1', isEpisodeWatched(selectedSeason, episode.number) ? 'text-success' : '']">
														{{ episode.title }}
														<small v-if="isEpisodeWatched(selectedSeason, episode.number)" class="text-success">
															✓ Watched
														</small>
													</h3>
													<p class="text-muted small mb-0">{{ episode.duration }}</p>
												</div>
												<div class="progress" style="width: 80px; height: 4px">
													<div
														:class="[
															'progress-bar',
															isEpisodeWatched(selectedSeason, episode.number) ? 'bg-success' : 'bg-danger',
														]"
														:style="{ width: getEpisodeProgress(selectedSeason, episode.number) + '%' }"></div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Compact View -->
								<div v-else class="row row-cols-4 row-cols-sm-6 row-cols-md-8 row-cols-lg-10 row-cols-xl-12 g-1">
									<div v-for="episode in currentSeasonData?.episodes" :key="episode.number" class="col">
										<div
											:class="[
												'card h-100 cursor-pointer',
												isEpisodeWatched(selectedSeason, episode.number) ? 'border-success bg-success bg-opacity-10' : '',
												isCurrentEpisode(selectedSeason, episode.number) ? 'border-primary border-2' : '',
											]"
											@click="handleEpisodeClick(selectedSeason, episode.number)"
											style="cursor: pointer; aspect-ratio: 1">
											<div class="card-body p-1 d-flex flex-column align-items-center justify-content-center">
												<span
													:class="[
														'small fw-medium',
														isEpisodeWatched(selectedSeason, episode.number) ? 'text-success' : '',
													]">
													{{ episode.number }}
												</span>
												<span
													v-if="isEpisodeWatched(selectedSeason, episode.number)"
													class="text-success"
													style="font-size: 0.75rem">
													✓
												</span>
												<div
													v-if="isCurrentEpisode(selectedSeason, episode.number)"
													class="progress w-100 mt-1"
													style="height: 2px">
													<div
														:class="[
															'progress-bar',
															isEpisodeWatched(selectedSeason, episode.number) ? 'bg-success' : 'bg-danger',
														]"
														:style="{ width: progress + '%' }"></div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Movies Tab -->
							<div v-if="activeTab === 'movies' && hasMovies" class="tab-pane fade show active">
								<div class="d-flex flex-column gap-3">
									<div
										v-for="movie in content.movies"
										:key="movie.id"
										:class="[
											'card cursor-pointer',
											watchedMovies.has(movie.id) ? 'border-success bg-success bg-opacity-10' : '',
											currentMovie === movie.id ? 'border-primary border-2' : '',
										]"
										@click="handleMovieClick(movie.id)"
										style="cursor: pointer">
										<div class="card-body p-4">
											<div class="d-flex gap-3">
												<div
													:class="[
														'rounded d-flex align-items-center justify-content-center flex-shrink-0',
														watchedMovies.has(movie.id) ? 'bg-success bg-opacity-25' : 'bg-secondary',
													]"
													style="width: 80px; height: 80px; font-size: 2rem">
													<span v-if="watchedMovies.has(movie.id)" class="text-success">✓</span>
													<span v-else>🎬</span>
												</div>
												<div class="flex-grow-1">
													<h3 :class="['h5 mb-2', watchedMovies.has(movie.id) ? 'text-success' : '']">
														{{ movie.title }}
														<small v-if="watchedMovies.has(movie.id)" class="text-success"> ✓ Watched </small>
													</h3>
													<div class="d-flex align-items-center gap-3 mb-2 small text-muted">
														<span>{{ movie.year }}</span>
														<span>•</span>
														<span>{{ movie.duration }}</span>
														<span>•</span>
														<div class="d-flex align-items-center">
															<span class="text-warning me-1">★</span>
															<span>{{ movie.rating }}</span>
														</div>
													</div>
													<p
														class="text-muted small mb-0"
														style="
															display: -webkit-box;
															line-clamp: 2;
															-webkit-line-clamp: 2;
															-webkit-box-orient: vertical;
															overflow: hidden;
														">
														{{ movie.description }}
													</p>
													<div v-if="currentMovie === movie.id" class="progress mt-3" style="height: 4px">
														<div
															:class="['progress-bar', watchedMovies.has(movie.id) ? 'bg-success' : 'bg-danger']"
															:style="{ width: progress + '%' }"></div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Related Content Sidebar -->
				<div class="col-lg-4">
					<h2 class="h5 mb-3">More Like This</h2>
					<div class="d-flex flex-column gap-3">
						<div
							v-for="item in relatedContent"
							:key="item.id"
							class="card cursor-pointer"
							@click="navigateToContent(item.id)"
							style="cursor: pointer">
							<div class="card-body p-3">
								<div class="d-flex gap-3">
									<img
										:src="item.cover"
										:alt="item.title"
										class="rounded flex-shrink-0"
										style="width: 48px; height: 72px; object-fit: cover" />
									<div class="flex-grow-1 overflow-hidden">
										<h3 class="h6 mb-1 text-truncate">{{ item.title }}</h3>
										<p class="text-muted small mb-1">{{ item.year }} • {{ item.type }}</p>
										<div class="d-flex align-items-center small">
											<span class="text-warning me-1">★</span>
											<span>{{ item.rating }}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const streamingContent = [
	{
		id: 1,
		title: 'Attack on Titan',
		year: 2013,
		type: 'anime',
		description: 'Humanity fights for survival against giant humanoid Titans in this epic dark fantasy series.',
		rating: 9.0,
		genre: ['Action', 'Drama', 'Fantasy'],
		cover: 'https://placehold.co/128x192/1a1a1a/666?text=AOT',
		duration: '24 min',
		seasons: [
			{
				number: 1,
				title: 'Season 1',
				episodes: Array.from({ length: 25 }, (_, i) => ({
					number: i + 1,
					title: `Episode ${i + 1}`,
					duration: '24 min',
					description: `Episode ${i + 1} description...`,
				})),
			},
			{
				number: 2,
				title: 'Season 2',
				episodes: Array.from({ length: 12 }, (_, i) => ({
					number: i + 1,
					title: `Chapter ${i + 1}`,
					duration: '24 min',
					description: `Chapter ${i + 1} description...`,
				})),
			},
		],
	},
	{
		id: 4,
		title: 'Demon Slayer',
		year: 2019,
		type: 'anime',
		description: 'A young boy becomes a demon slayer to avenge his family and cure his sister.',
		rating: 8.9,
		genre: ['Action', 'Adventure', 'Supernatural'],
		cover: 'https://placehold.co/128x192/1a1a1a/666?text=DS',
		duration: '24 min',
		seasons: [
			{
				number: 1,
				title: 'Season 1: Unwavering Resolve Arc',
				episodes: Array.from({ length: 26 }, (_, i) => ({
					number: i + 1,
					title: `Episode ${i + 1}`,
					duration: '24 min',
					description: `Episode ${i + 1} description...`,
				})),
			},
		],
		movies: [
			{
				id: 'movie-1',
				title: 'Demon Slayer: Mugen Train',
				year: 2020,
				duration: '117 min',
				description: 'Tanjiro and his friends board the Mugen Train to investigate demon disappearances.',
				rating: 8.2,
			},
			{
				id: 'movie-2',
				title: 'Demon Slayer: To the Hashira Training',
				year: 2024,
				duration: '104 min',
				description: 'A compilation film covering the Swordsmith Village Arc.',
				rating: 7.8,
			},
		],
	},
];

const relatedContent = [
	{
		id: 5,
		title: 'The Witcher',
		year: 2019,
		type: 'tv',
		cover: 'https://placehold.co/48x72/1a1a1a/666?text=TW',
		rating: 8.2,
	},
	{
		id: 6,
		title: 'Spirited Away',
		year: 2001,
		type: 'movie',
		cover: 'https://placehold.co/48x72/1a1a1a/666?text=SA',
		rating: 9.3,
	},
];

// State
const contentId = ref(4);
const content = computed(() => streamingContent.find((item) => item.id === contentId.value));
const progress = ref(15);
const watchedEpisodes = ref(new Set(['1-1']));
const watchedMovies = ref(new Set());
const currentEpisode = ref({ season: 1, episode: 1 });
const currentMovie = ref(null);
const selectedSeason = ref(1);
const viewMode = ref('grid');
const activeTab = ref('seasons');

// Computed
const currentSeasonData = computed(() => content.value?.seasons?.find((s) => s.number === selectedSeason.value));

const hasMovies = computed(() => content.value?.movies && content.value.movies.length > 0);

const hasSeasons = computed(() => content.value?.seasons && content.value.seasons.length > 0);

// Methods
const handleEpisodeClick = (seasonNumber, episodeNumber) => {
	currentEpisode.value = { season: seasonNumber, episode: episodeNumber };
	currentMovie.value = null;
	const episodeKey = `${seasonNumber}-${episodeNumber}`;
	watchedEpisodes.value.add(episodeKey);
	progress.value = 0;
};

const handleMovieClick = (movieId) => {
	currentMovie.value = movieId;
	currentEpisode.value = { season: 0, episode: 0 };
	watchedMovies.value.add(movieId);
	progress.value = 0;
};

const isEpisodeWatched = (season, episode) => {
	return watchedEpisodes.value.has(`${season}-${episode}`);
};

const isCurrentEpisode = (season, episode) => {
	return !currentMovie.value && currentEpisode.value.season === season && currentEpisode.value.episode === episode;
};

const getEpisodeProgress = (season, episode) => {
	if (isCurrentEpisode(season, episode)) {
		return progress.value;
	}
	return isEpisodeWatched(season, episode) ? 100 : 0;
};

const navigateToContent = (id) => {
	contentId.value = id;
};

watch(progress, (newProgress) => {
	if (newProgress >= 90) {
		if (currentMovie.value) {
			watchedMovies.value.add(currentMovie.value);
		} else if (currentEpisode.value.season > 0) {
			const episodeKey = `${currentEpisode.value.season}-${currentEpisode.value.episode}`;
			watchedEpisodes.value.add(episodeKey);
		}
	}
});
</script>

<style scoped>
.min-vh-100 {
	min-height: 100vh;
}

.cursor-pointer {
	cursor: pointer;
	transition: all 0.2s ease;
}

.cursor-pointer:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.card {
	background-color: rgba(255, 255, 255, 0.05);
	border-color: rgba(255, 255, 255, 0.1);
}

.card:hover {
	background-color: rgba(255, 255, 255, 0.08);
}

.nav-tabs {
	border-bottom-color: rgba(255, 255, 255, 0.1);
}

.nav-tabs .nav-link {
	color: rgba(255, 255, 255, 0.6);
	border: none;
	border-bottom: 2px solid transparent;
}

.nav-tabs .nav-link:hover {
	color: white;
	border-color: transparent;
}

.nav-tabs .nav-link.active {
	color: white;
	background-color: transparent;
	border-color: transparent transparent #dc3545;
}
</style>
