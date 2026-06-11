<template>
	<div>
		<pre v-if="authStore.loggedIn && authStore.user.settings.developerMode.value">
		{{ indexStore.selectedWatchableEntity }}
		</pre
		>
		<div v-if="authStore.loggedIn">
			<EntityActionsInformation v-if="showVideo" class="container" :switch-to="switchTo" :change-language="changeLanguage" />
			<div v-auto-animate v-if="showLatestWatchButton" class="text-center mb-2">
				<button @click="skipToLatestTime" class="btn btn-outline-info">Jump to Latest watch position!</button>
			</div>
		</div>
		<ClientOnly>
			<div v-if="showVideo">
				<div v-if="authStore.loggedIn && authStore.user.settings.developerMode.value" class="d-flex justify-content-center mt-2 mb-4">
					<div class="form-check form-switch">
						<input class="form-check-input" type="checkbox" role="switch" id="videoDebug" v-model="videoDebug" />
						<label class="form-check-label" for="videoDebug">Video Debug</label>
					</div>
				</div>
				<ExtendedVideo
					v-if="authStore.loggedIn"
					:videoSrc="videoSrc"
					:switch-to="switchTo"
					:can-play="true"
					:events="{}"
					:send-video-time-update="sendVideoTimeUpdate"
				/>
				<div v-else class="text-center">
					<h2 class="text-danger">You need to be logged in to watch this video</h2>
					<NuxtLink type="button" to="/login" class="mt-3 mb-4 btn btn-outline-primary btn-lg">Login</NuxtLink>
				</div>
			</div>
		</ClientOnly>
		<div v-if="series" class="container-fluid text-white min-vh-100 py-4">
			<!-- Content Information -->
			<div class="container">
				<div class="row g-4">
					<!-- Main Content Info -->
					<div class="col-xl-9">
						<!-- Series Info -->
						<SeriesInfo :series="series" :coverURL="coverURL" />
						<!-- Episodes/Movies Section -->
						<div v-if="(hasSeasons || hasMovies) && !isDisabled" class="mb-4">
							<pre v-if="authStore.loggedIn && authStore.user?.settings?.developerMode?.value">
								{{ { activeTab, hasSeasons, hasMovies } }}
							</pre
							>
							<div class="d-flex justify-content-center">
								<ul class="nav nav-tabs mb-4" role="tablist">
									<li v-if="hasSeasons" class="nav-item" role="presentation">
										<button :class="['nav-link', { active: activeTab === 'seasons' }]" @click="activeTab = 'seasons'" type="button" role="tab">
											<font-awesome-icon :icon="['fas', 'tv']" class="me-2 px-1" />
											Seasons ({{ series.seasons?.length }})
										</button>
									</li>
									<li v-if="hasMovies" class="nav-item" role="presentation">
										<button :class="['nav-link', { active: activeTab === 'movies' }]" @click="activeTab = 'movies'" type="button" role="tab">
											<font-awesome-icon :icon="['fas', 'film']" class="me-2 px-1" />
											Movies ({{ series.movies?.length }})
										</button>
									</li>
								</ul>
							</div>

							<div class="tab-content">
								<!-- Seasons Tab -->
								<div v-if="activeTab === 'seasons' && hasSeasons" class="tab-pane fade show active">
									<div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
										<!-- Change Season -->
										<div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
											<h2 class="h5 mb-0">Episodes</h2>
											<select v-model="selectedSeason" class="form-select" style="width: auto" aria-label="Change Seasons">
												<option v-for="season in series.seasons" :key="season.UUID" :value="season.UUID">
													Season {{ season.season_IDX }} ({{ Array.isArray(season.episodes) ? season.episodes.length : season.episodes }}
													episodes)
												</option>
											</select>
										</div>
										<!-- Change View Mode / Mark Season Dropdown -->
										<div class="d-flex align-items-center gap-2 w-100 justify-content-center justify-content-sm-end">
											<!-- Mark Season Dropdown -->
											<div class="dropdown flex-shrink-0 me-2" v-if="authStore.loggedIn">
												<button
													class="btn btn-outline-secondary dropdown-toggle bg-transparent"
													type="button"
													data-bs-toggle="dropdown"
													aria-expanded="false"
												>
													<font-awesome-icon :icon="['fas', 'check']" class="me-2" />
													Mark Season
												</button>
												<ul class="dropdown-menu dropdown-menu-end">
													<li>
														<button class="dropdown-item d-flex align-items-center" type="button" @click="handleMarkSeasonWatched(true)">
															<font-awesome-icon :icon="['fas', 'check']" class="me-2 text-success" />
															Mark as Watched
														</button>
													</li>
													<li>
														<button class="dropdown-item d-flex align-items-center" type="button" @click="handleMarkSeasonWatched(false)">
															<font-awesome-icon :icon="['fas', 'xmark']" class="me-2 text-secondary" />
															Mark as Unwatched
														</button>
													</li>
												</ul>
											</div>

											<!-- Change View Mode-->
											<div class="btn-group" role="group">
												<button
													type="button"
													:class="['btn', viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary']"
													@click="viewMode = 'list'"
													title="List View"
												>
													<font-awesome-icon :icon="['fas', 'list']" />
												</button>
												<button
													type="button"
													:class="['btn', viewMode === 'compact' ? 'btn-primary' : 'btn-outline-secondary']"
													@click="viewMode = 'compact'"
													title="Compact View"
												>
													<font-awesome-icon :icon="['fas', 'grip']" />
												</button>
											</div>
										</div>
									</div>

									<!-- List View -->
									<div v-if="viewMode === 'list'" class="d-flex flex-column gap-2">
										<!-- TODO: Move this to a separate component called: EpisodeListViewCard.vue -->
										<div
											v-for="episode in currentDetailedSeasonData?.episodes"
											:key="episode.UUID"
											:class="[
												'card cursor-pointer',
												isEpisodeWatched(episode.UUID) && !isCurrentEpisode(episode.UUID) ? 'border-success' : '',
												isEpisodeWatched(episode.UUID) ? 'bg-success bg-opacity-10' : '',
												isCurrentEpisode(episode.UUID) ? 'border-primary border-2' : '',
											]"
											@click="handleEpisodeClick(episode.UUID)"
											style="cursor: pointer"
										>
											<div class="card-body p-3">
												<div class="d-flex">
													<div class="flex-grow-1">
														<div class="d-flex align-items-center gap-3">
															<div
																:class="[
																	'rounded d-flex align-items-center justify-content-center',
																	isEpisodeWatched(episode.UUID) ? 'bg-success bg-opacity-25' : 'bg-secondary',
																]"
																style="width: 64px; height: 40px"
															>
																<font-awesome-icon v-if="isEpisodeWatched(episode.UUID)" :icon="['fas', 'check']" class="text-success" />
																<font-awesome-icon v-else :icon="['fas', 'play']" />
															</div>
															<div class="flex-grow-1">
																<h3 :class="['h6 mb-1', isEpisodeWatched(episode.UUID) ? 'text-success' : '']">
																	Episode {{ episode.episode_IDX }}
																	<small v-if="isEpisodeWatched(episode.UUID)" class="text-success ms-2">
																		<font-awesome-icon :icon="['fas', 'check']" />
																		Watched
																	</small>
																</h3>
																<div class="d-flex gap-4">
																	<p class="text-muted small mb-0">
																		<font-awesome-icon :icon="['far', 'clock']" class="me-1" />
																		<!-- 20min -->
																		{{ msToReadable(averageWatchableEntitysRuntime(episode.watchableEntitys)) }}
																	</p>
																</div>
																<p class="text-muted small mb-0">
																	<font-awesome-icon :icon="['fa', 'language']" class="me-1" />
																	{{ episode.watchableEntitys.map((e) => e.lang).join(', ') }}
																	<small class="text-danger-emphasis" v-if="Array.isArray(additionalList) && additionalList.length > 0">
																		{{
																			additionalList
																				?.filter((x) => x.parsed.season === episode.season_IDX && x.parsed.episode === episode.episode_IDX)
																				.map((x) => x.parsed.language)
																				.join(', ')
																		}}
																	</small>
																</p>
																<div v-if="authStore.loggedIn && authStore.user.settings.developerMode.value" class="text-muted small mb-0">
																	<div class="small mb-0 row">
																		<p class="mb-1 mt-1 col-4" v-for="entity in episode.watchableEntitys">
																			{{ entity.UUID }} ({{ entity.subID }}) [{{ entity.lang }}] = {{ entity.runtime }}
																		</p>
																		<div class="col-12 d-flex gap-3">
																			<p class="mb-0">
																				{{ episode.UUID }}
																			</p>
																			<p class="mb-0">{{ episode.season_IDX }}x{{ episode.episode_IDX }}</p>
																			<p class="mb-0">
																				WH:&nbsp;
																				{{
																					indexStore.watchHistory
																						.filter((w) => w.watchable_UUID === episode.UUID)
																						.map((w) => `${w.UUID} = ${w.watchTime}`)
																						.join(', ')
																				}}
																			</p>
																		</div>
																	</div>
																</div>
															</div>
														</div>
														<div class="progress mt-3" style="width: 100%; height: 4px">
															<div
																:class="['progress-bar', isEpisodeWatched(episode.UUID) ? 'bg-success' : 'bg-secondary']"
																:style="{ width: getEpisodeProgress(episode.UUID) + '%' }"
															></div>
														</div>
													</div>
												</div>
											</div>
										</div>

										<!-- additionalList -->
										<div
											v-if="Array.isArray(additionalList) && additionalList.length > 0"
											v-for="additionals in additionalList.filter(
												(x) =>
													x.parsed.season === currentDetailedSeasonData?.season_IDX &&
													!currentDetailedSeasonData?.episodes.some((e) => e.episode_IDX == x.parsed.episode),
											)"
											class="card cursor-disabled border-danger-subtle"
										>
											<div class="card-body p-3">
												<div class="d-flex">
													<div class="flex-grow-1">
														<div class="d-flex align-items-center gap-3">
															<div
																:class="['rounded d-flex align-items-center justify-content-center', 'bg-secondary']"
																style="width: 64px; height: 40px"
															>
																<font-awesome-icon :icon="['fas', 'xmark']" class="text-danger-emphasis" />
															</div>
															<div class="flex-grow-1">
																<h3 :class="['h6 mb-1', 'text-danger']">Episode {{ additionals.parsed.episode }}</h3>
																<div class="d-flex gap-4">
																	<p class="small mb-0 text-danger-emphasis">Episode Missing</p>
																</div>
																<p class="text-muted small mb-0">
																	<font-awesome-icon :icon="['fa', 'language']" class="me-1" />
																	{{ additionals.parsed.language }}
																</p>
															</div>
														</div>
														<div class="progress mt-3" style="width: 100%; height: 4px">
															<div :class="['progress-bar', 'bg-danger']" :style="{ width: '0%' }"></div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>

									<!-- Compact View -->
									<div v-else class="row row-cols-4 row-cols-sm-6 row-cols-md-8 row-cols-lg-10 row-cols-xl-12 g-2">
										<div v-for="episode in currentDetailedSeasonData?.episodes" :key="episode.UUID" class="col">
											<div
												:class="[
													'card cursor-pointer',
													isEpisodeWatched(episode.UUID) && !isCurrentEpisode(episode.UUID) ? 'border-success' : '',
													isEpisodeWatched(episode.UUID) ? 'bg-success bg-opacity-10' : '',
													isCurrentEpisode(episode.UUID) ? 'border-primary border-2' : '',
												]"
												@click="handleEpisodeClick(episode.UUID)"
												style="cursor: pointer; height: 100%; max-height: 100%"
											>
												<div class="card-body p-1 d-flex flex-column align-items-center justify-content-center h-100 mb-2 pb-2">
													<span :class="['h5', isEpisodeWatched(episode.UUID) ? 'text-success' : '']">
														{{ episode.episode_IDX }}
													</span>
													<font-awesome-icon v-if="isEpisodeWatched(episode.UUID)" :icon="['fas', 'check']" class="text-success mt-1" size="xs" />
													<div class="progress w-100 mt-2" style="height: 2px">
														<div
															:class="['progress-bar', isEpisodeWatched(episode.UUID) ? 'bg-success' : 'bg-secondary']"
															:style="{ width: getEpisodeProgress(episode.UUID) + '%' }"
														></div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Movies Tab -->
								<div v-if="activeTab === 'movies' && hasMovies" class="tab-pane fade show active">
									<!-- Mark Movies Dropdown -->
									<div class="d-flex flex-column flex-md-row justify-content-end align-items-start align-items-md-center gap-3 mb-4">
										<div class="dropdown flex-shrink-0" v-if="authStore.loggedIn">
											<button
												class="btn btn-outline-secondary dropdown-toggle bg-transparent"
												type="button"
												data-bs-toggle="dropdown"
												aria-expanded="false"
											>
												<font-awesome-icon :icon="['fas', 'check']" class="me-2" />
												Mark Movies
											</button>
											<ul class="dropdown-menu dropdown-menu-end">
												<li>
													<button class="dropdown-item d-flex align-items-center" type="button" @click="handleMarkMoviesWatched(true)">
														<font-awesome-icon :icon="['fas', 'check']" class="me-2 text-success" />
														Mark (all) as Watched
													</button>
													<button
														class="dropdown-item d-flex align-items-center"
														type="button"
														:disabled="currentMovieUUID == null"
														@click="handleMarkMovieWatched(true, currentMovieUUID!)"
													>
														<font-awesome-icon :icon="['fas', 'check']" class="me-2 text-success" />
														Mark (current) as Watched
													</button>
												</li>
												<li>
													<button class="dropdown-item d-flex align-items-center" type="button" @click="handleMarkMoviesWatched(false)">
														<font-awesome-icon :icon="['fas', 'xmark']" class="me-2 text-secondary" />
														Mark (all) as Unwatched
													</button>
													<button
														class="dropdown-item d-flex align-items-center"
														:disabled="currentMovieUUID == null"
														type="button"
														@click="handleMarkMovieWatched(false, currentMovieUUID!)"
													>
														<font-awesome-icon :icon="['fas', 'xmark']" class="me-2 text-secondary" />
														Mark (current) as Unwatched
													</button>
												</li>
											</ul>
										</div>
									</div>
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
											style="cursor: pointer"
										>
											<div class="card-body p-4">
												<div class="d-flex gap-3">
													<div
														:class="[
															'rounded d-flex align-items-center justify-content-center flex-shrink-0',
															isMovieWatched(movie.UUID) ? 'bg-success bg-opacity-25' : 'bg-secondary',
														]"
														style="width: 80px; height: 80px"
													>
														<font-awesome-icon v-if="isMovieWatched(movie.UUID)" :icon="['fas', 'check']" class="text-success" size="2x" />
														<font-awesome-icon v-else :icon="['fas', 'film']" size="2x" />
													</div>
													<div class="flex-grow-1">
														<h3 :class="['h5 mb-2', isMovieWatched(movie.UUID) ? 'text-success' : '']">
															{{ movie.primaryName }}
															<!-- <small v-if="isMovieWatched(movie.UUID)" class="text-success ms-2">
																<font-awesome-icon :icon="['fas', 'check']" />
																Watched
															</small> -->
														</h3>
														<div class="d-flex align-items-center gap-3 mb-2 small text-muted">
															<span>
																<font-awesome-icon :icon="['far', 'clock']" class="me-1" />
																{{ msToReadable(averageWatchableEntitysRuntime(movie.watchableEntitys)) }}
															</span>
															<span>•</span>
															<span>
																<font-awesome-icon :icon="['fa', 'language']" class="me-1" />
																{{ movie.watchableEntitys.map((e) => e.lang).join(', ') }}
															</span>
															<!-- <span>•</span> -->
														</div>
														<!-- <p
															class="text-muted small mb-0"
															style="display: -webkit-box; line-clamp: 2; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden"
														>
															{{ movie.description }}
														</p> -->
														<div v-if="authStore.loggedIn && authStore.user.settings.developerMode.value" class="text-muted small mb-0">
															<div class="d-flex gap-2">
																<p class="mb-0">
																	{{ movie.watchableEntitys.map((e) => e.subID).join(', ') }}
																</p>
																<p class="mb-0">
																	{{ movie.watchableEntitys.map((e) => e.UUID).join(', ') }}
																</p>
																<p class="mb-0">
																	{{ movie.UUID }}
																</p>
																<p class="mb-0">x{{ movie.movie_IDX }}</p>
															</div>
														</div>
														<div class="progress mt-3" style="height: 4px">
															<div
																:class="['progress-bar', isMovieWatched(movie.UUID) ? 'bg-success' : 'bg-secondary']"
																:style="{ width: getMovieProgress(movie.UUID) + '%' }"
															></div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
						<!-- TODO: Technically a series is not completely disabled if it has a WE that is on the wrong SubID so in the future we will add a check here -->
						<div class="text-center" v-if="isDisabled">
							<h2 class="text-danger">It Seems there is currently no video data for this Series</h2>
							<p class="text-danger mb-0">It either got removed, or is on a node which is currently un reachable, or is currently being transcoded</p>
							<p class="text-danger">Please check back later and if this issue persists please contact the Administrator</p>
							<NuxtLink type="button" to="/" class="mt-3 mb-4 btn btn-outline-primary btn-lg">Go Watch something else</NuxtLink>
						</div>
					</div>

					<!-- Related Content Sidebar -->
					<div v-if="authStore.loggedIn" class="col-xl-3">
						<h2 class="h5 mb-3">
							<font-awesome-icon :icon="['fas', 'heart']" class="me-2 text-danger" />
							{{ dynamicRelatedContentPlaylist.length > 0 ? 'From the Playlist' : 'More Like This' }}
						</h2>
						<div class="d-flex flex-column gap-3">
							<NuxtLink
								v-for="(item, idx) in dynamicPopulatedContent"
								:key="item.UUID"
								class="card cursor-pointer"
								:class="{
									'border-success': item.UUID === route.params.SID,
								}"
								:to="`/watch/${item.UUID}${route.query.playlist ? `?playlist=${route.query.playlist}` : ''}`"
								style="cursor: pointer; text-decoration: none"
								prefetch-on="interaction"
								@mouseover="indexStore.prefetchSeries(item.UUID)"
							>
								<div class="card-body p-3">
									<div class="d-flex gap-3">
										<img
											:src="decideSeriesImage(item, randomNumbersSeriesCover.at(idx + 1))"
											:alt="item.title"
											class="rounded flex-shrink-0"
											style="width: 48px; height: 72px; object-fit: cover"
										/>
										<div class="flex-grow-1 overflow-hidden">
											<h3 class="h6 mb-1 text-truncate">{{ item.title }}</h3>
											<p class="text-muted small mb-1">
												<font-awesome-icon :icon="['far', 'calendar']" class="me-1" />
												{{ item.infos.startDate }} • {{ item.tags[0] }}
											</p>
											<div class="d-flex align-items-center small mt-2">
												<!-- <font-awesome-icon :icon="['fas', 'star']" class="text-warning me-1" />
												<span>{{ 5 }}</span> -->
												<span class="badge bg-secondary me-2" v-for="(tag, idx) in series.tags.slice(1, 5)" :key="idx">
													{{ idx == 0 ? tag.toLowerCase() : tag }}
												</span>
											</div>
										</div>
										<div class="d-flex align-items-center">
											<font-awesome-icon :icon="['fas', 'chevron-right']" class="text-muted" />
										</div>
									</div>
								</div>
							</NuxtLink>
						</div>
					</div>
				</div>
			</div>
			<!-- Developer Debug Infos -->
			<div v-if="authStore.loggedIn">
				<pre v-if="authStore.user.settings.developerMode.value">
				selectedWatchableEntity: {{ indexStore.selectedWatchableEntity }}
				selectedEntity: {{ indexStore.selectedEntity }}
				</pre
				>
				<pre v-if="authStore.user.settings.developerMode.value">
				activeTab: {{ activeTab }}
				viewMode: {{ viewMode }}
				showVideo: {{ showVideo }}
				videoSrc: {{ videoSrc }}
				selectedSeason: {{ selectedSeason }}
				hasSeasons: {{ hasSeasons }}
				hasMovies: {{ hasMovies }}
				currentDetailedSeasonData: {{ currentDetailedSeasonData }}
				series: {{ series }}
			</pre
				>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { averageWatchableEntitysRuntime } from '#imports';
