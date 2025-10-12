<template>
	<!-- <input type="number" min="1" step="3" max="4" v-model="contentId" /> -->
	<div v-if="series" class="container-fluid text-white min-vh-100 py-4">
		<!-- Content Information -->
		<div class="container">
			<div class="row g-4">
				<!-- Main Content Info -->
				<div class="col-lg-8">
					<div class="row g-4 mb-4">
						<div class="col-auto">
							<img
								:src="coverURL"
								:alt="series.title"
								class="img-fluid rounded"
								style="width: 128px; height: 192px; object-fit: cover" />
						</div>
						<div class="col">
							<h1 class="display-5 fw-bold mb-3">{{ series.infos.title || series.title }}</h1>

							<div class="d-flex flex-wrap align-items-center gap-3 mb-3">
								<span class="badge bg-secondary">{{ series.infos.startDate }}</span>
								<span class="badge bg-danger">{{ series.tags[0]!.toUpperCase() }}</span>
								<!-- <div class="d-flex align-items-center" v-if="SHOW_RATING">
									<font-awesome-icon :icon="['fas', 'star']" class="text-warning me-1" />
									<span class="fw-medium">{{ content.rating }}</span>
								</div>
								<span class="text-muted">
									<font-awesome-icon :icon="['far', 'clock']" class="me-1" />
									{{ content.duration }}
								</span> -->
							</div>

							<!-- <div v-if="false" class="d-flex flex-wrap gap-2 mb-3">
								<span v-for="genre in content.genre" :key="genre" class="badge border border-secondary text-white">
									{{ genre }}
								</span>
							</div> -->

							<ElongatedText
								class="text-muted mb-4"
								:text="series.infos.description || 'No Description available yet...'"
								:max-length="250"></ElongatedText>
							<!-- <p class="text-muted mb-4">{{ series.infos.description }}</p> -->

							<div class="d-flex gap-3">
								<button class="btn btn-danger">
									<font-awesome-icon :icon="['fas', 'plus']" class="me-2" />
									Add to Watchlist
								</button>
								<!-- <button class="btn btn-outline-light" v-if="SHOW_RATING">
									<font-awesome-icon :icon="['far', 'star']" class="me-2" />
									Rate
								</button> -->
							</div>
						</div>
					</div>

					<!-- Episodes/Movies Section -->
					<div v-if="hasSeasons || hasMovies" class="mb-4">
						<ul class="nav nav-tabs mb-4" role="tablist">
							<li v-if="hasSeasons" class="nav-item" role="presentation">
								<button
									:class="['nav-link', { active: activeTab === 'seasons' }]"
									@click="activeTab = 'seasons'"
									type="button"
									role="tab">
									<font-awesome-icon :icon="['fas', 'tv']" class="me-2" />
									Seasons
								</button>
							</li>
							<li v-if="hasMovies" class="nav-item" role="presentation">
								<button
									:class="['nav-link', { active: activeTab === 'movies' }]"
									@click="activeTab = 'movies'"
									type="button"
									role="tab">
									<font-awesome-icon :icon="['fas', 'film']" class="me-2" />
									Movies ({{ series.movies?.length }})
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
											<option v-for="season in series.seasons" :key="season.UUID" :value="season.UUID">
												Season {{ season.season_IDX }} ({{
													Array.isArray(season.episodes) ? season.episodes.length : season.episodes
												}}
												episodes)
											</option>
										</select>
									</div>

									<div class="btn-group" role="group">
										<button
											type="button"
											:class="['btn', viewMode === 'grid' ? 'btn-danger' : 'btn-outline-secondary']"
											@click="viewMode = 'grid'">
											<font-awesome-icon :icon="['fas', 'list']" />
										</button>
										<button
											type="button"
											:class="['btn', viewMode === 'compact' ? 'btn-danger' : 'btn-outline-secondary']"
											@click="viewMode = 'compact'">
											<font-awesome-icon :icon="['fas', 'grip']" />
										</button>
									</div>
								</div>

								<!-- Grid View -->
								<div v-if="viewMode === 'grid'" class="d-flex flex-column gap-2">
									<div
										v-for="episode in currentDetailedSeasonData?.episodes"
										:key="episode.UUID"
										:class="[
											'card cursor-pointer',
											isEpisodeWatched(episode.UUID) ? 'border-success bg-success bg-opacity-10' : '',
											isCurrentEpisode(episode.UUID) ? 'border-primary border-2' : '',
										]"
										@click="handleEpisodeClick(episode.UUID)"
										style="cursor: pointer">
										<div class="card-body p-3">
											<div class="d-flex align-items-center gap-3">
												<div
													:class="[
														'rounded d-flex align-items-center justify-content-center',
														isEpisodeWatched(episode.UUID) ? 'bg-success bg-opacity-25' : 'bg-secondary',
													]"
													style="width: 64px; height: 40px">
													<font-awesome-icon
														v-if="isEpisodeWatched(episode.UUID)"
														:icon="['fas', 'check']"
														class="text-success" />
													<font-awesome-icon v-else :icon="['fas', 'play']" />
												</div>
												<div class="flex-grow-1">
													<h3 :class="['h6 mb-1', isEpisodeWatched(episode.UUID) ? 'text-success' : '']">
														{{ episode.episode_IDX }}
														<small v-if="isEpisodeWatched(episode.UUID)" class="text-success ms-2">
															<font-awesome-icon :icon="['fas', 'check']" />
															Watched
														</small>
													</h3>
													<p class="text-muted small mb-0">
														<font-awesome-icon :icon="['far', 'clock']" class="me-1" />
														{{ episode.watchableEntitys.map((e) => e.lang).join(', ') }}
													</p>
												</div>
												<div class="progress" style="width: 80px; height: 4px">
													<div
														:class="['progress-bar', isEpisodeWatched(episode.UUID) ? 'bg-success' : 'bg-danger']"
														:style="{ width: getEpisodeProgress(episode.UUID) + '%' }"></div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Compact View -->
								<div v-else class="row row-cols-4 row-cols-sm-6 row-cols-md-8 row-cols-lg-10 row-cols-xl-12 g-1">
									<div v-for="episode in currentDetailedSeasonData?.episodes" :key="episode.UUID" class="col">
										<div
											:class="[
												'card h-100 cursor-pointer',
												isEpisodeWatched(episode.UUID) ? 'border-success bg-success bg-opacity-10' : '',
												isCurrentEpisode(episode.UUID) ? 'border-primary border-2' : '',
											]"
											@click="handleEpisodeClick(episode.UUID)"
											style="cursor: pointer; aspect-ratio: 1">
											<div class="card-body p-1 d-flex flex-column align-items-center justify-content-center">
												<span :class="['small fw-medium', isEpisodeWatched(episode.UUID) ? 'text-success' : '']">
													{{ episode.episode_IDX }}
												</span>
												<font-awesome-icon
													v-if="isEpisodeWatched(episode.UUID)"
													:icon="['fas', 'check']"
													class="text-success mt-1"
													size="xs" />
												<div v-if="isCurrentEpisode(episode.UUID)" class="progress w-100 mt-1" style="height: 2px">
													<div
														:class="['progress-bar', isEpisodeWatched(episode.UUID) ? 'bg-success' : 'bg-danger']"
														:style="{ width: getEpisodeProgress(episode.UUID) + '%' }"></div>
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
										v-for="movie in indexStore.detailedMovies"
										:key="movie.UUID"
										:class="[
											'card cursor-pointer',
											isMovieWatched(movie.UUID) ? 'border-success bg-success bg-opacity-10' : '',
											isCurrentMovie(movie.UUID) ? 'border-primary border-2' : '',
										]"
										@click="handleMovieClick(movie.UUID)"
										style="cursor: pointer">
										<div class="card-body p-4">
											<div class="d-flex gap-3">
												<div
													:class="[
														'rounded d-flex align-items-center justify-content-center flex-shrink-0',
														isMovieWatched(movie.UUID) ? 'bg-success bg-opacity-25' : 'bg-secondary',
													]"
													style="width: 80px; height: 80px">
													<font-awesome-icon
														v-if="isMovieWatched(movie.UUID)"
														:icon="['fas', 'check']"
														class="text-success"
														size="2x" />
													<font-awesome-icon v-else :icon="['fas', 'film']" size="2x" />
												</div>
												<div class="flex-grow-1">
													<h3 :class="['h5 mb-2', isMovieWatched(movie.UUID) ? 'text-success' : '']">
														{{ movie.primaryName }}
														<small v-if="isMovieWatched(movie.UUID)" class="text-success ms-2">
															<font-awesome-icon :icon="['fas', 'check']" />
															Watched
														</small>
													</h3>
													<div class="d-flex align-items-center gap-3 mb-2 small text-muted">
														<span>
															<font-awesome-icon :icon="['far', 'clock']" class="me-1" />
															{{
																movie.watchableEntitys.reduce((prev, curr) => {
																	return prev + curr.runtime;
																}, 0) / movie.watchableEntitys.length
															}}
														</span>
														<span>•</span>
														<span>
															<font-awesome-icon :icon="['fa', 'language']" class="me-1" />
															{{ movie.watchableEntitys.map((e) => e.lang).join(', ') }}
														</span>
														<span>•</span>
													</div>
													<!-- <p
														class="text-muted small mb-0"
														style="
															display: -webkit-box;
															line-clamp: 2;
															-webkit-line-clamp: 2;
															-webkit-box-orient: vertical;
															overflow: hidden;
														">
														{{ movie.description }}
													</p> -->
													<div class="progress mt-3" style="height: 4px">
														<div
															:class="['progress-bar', isMovieWatched(movie.UUID) ? 'bg-success' : 'bg-danger']"
															:style="{ width: getMovieProgress(movie.UUID) + '%' }"></div>
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
					<h2 class="h5 mb-3">
						<font-awesome-icon :icon="['fas', 'heart']" class="me-2 text-danger" />
						More Like This
					</h2>
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
										<p class="text-muted small mb-1">
											<font-awesome-icon :icon="['far', 'calendar']" class="me-1" />
											{{ item.year }} • {{ item.type }}
										</p>
										<!-- <div class="d-flex align-items-center small" v-if="SHOW_RATING">
											<font-awesome-icon :icon="['fas', 'star']" class="text-warning me-1" />
											<span>{{ item.rating }}</span>
										</div> -->
									</div>
									<div class="d-flex align-items-center">
										<font-awesome-icon :icon="['fas', 'chevron-right']" class="text-muted" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<pre>
            activeTab: {{ activeTab }}
            viewMode: {{ viewMode }}
            selectedSeason: {{ selectedSeason }}
            hasSeasons: {{ hasSeasons }}
            hasMovies: {{ hasMovies }}
            currentSeasonData: {{ currentSeasonData }}
            series: {{ series }}
        </pre>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

