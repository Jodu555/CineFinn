<template>
	<div class="innerdoc">
		<div v-if="currentSeries == undefined">
			<h1 class="text-center">No Series with that ID</h1>
		</div>
		<div v-if="homeLoading || loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-auto-animate class="container" v-if="currentSeries != undefined && currentSeries.ID != '-1'">
			<div class="float-end btn-group">
				<button class="btn btn-outline-info" title="Series Information" data-bs-toggle="modal" data-bs-target="#seriesInformationModal" disabled>
					<font-awesome-icon icon="fa-solid fa-info" />
				</button>
				<button class="btn btn-outline-info" title="Keyboard Controls" data-bs-toggle="modal" data-bs-target="#controlsModal">
					<font-awesome-icon icon="fa-regular fa-keyboard" />
				</button>
			</div>
			<!-- <SeriesInformation /> -->
			<ControlInformationModal />
			<h1 class="text-truncate" :title="displayTitle">
				{{ displayTitle }}
			</h1>

			<div class="text-center" v-if="currentSeries.movies.length == 0 && currentSeries.seasons.length == 0">
				<h2 class="text-danger">It Seems there is currently no data for this Series</h2>
				<p class="text-danger mb-0">It either got removed, or is on a node which is currently un reachable, or is currently being transcoded</p>
				<p class="text-danger">Please check back later and if this issue persists please contact the Administrator</p>
				<router-link type="button" to="/" class="mt-3 mb-4 btn btn-outline-primary btn-lg">Go Watch something else</router-link>
			</div>

			<pre v-if="settings.developerMode.value">
				Watch Information:
				{{ JSON.stringify(watchList.find((segment) => segment.season == currentSeason && segment.episode == currentEpisode)) }}
			</pre
			>
			<div v-auto-animate v-if="showLatestWatchButton" class="text-center mb-2">
				<button @click="skipToLatestTime" class="btn btn-outline-info">Jump to Latest watch position!</button>
			</div>
			<MarkSeasonDropdown />
			<pre v-if="settings.developerMode.value">
				currentMovie: {{ currentMovie }}
				currentSeason: {{ currentSeason }}
				currentEpisode: {{ currentEpisode }}
				currentLanguage: {{ currentLanguage }}
				videoSrc: {{ videoSrc }}
				entityObject: {{ entityObject }}
			</pre
			>

			<div v-if="currentSeries.movies.length >= 1 && currentSeries.seasons.length == 0 && currentMovie == -1">
				<EntityListViewMovies :changeMovie="changeMovie" />
			</div>

			<div v-else>
				<!-- Movies -->
				<EntityListView
					v-if="currentSeries.movies.length >= 1"
					title="Movies:"
					:array="currentSeries.movies"
					:current="currentMovie"
					:changeFN="changeMovie"
					:watchList="watchList" />
				<!-- Seasons -->
				<EntityListView
					title="Seasons:"
					v-if="currentSeries.seasons.length >= 1"
					:array="currentSeries.seasons"
					:current="currentSeason"
					:changeFN="changeSeason"
					:season="true"
					:watchList="watchList" />
				<!-- Episodes -->
				<EntityListView
					v-if="currentSeason != -1"
					title="Episodes:"
					:array="currentSeries.seasons.find((x) => x[0].season == ((entityObject as SerieEpisode)?.season || -1))"
					:current="currentEpisode"
					:currentSeason="currentSeason"
					:changeFN="changeEpisode"
					:watchList="watchList" />
			</div>

			<!-- Previous & Title & Languages & Next -->
			<EntityActionsInformation :switchTo="switchTo" :changeLanguage="changeLanguage" />
		</div>
		<ExtendedVideo v-show="showVideo" :switchTo="switchTo" :sendVideoTimeUpdate="sendVideoTimeUpdate" />
	</div>
</template>
<script lang="ts">
import { mapWritableState, mapActions, mapState } from 'pinia';
import type { Langs, SerieEpisode } from '@/types/index';
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';
import { useWatchStore } from '@/stores/watch.store';
import { singleDimSwitcher, multiDimSwitcher, deepswitchTo } from '@/utils/switcher';
import EntityListView from '@/components/Watch/EntityListView.vue';
import ExtendedVideo from '@/components/Watch/ExtendedVideo.vue';
import ControlInformationModal from '@/components/Watch/ControlInformationModal.vue';
import EntityActionsInformation from '@/components/Watch/EntityActionsInformation.vue';
import MarkSeasonDropdown from '@/components/Watch/MarkSeasonDropdown.vue';
import EntityListViewMovies from '@/components/Watch/EntityListViewMovies.vue';