import { Role, type DetailedEpisode, type DetailedSeason, type Langs } from '@cinefinn/types';
import { msToReadable } from '@cinefinn/utilities/time';
import { ref, computed, watch } from 'vue';
import AddToPlaylistDialog from '~/components/AddToPlaylistDialog.vue';
import ExtendedVideo from '~/components/ExtendedVideo.vue';

const { decideSeriesImage } = useSeriesImage();

definePageMeta({
	middleware: 'may-auth',
	scrollToTop: true,
});

const route = useRoute();
const authStore = useAuthStore();
const indexStore = useIndexStore();
const playlistStore = usePlaylistStore();

//This reliably works evene when spaming the page transitions
if (authStore.loggedIn) {
	await Promise.all([indexStore.loadDetailedSeasonInfo(route.params.SID as string), indexStore.loadWatchHistory(route.params.SID as string)]);
} else {
	await indexStore.loadDetailedSeasonInfo(route.params.SID as string);
}

//This has some race conditions i dont know how to fix
// if (authStore.loggedIn) {
// 	await Promise.all([
// 		callOnce('loadSeriesInfo', async () => await indexStore.loadDetailedSeasonInfo(route.params.SID as string), { mode: 'navigation' }),
// 		callOnce('loadWatchHistory', async () => await indexStore.loadWatchHistory(route.params.SID as string), { mode: 'navigation' }),
// 	]);
// } else {
// 	await Promise.all([
// 		callOnce('loadSeriesInfo', async () => await indexStore.loadDetailedSeasonInfo(route.params.SID as string), { mode: 'navigation' }),
// 	]);
// }