definePageMeta({
	middleware: 'auth',
	scrollToTop: true,
});

const route = useRoute();
const authStore = useAuthStore();
const indexStore = useIndexStore();

const series = computed(() => indexStore.series.find((s) => s.UUID === route.params.SID));

await callOnce('loadSeriesInfo', async () => await indexStore.loadDetailedSeasonInfo(route.params.SID as string));

const coverURL = computed(() => {
	// const CURRENT_EXTERNAL_API = 'http://localhost:3000';
	const url = new URL('https://cinema-api.jodu555.de' + `/images/${series.value!.UUID}/cover.jpg`);

	url.searchParams.append('auth-token', 'SECR-DEV');

	return url.href;
});

const hasSeasons = computed(() => series.value?.seasons && series.value.seasons.length > 0);

const hasMovies = computed(() => series.value?.movies && series.value.movies.length > 0);

// const currentSeasonData = ref<Episode[]>([]);
const currentSeasonData = computed(() => {
	const eps = series.value?.seasons.find((s) => s.UUID === selectedSeason.value)?.episodes;

	return (eps as any as Episode[]) || [];
});

const currentDetailedSeasonData = computed(() => {
	return indexStore.detailedSeasons.find((s) => s.UUID === selectedSeason.value);
});

const selectedSeason = ref(series.value?.seasons?.[0]?.UUID || '');

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