export default {
	components: { EntityListView, ExtendedVideo, ControlInformationModal, EntityActionsInformation, MarkSeasonDropdown, EntityListViewMovies },
	data() {
		return {
			cleanupFN: null,
			buttonTimer: null as unknown as NodeJS.Timeout,
			forceHideButton: false,
		};
	},
	computed: {
		...mapWritableState(useIndexStore, { homeLoading: 'loading' }),
		...mapWritableState(useWatchStore, [
			'loading',
			'currentSeries',
			'currentMovie',
			'currentSeason',
			'currentEpisode',
			'currentLanguage',
			'watchList',
		]),
		...mapState(useWatchStore, ['entityObject', 'videoSrc']),
		...mapWritableState(useAuthStore, ['authToken', 'settings']),
		// ...mapGetters(useWatchStore, ['videoSrc', 'entityObject']),
		showLatestWatchButton() {
			if (this.forceHideButton) return false;
			const info = Boolean(this.currentMovie !== -1 || this.currentSeason !== -1 || this.currentEpisode !== -1);
			if (info) {
				const segment = this.watchList.find(
					(segment) => segment.ID == this.$route.query.id && segment.season == this.currentSeason && segment.episode == this.currentEpisode
				);
				if (segment == undefined) return false;
				if (segment.time > 100) return true;
			} else {
				return false;
			}
		},
		showVideo() {
			return (
				this.currentSeries != undefined &&
				this.currentSeries.ID != '-1' &&
				(this.currentMovie !== -1 || this.currentSeason !== -1 || this.currentEpisode !== -1)
			);
		},
		displayTitle() {
			let str = `${this.currentSeries.infos?.title || this.currentSeries.infos?.infos || this.currentSeries.title} - `;

			if (this.currentSeries.movies.length >= 1) {
				str += `${this.currentSeries.movies.length} ` + (this.currentSeries.movies.length > 1 ? 'Movies' : 'Movie');
			}

			if (this.currentSeries.movies.length >= 1 && this.currentSeries.seasons.length >= 1) {
				str += ' | ';
			}

			if (this.currentSeries.seasons.length >= 1) {
				str += `${this.currentSeries.seasons.length} ` + (this.currentSeries.seasons.length > 1 ? 'Seasons' : 'Season');
			}

			return str;
		},
	},
	methods: {
		...mapActions(useWatchStore, ['loadSeriesInfo', 'loadWatchList', 'markSeason']),
		skipToLatestTime() {
			const segment = this.watchList.find((segment) => segment.season == this.currentSeason && segment.episode == this.currentEpisode);
			const video = document.querySelector('video');
			if (video && segment) {
				video.currentTime = segment.time;
				this.forceHideButton = true;
			}
		},
		switchTo(vel: number) {
			deepswitchTo(vel, this.handleVideoChange);
		},
		changeMovie(ID: number) {
			if (this.currentMovie == ID) return this.handleVideoChange();
			this.handleVideoChange(-1, -1, ID);
		},
		changeEpisode(ID: number) {
			this.handleVideoChange(this.currentSeason, ID);
		},
		changeSeason(ID: number) {
			console.log(ID, 'CAME');
			console.log(this.currentSeason);

			if (this.currentSeason == ID) return this.handleVideoChange();
			return this.handleVideoChange(ID, 1);
		},
		changeLanguage(lang: Langs) {
			this.handleVideoChange(this.currentSeason, this.currentEpisode, this.currentMovie, true, lang, undefined);
		},
		handleVideoChange(
			season = -1,
			episode = -1,
			movie = -1,
			langchange = false,
			lang?: Langs | undefined,
			callback?: ((video: HTMLVideoElement) => void) | undefined
		) {
			if (langchange && this.currentLanguage == lang) return;
			const video = document.querySelector('video');

			//TODO: Maybe add here default language from user prefered settings
			let defaultLanguage = this.currentLanguage || ('GerDub' as Langs);

			let wasPaused = false;
			let prevTime = 0;
			if (video) {
				wasPaused = video.paused;
				prevTime = video.currentTime;

				this.sendVideoTimeUpdate(video.currentTime, true);

				video.pause();
			}
			console.log('GOT handleVideoChange()', { season, episode, movie, langchange, lang }, { wasPaused, prevTime, defaultLanguage });

			//Handle the skip to latest watch postion button
			this.buttonTimer != null && clearTimeout(this.buttonTimer);
			this.forceHideButton = false;
			this.buttonTimer = setTimeout(() => {
				this.forceHideButton = true;
			}, 10000);

			//Save The Current infos in localstorage
			localStorage.setItem(
				'data',
				JSON.stringify({
					ID: this.$route.query.id,
					season,
					episode,
					movie,
				})
			);

			setTimeout(() => {
				this.currentSeason = season;
				this.currentEpisode = episode;
				this.currentMovie = movie;

				//Ensure that the selected language exists on the entity
				if (this.entityObject && !this.entityObject.langs.includes(defaultLanguage) && !langchange) {
					console.log('The Requestes Language does not exist on the Entity');
					defaultLanguage = this.entityObject.langs[0] as Langs;
				}

				this.currentLanguage = langchange ? (lang as Langs) : defaultLanguage;
				setTimeout(() => {
					if (!video) return;
					video.load();
					langchange ? (video.currentTime = prevTime) : (video.currentTime = 0);
					!wasPaused && video.play();
					if (callback && typeof callback == 'function') {
						callback(video);
					}
				}, 100);
			}, 200);
		},
		sendVideoTimeUpdate(time: number, force = false) {
			console.log('sendVideoTimeUpdate()', time, force);
			this.$socket.emit('timeUpdate', {
				series: this.$route.query.id,
				movie: this.currentMovie,
				season: this.currentSeason,
				episode: this.currentEpisode,
				time: time,
				force,
			});
		},
	},
	async created() {
		try {
			const seriesID = this.$route.query.id?.toString();
			if (seriesID == undefined) return;
			await this.loadSeriesInfo(seriesID);
			if (this.currentSeries == undefined || this.currentSeries.ID == '-1') return;
			const localStorageString = localStorage.getItem('data') || '';
			const data = localStorageString.trim() != '' ? JSON.parse(localStorageString) : null;

			this.loadWatchList(seriesID);
			if (this.$route.query?.idx) {
				const queryIdx = this.$route.query?.idx.toString();
				const language: Langs = (this.$route.query?.lang?.toString() as Langs) || 'GerDub';
				if (queryIdx.includes('x')) {
					//SeasonxEpisode
					const [se, ep] = queryIdx.split('x').map((x) => Number(x));

					this.handleVideoChange(se, ep, -1, language != undefined, language, (video) => {
						if (this.$route.query?.time != undefined && parseInt(this.$route.query?.time.toString())) {
							video.currentTime = parseInt(this.$route.query?.time.toString());
						}
					});
				} else {
					//Movie
					const movieID = parseInt(queryIdx);
					this.handleVideoChange(-1, -1, movieID, language != undefined, language, (video) => {
						if (this.$route.query?.time != undefined && parseInt(this.$route.query?.time.toString())) {
							video.currentTime = parseInt(this.$route.query?.time.toString());
						}
					});
				}
			} else if (data && data.ID == seriesID) {
				this.handleVideoChange(data.season || -1, data.episode || -1, data.movie || -1, undefined, undefined, undefined);
			} else {
				localStorage.removeItem('data');

				this.handleVideoChange(-1, -1, -1, undefined, undefined, undefined);
			}

			document.title = `Cinema | ${this.currentSeries.title}`;
		} catch (error) {
			console.error('Error in Watch.vue Created Hook', error);
		}
	},
	async mounted() {
		this.$socket.on('watchListChange', ({ watchList, seriesID }) => {
			console.log('GOT watchListChange');
			if (seriesID == undefined) this.watchList = watchList.filter((e) => e.ID == this.$route.query.id);
			if (seriesID == this.$route.query.id) this.watchList = watchList.filter((e) => e.ID == this.$route.query.id);
		});
		this.$socket.emit('getWatchList', { ID: this.$route.query.id });
	},
	unmounted() {
		this.$socket.off('watchListChange');
	},
	beforeUnmount() {
		const video = document.querySelector('video');
		if (video) {
			this.sendVideoTimeUpdate(video.currentTime, true);
		}
		localStorage.removeItem('data');
		document.title = `Cinema | Jodu555`;
	},
};
</script>

<style scoped></style>