const series = computed(() => indexStore.seriesById.get(route.params.SID as string));

const coverURL = computed(() => {
	return decideSeriesImage(series.value!, randomNumber.value);
});

const sendVideoTimeUpdate = async (time: number) => {
	if (time == undefined) return;
	console.log('Sending time update to server', time);
	// useAxios().post(`/watch/updateTime/${currentEpisodeUUID.value}/${time}`, {});

	useSocket().emit('updateTime', {
		watchableUUID: indexStore.selectedWatchableEntity?.UUID!,
		time,
	});

	// await $fetch(`${useAPIURL()}/watch/updateTime/${indexStore.selectedWatchableEntity?.UUID.replace('#', '-')}/${time}`);
};

const randomNumber = useState('randomNumber' + series.value!.UUID, () => Math.floor(Math.random() * 1000));

const hasSeasons = computed(() => series.value?.seasons && series.value.seasons.length > 0);

const hasMovies = computed(() => series.value?.movies && series.value.movies.length > 0);

//Check the frontendSeries and the Detailed Series for is disabled cause sometimes the caching is a little weird
const isDisabled = computed(() => series.value?.infos.disabled || indexStore.detailedSerie?.infos.disabled);

const currentDetailedSeasonData = computed(() => {
	return indexStore.detailedSeasons.find((s) => s.UUID === selectedSeason.value);
});