useSeoMeta({
	title: computed(() => series.value?.title || ''),
	description: computed(() => series.value?.infos.description || ''),
	ogImage: computed(() => coverURL.value),
	ogType: 'video.tv_show',
	twitterCard: 'player',
	twitterTitle: computed(() => series.value?.title || ''),
	twitterDescription: computed(() => series.value?.infos.description || ''),
});

const viewMode = ref('grid');

type Tab = 'seasons' | 'movies' | 'nothing';
const activeTab = ref<Tab>(hasSeasons.value ? 'seasons' : hasMovies.value ? 'movies' : 'nothing');

// Methods

const currentMovieUUID = ref<string | null>(null);
const currentEpisodeUUID = ref<string | null>(null);

const handleEpisodeClick = (episodeUUID: string) => {
	currentEpisodeUUID.value = episodeUUID;
	currentMovieUUID.value = null;
};
const isCurrentEpisode = (episodeUUID: string) => {
	return currentEpisodeUUID.value === episodeUUID;
};

const isEpisodeWatched = (episodeUUID: string) => {
	return false;
};
const getEpisodeProgress = (episodeUUID: string) => {
	return 0;
};

const handleMovieClick = (movieUUID: string) => {
	currentMovieUUID.value = movieUUID;
	currentEpisodeUUID.value = null;
};
const isCurrentMovie = (movieUUID: string) => {
	return currentMovieUUID.value === movieUUID;
};

const isMovieWatched = (movieUUID: string) => {
	return false;
};
const getMovieProgress = (movieUUID: string) => {
	// if (isCurrentMovie(movieUUID)) {
	// 	return progress.value;
	// }
	// return isMovieWatched(movieUUID) ? 100 : 0;
	return 0;
};

const navigateToContent = (id: number) => {
	// contentId.value = id;
};

// watch(progress, (newProgress) => {
// 	// if (newProgress >= 90) {
// 	// 	if (currentMovie.value) {
// 	// 		watchedMovies.value.add(currentMovie.value);
// 	// 	} else if (currentEpisode.value.season > 0) {
// 	// 		const episodeKey = `${currentEpisode.value.season}-${currentEpisode.value.episode}`;
// 	// 		watchedEpisodes.value.add(episodeKey);
// 	// 	}
// 	// }
// });
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
	/* box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); */
}

.card:hover {
	background-color: rgba(255, 255, 255, 0.08);
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