const currentMovieUUID = ref<string | null>((route.query.movie as string) || null);
const currentEpisodeUUID = ref<string | null>((route.query.episode as string) || null);

indexStore.setSelectedWatchableEntityUUID(currentEpisodeUUID.value || currentMovieUUID.value);

const selectedSeason = ref((indexStore.selectedEntity as DetailedEpisode)?.season_UUID || series.value?.seasons?.[0]?.UUID || '');

useSeoMeta({
	title: computed(() => series.value?.title || ''),
	ogTitle: computed(() => series.value?.title || ''),
	description: computed(() => series.value?.infos.description || ''),
	ogDescription: computed(() => series.value?.infos.description || ''),
	ogImage: computed(() => coverURL.value),
	ogType: 'video.tv_show',
	twitterCard: 'player',
	twitterTitle: computed(() => series.value?.title || ''),
	twitterDescription: computed(() => series.value?.infos.description || ''),
	twitterImage: computed(() => coverURL.value),
});

let initialViewMode = route.query.viewMode;

if (initialViewMode == undefined || typeof initialViewMode !== 'string') {
	initialViewMode = 'list';
}
if (initialViewMode !== 'list' && initialViewMode !== 'compact') {
	initialViewMode = 'list';
}

const viewMode = ref<'list' | 'compact'>(initialViewMode as 'list' | 'compact');

watch(viewMode, (newValue) => {
	useRouter().push({ query: { ...route.query, viewMode: newValue } });
});

type Tab = 'seasons' | 'movies' | 'nothing';

let initialTab: Tab = 'nothing';
if (hasMovies.value) initialTab = 'movies';
if (hasSeasons.value) initialTab = 'seasons';

if (currentMovieUUID.value) initialTab = 'movies';
if (currentEpisodeUUID.value) initialTab = 'seasons';

const activeTab = ref<Tab>(initialTab);

const showVideo = computed(() => {
	return indexStore.selectedWatchableEntity !== null && !isDisabled.value;
	// return currentMovieUUID.value !== null || currentEpisodeUUID.value !== null;
});

const videoDebug = ref(false);

const videoSrc = computed(() => {
	if (series.value === undefined) return '';

	const oldVideoAPI = false;

	if (oldVideoAPI) {
		const BASE_URL = 'https://cinema-api.jodu555.de/video?auth-token=SECR-DEV';

		if (currentMovieUUID.value !== null) {
			const movie = indexStore.detailedMovies.find((m) => m.UUID === currentMovieUUID.value);
			if (movie === undefined) return '';
			return `${BASE_URL}&series=${series.value.UUID}&language=EngDub&movie=${movie.movie_IDX}`;
		}
		if (currentEpisodeUUID.value !== null) {
			if (currentDetailedSeasonData.value === undefined) return '';
			const episode = currentDetailedSeasonData.value.episodes.find((e) => e.UUID === currentEpisodeUUID.value);
			if (episode === undefined) return '';
			return `${BASE_URL}&series=${series.value.UUID}&language=EngDub&season=${episode.season_IDX}&episode=${episode.episode_IDX}`;
		}
	}

	if (!oldVideoAPI) {
		let url = `${useAPIURL()}/video/`;
		url += `${indexStore.selectedWatchableEntity?.UUID}`;
		url += `?auth-token=${authStore.authToken}&subsystem=${indexStore.selectedWatchableEntity?.subID}&debug=${videoDebug.value}`;
		return url;
	}
	return '';
});

const forceHideLatestWatchButton = ref('');

const showLatestWatchButton = computed(() => {
	if (authStore.loggedIn == false) return false;
	if (authStore.user.settings.showLatestWatchButton.value == false) return false;
	if (forceHideLatestWatchButton.value == indexStore.selectedWatchableEntity?.watchable_UUID) return false;

	const watchHistorySegment = indexStore.watchHistory.find((w) => w.watchable_UUID === indexStore.selectedWatchableEntity?.watchable_UUID);
	return watchHistorySegment !== undefined;
});

const skipToLatestTime = () => {
	const watchHistorySegment = indexStore.watchHistory.find((w) => w.watchable_UUID === indexStore.selectedWatchableEntity?.watchable_UUID);

	const video = document.querySelector('video');
	if (video && watchHistorySegment) {
		video.currentTime = watchHistorySegment.watchTime;
		forceHideLatestWatchButton.value = indexStore.selectedWatchableEntity!.watchable_UUID;
	}
};

/**
 *
 * @param interEpisodeUpdate This specified if the currTime should be saved. For when it is only a lang change then this needs to be true
 */
const videoKeepState = (interEpisodeUpdate: boolean = false) => {
	const videoElement = document.querySelector('video');
	let previouslyPaused = false;
	let previouslyMuted = false;
	let previouslyTime = 0;
	if (videoElement) {
		previouslyPaused = videoElement.paused;
		previouslyMuted = videoElement.muted;
		if (interEpisodeUpdate == true) {
			previouslyTime = videoElement.currentTime;
		}
	}

	return {
		apply: () => {
			return new Promise<HTMLVideoElement>((resolve, reject) => {
				let timeout: NodeJS.Timeout | undefined;
				const inter = setInterval(() => {
					const interVideoElement = document.querySelector('video');
					if (interVideoElement) {
						console.log('interVideoElement', interVideoElement.readyState);
						if (interVideoElement.readyState >= 3) {
							if (!previouslyPaused) {
								interVideoElement.play();
							}
							interVideoElement.muted = previouslyMuted;
							if (interEpisodeUpdate == true) {
								interVideoElement.currentTime = previouslyTime;
							}
							clearInterval(inter);
							if (timeout) clearTimeout(timeout);
							resolve(interVideoElement);
						}
					}
				}, 100);
				timeout = setTimeout(() => {
					console.log('videoKeepState timeout reached');

					clearInterval(inter);
					const interVideoElement = document.querySelector('video');
					if (interVideoElement && !previouslyPaused) {
						interVideoElement.play();
					}
					umTrackEvent('videoKeepState_timeout', {
						previouslyPaused,
						readyState: interVideoElement?.readyState,
						paused: interVideoElement?.paused,
						route: useRoute().fullPath,
					});
					reject(null);
				}, 1000 * 30);
			});
		},
	};
};

function isElementInViewport(element: HTMLElement) {
	const rect = element.getBoundingClientRect();

	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) /* or $(window).height() */ &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
	);
}

function actualScrollIntoView(element: HTMLElement) {
	if (!element) return;

	addEventListener(
		'scrollend',
		(evt) => {
			if (isElementInViewport(element)) return;
			element.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
			actualScrollIntoView(element);
		},
		{ once: true },
	);
	element.scrollIntoView({
		behavior: 'smooth',
		block: 'center',
	});
}

const handleEpisodeClick = async (episodeUUID: string) => {
	const router = useRouter();
	const prevQuery = JSON.parse(JSON.stringify(route.query));
	delete prevQuery.movie;
	delete prevQuery.episode;

	if (currentEpisodeUUID.value === episodeUUID) {
		currentEpisodeUUID.value = null;
		indexStore.setSelectedWatchableEntityUUID(null);
		await router.push({ path: `/watch/${series.value!.UUID}`, query: { ...prevQuery } });
		return;
	}

	const { apply } = videoKeepState();

	currentEpisodeUUID.value = episodeUUID;
	currentMovieUUID.value = null;
	indexStore.setSelectedWatchableEntityUUID(episodeUUID);

	await router.push({ path: `/watch/${series.value!.UUID}`, query: { episode: episodeUUID, ...prevQuery } });
	const { error, data: videoElem } = await tryCatch(() => apply());
	if (error) {
		console.log(error);
		return;
	}
	actualScrollIntoView(videoElem);
};
const isCurrentEpisode = (episodeUUID: string) => {
	return currentEpisodeUUID.value === episodeUUID;
};

const handleMovieClick = async (movieUUID: string) => {
	const router = useRouter();
	const prevQuery = JSON.parse(JSON.stringify(route.query));
	delete prevQuery.movie;
	delete prevQuery.episode;
	if (currentMovieUUID.value === movieUUID) {
		currentMovieUUID.value = null;
		indexStore.setSelectedWatchableEntityUUID(null);
		await router.push({ path: `/watch/${series.value!.UUID}`, query: { ...prevQuery } });
		return;
	}
	const { apply } = videoKeepState();

	currentMovieUUID.value = movieUUID;
	currentEpisodeUUID.value = null;
	indexStore.setSelectedWatchableEntityUUID(movieUUID);

	await router.push({ path: `/watch/${series.value!.UUID}`, query: { movie: movieUUID, ...prevQuery } });
	const { error, data: videoElem } = await tryCatch(() => apply());
	if (error) {
		console.log(error);
		return;
	}
	actualScrollIntoView(videoElem);
};
const isCurrentMovie = (movieUUID: string) => {
	return currentMovieUUID.value === movieUUID;
};

const isEpisodeWatched = (episodeUUID: string) => {
	return getEpisodeProgress(episodeUUID) > 90;
};
const getEpisodeProgress = (episodeUUID: string) => {
	const watchHistory = indexStore.watchHistory.find((w) => w.watchable_UUID === episodeUUID);
	if (watchHistory == undefined) {
		return 0;
	}
	const episode = currentDetailedSeasonData.value?.episodes.find((e) => e.UUID === episodeUUID);
	if (episode == undefined) {
		return 0;
	}
	const totalRuntime = averageWatchableEntitysRuntime(episode.watchableEntitys, true);
	// const totalRuntime = episode.watchableEntitys.reduce((prev, curr) => prev + curr.runtime, 0) / episode.watchableEntitys.length;
	if (totalRuntime === -1 && watchHistory.watchTime >= 500) {
		return 95;
	}

	const watchTime = Math.max(0, Math.min(watchHistory.watchTime, totalRuntime));
	const percent = (watchTime / totalRuntime) * 100;
	return percent;
};

const isMovieWatched = (movieUUID: string) => {
	return getMovieProgress(movieUUID) > 90;
};

const getMovieProgress = (movieUUID: string) => {
	const watchHistory = indexStore.watchHistory.find((w) => w.watchable_UUID === movieUUID);
	if (watchHistory == undefined) {
		return 0;
	}
	const movie = indexStore.detailedMovies.find((m) => m.UUID === movieUUID);
	if (movie == undefined) {
		return 0;
	}
	const totalRuntime = averageWatchableEntitysRuntime(movie.watchableEntitys, true);
	// const totalRuntime = movie.watchableEntitys.reduce((prev, curr) => prev + curr.runtime, 0) / movie.watchableEntitys.length;
	if (totalRuntime === -1 && watchHistory.watchTime >= 500) {
		return 95;
	}

	const watchTime = Math.max(0, Math.min(watchHistory.watchTime, totalRuntime));
	const percent = (watchTime / totalRuntime) * 100;

	return percent;
};

const switchTo = async (vel: number) => {
	console.log('switchTo', vel);

	if (currentMovieUUID.value !== null) {
		const arr = indexStore.detailedMovies;
		const index = arr.findIndex((x) => x.UUID === currentMovieUUID.value);
		const { idxptr, value } = singleDimSwitcher(arr, index, vel);
		if (value == undefined) return;
		// currentMovieUUID.value = value.UUID;
		await handleMovieClick(value.UUID);
	} else {
		const arr = indexStore.detailedSeasons.map((x) => x.episodes);
		const seasonIndexPtr = arr.findIndex((x) => x.find((y) => y.UUID === currentEpisodeUUID.value));
		const episodeIndexPtr = arr[seasonIndexPtr]!.findIndex((x) => x.UUID === currentEpisodeUUID.value);
		const { arrptr, idxptr, value } = multiDimSwitcher(arr, seasonIndexPtr, episodeIndexPtr, vel);
		if (value == undefined) return;
		selectedSeason.value = value.season_UUID;
		await handleEpisodeClick(value.UUID);
		// currentEpisodeUUID.value = value.UUID;
		// selectedSeason.value = arr[arrptr]![idxptr]!.season_UUID;
	}
};

const changeLanguage = async (lang: string) => {
	if (indexStore.selectedEntity == null) return;

	const { apply } = videoKeepState(true);
	indexStore.setSelectedWatchableEntityUUID(indexStore.selectedEntity.UUID, lang);

	const { error, data: videoElem } = await tryCatch(() => apply());
	if (error) {
		console.log(error);
		return;
	}
	actualScrollIntoView(videoElem);
};

const handleMarkSeasonWatched = async (watched: boolean) => {
	const seasonUUID = selectedSeason.value;
	if (seasonUUID == undefined) return;

	await indexStore.markSeasonWatched(seasonUUID, watched);
};

const handleMarkMoviesWatched = async (watched: boolean) => {
	await indexStore.markMoviesWatched(watched);
};

const handleMarkMovieWatched = async (watched: boolean, movieUUID?: string) => {
	if (movieUUID == undefined) return;
	await indexStore.markMovieWatched(movieUUID, watched);
};

const { data: additionalList, execute: loadCheckForUpdates } = await useFetch<
	{
		outPath: string;
		file: string;
		parsed: {
			movie: false;
			title: string;
			language: Langs;
			season: number;
			episode: number;
		};
	}[]
>(`${useAPIURL()}/index/${route.params.SID}/checkForUpdates`, {
	headers: {
		'auth-token': authStore.authToken,
	},
	key: 'checkSerieForUpdates-' + route.params.SID,
	lazy: true,
	immediate: false,
	onResponseError: (error) => {
		return [];
	},
});

const dynamicRelatedContent = computed(() => {
	if (dynamicRelatedContentPlaylist.value.length > 0) {
		return dynamicRelatedContentPlaylist.value;
	}
	return dynamicRelatedContentAPI.value;
});

const dynamicRelatedContentPlaylist = ref<string[]>([]);

const { data: dynamicRelatedContentAPI, execute: loadDynamicRelatedContent } = await useFetch<string[]>(
	`${useAPIURL()}/index/${route.params.SID}/related`,
	{
		headers: {
			'auth-token': authStore.authToken,
		},
		key: 'relatedContent-' + route.params.SID,
		onResponseError: (error) => {
			return [];
		},
		lazy: true,
		immediate: false,
		query: {
			count: 5,
		},
	},
);

if (authStore.loggedIn) {
	let loadAPIRecommendations = true;
	if ('playlist' in route.query) {
		await playlistStore.loadPlaylists();
		const playlist = playlistStore.playlists.find((p) => p.UUID === route.query.playlist);
		if (playlist) {
			dynamicRelatedContentPlaylist.value = playlist.items;
			loadAPIRecommendations = false;
		}
	}

	if (loadAPIRecommendations) {
		loadDynamicRelatedContent();
	}

	loadCheckForUpdates();
}

const randomNumbersSeriesCover = computed(() => {
	const arr = Array.from({ length: dynamicPopulatedContent.value.length }, () => Math.floor(Math.random() * 1000));
	return arr;
});

const dynamicPopulatedContent = computed(() => {
	if (dynamicRelatedContent.value == undefined) return [];
	return dynamicRelatedContent.value
		.map((id) => {
			return indexStore.seriesById.get(id);
		})
		.filter((x) => x != null);
});
</script>

<style scoped>
.min-vh-100 {
	min-height: 100vh;
}

.center-play {
	position: absolute;
	top: 0;
	right: 0;
	transform: translate(-50%, 100%);
}

.video-container {
	position: relative;
	width: 90%;
	max-width: 70vw;
	/* max-width: 1000px; */
	display: flex;
	justify-content: center;
	margin-inline: auto;
	background-color: #000;
}

.cursor-pointer {
	cursor: pointer;
	transition: all 0.2s ease;
}

.cursor-disabled {
	cursor: not-allowed;
}

.cursor-pointer:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
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
	border-color: transparent transparent #0d6efd;
}
</style>
