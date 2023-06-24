<template>
	<div class="innerdoc">
		<div v-if="currentSeries == undefined">
			<h1>No Series with that ID</h1>
		</div>
		<div v-if="homeLoading || loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-auto-animate class="container" v-if="currentSeries != undefined && currentSeries.ID != -1">
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
			<div v-auto-animate v-if="showLatestWatchButton" class="text-center">
				<button @click="skipToLatestTime" class="btn btn-outline-info">Jump to Latest watch position!</button>
			</div>
			<div v-if="currentSeason !== -1" class="d-flex justify-content-end">
				<div class="btn-group">
					<button
						class="btn btn-outline-primary dropdown-toggle"
						type="button"
						id="seenmark"
						data-bs-toggle="dropdown"
						aria-haspopup="true"
						aria-expanded="false"
					>
						Staffel schon Gesehen ?
					</button>
					<div class="dropdown-menu" aria-labelledby="seenmark">
						<button type="button" class="dropdown-item" @click="markSeason(true)" :class="{ disabled: currentSeason == -1 }">
							<b>Schon Gesehen</b>
						</button>
						<button type="button" class="dropdown-item" @click="markSeason(false)" :class="{ disabled: currentSeason == -1 }">
							<b>Noch nicht gesehen</b>
						</button>
					</div>
				</div>
			</div>
			<pre v-if="settings.developerMode.value">
				currentMovie: {{ currentMovie }}
				currentSeason: {{ currentSeason }}
				currentEpisode: {{ currentEpisode }}
				currentLanguage: {{ currentLanguage }}
				videoSrc: {{ videoSrc }}
				entityObject: {{ entityObject }}
			</pre
			>
			<!-- Movies -->
			<EntityListView
				v-if="currentSeries.movies.length >= 1"
				title="Movies:"
				:array="currentSeries.movies"
				:current="currentMovie"
				:changeFN="changeMovie"
				:watchList="watchList"
			/>
			<!-- Seasons -->
			<EntityListView
				title="Seasons:"
				v-if="currentSeries.seasons.length >= 1"
				:array="currentSeries.seasons"
				:current="currentSeason"
				:changeFN="changeSeason"
				:season="true"
				:watchList="watchList"
			/>
			<!-- Episodes -->
			<EntityListView
				v-if="currentSeason != -1"
				title="Episodes:"
				:array="currentSeries.seasons.find((x) => x[0].season == entityObject.season)"
				:current="currentEpisode"
				:currentSeason="currentSeason"
				:changeFN="changeEpisode"
				:watchList="watchList"
			/>
			<!-- Previous & Title & Languages & Next -->
			<EntityActionsInformation :switchTo="switchTo" :changeLanguage="changeLanguage" />
		</div>

		<ExtendedVideo v-show="showVideo" :switchTo="switchTo" :sendVideoTimeUpdate="sendVideoTimeUpdate" />
	</div>
</template>
<script>
import { mapState, mapMutations, mapActions, mapGetters } from 'vuex';
import { singleDimSwitcher, multiDimSwitcher, deepswitchTo } from '@/plugins/switcher';
import EntityListView from '@/components/Watch/EntityListView.vue';
import ExtendedVideo from '@/components/Watch/ExtendedVideo.vue';
import ControlInformationModal from '@/components/Watch/ControlInformationModal.vue';
import EntityActionsInformation from '@/components/Watch/EntityActionsInformation.vue';

export default {
	components: { EntityListView, ExtendedVideo, ControlInformationModal, EntityActionsInformation },
	data() {
		return {
			cleanupFN: null,
			buttonTimer: null,
			forceHideButton: false,
		};
	},
	computed: {
		...mapState({ homeLoading: 'loading' }),
		...mapState('watch', ['loading', 'currentSeries', 'currentMovie', 'currentSeason', 'currentEpisode', 'currentLanguage', 'watchList']),
		...mapState('auth', ['authToken', 'settings']),
		...mapGetters('watch', ['videoSrc', 'entityObject']),
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
				this.currentSeries.ID != -1 &&
				(this.currentMovie !== -1 || this.currentSeason !== -1 || this.currentEpisode !== -1)
			);
		},
		displayTitle() {
			let str = `${this.currentSeries.title} - `;

			if (this.currentSeries.movies.length >= 1) {
				str += `${this.currentSeries.movies.length} ` + (this.currentSeries.movies.length > 1 ? 'Movies' : 'Movie');
				str += ' | ';
			}
			str += `${this.currentSeries.seasons.length} ` + (this.currentSeries.seasons.length > 1 ? 'Seasons' : 'Season');

			return str;
		},
	},
	methods: {
		...mapMutations('watch', ['setCurrentMovie', 'setCurrentSeason', 'setCurrentEpisode', 'setCurrentLanguage', 'setWatchList']),
		...mapActions('watch', ['loadSeriesInfo', 'loadWatchList', 'markSeason']),
		skipToLatestTime() {
			const segment = this.watchList.find((segment) => segment.season == this.currentSeason && segment.episode == this.currentEpisode);
			const video = document.querySelector('video');
			video.currentTime = segment.time;
			this.forceHideButton = true;
		},
		switchTo(vel) {
			deepswitchTo(vel, this);
		},
		changeMovie(ID) {
			if (this.currentMovie == ID) return this.handleVideoChange();
			this.handleVideoChange(-1, -1, ID);
		},
		changeEpisode(ID) {
			this.handleVideoChange(this.currentSeason, ID);
		},
		changeSeason(ID) {
			if (this.currentSeason == ID) return this.handleVideoChange();
			return this.handleVideoChange(ID, 1);
		},
		changeLanguage(lang) {
			this.handleVideoChange(this.currentSeason, this.currentEpisode, this.currentMovie, true, lang);
		},
		handleVideoChange(season = -1, episode = -1, movie = -1, langchange = false, lang, callback) {
			if (langchange && this.currentLanguage == lang) return;
			const video = document.querySelector('video');

			//TODO: Maybe add here default language from user prefered settings
			let defaultLanguage = 'GerDub';

			const wasPaused = video.paused;
			const prevTime = video.currentTime;

			console.log('GOT handleVideoChange()', { season, episode, movie, langchange, lang });
			this.sendVideoTimeUpdate(video.currentTime, true);

			video.pause();

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
				this.setCurrentSeason(season);
				this.setCurrentEpisode(episode);
				this.setCurrentMovie(movie);

				//Ensure that the selected language exists on the entity
				if (this.entityObject && !this.entityObject.langs.includes(defaultLanguage) && !langchange) {
					defaultLanguage = this.entityObject.langs[0];
				}

				this.setCurrentLanguage(langchange ? lang : defaultLanguage);
				setTimeout(() => {
					video.load();
					langchange ? (video.currentTime = prevTime) : (video.currentTime = 0);
					!wasPaused && video.play();
					if (callback && typeof callback == 'function') {
						callback(video);
					}
				}, 100);
			}, 200);
		},
		sendVideoTimeUpdate(time, force = false) {
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
			const seriesID = this.$route.query.id;
			await this.loadSeriesInfo(seriesID);
			if (this.currentSeries == undefined || this.currentSeries.ID == -1) return;
			const data = JSON.parse(localStorage.getItem('data'));

			this.loadWatchList(seriesID);
			if (this.$route.query?.idx) {
				const [se, ep] = this.$route.query?.idx.split('x').map((x) => Number(x));
				this.handleVideoChange(se, ep, -1, undefined, undefined, (video) => {
					if (this.$route.query?.time != undefined && parseInt(this.$route.query?.time)) {
						video.currentTime = parseInt(this.$route.query?.time);
					}
				});
			} else if (data && data.ID == seriesID) {
				this.handleVideoChange(data.season || -1, data.episode || -1, data.movie || -1);
			} else {
				localStorage.removeItem('data');

				this.handleVideoChange(-1, -1, -1);
			}

			document.title = `Cinema | ${this.currentSeries.title}`;
		} catch (error) {
			console.error('Error in Watch.vue Created Hook', error);
		}
	},
	async mounted() {
		this.$socket.on('watchListChange', (watchList) => {
			console.log('GOT watchListChange');
			this.setWatchList(watchList.filter((e) => e.ID == this.$route.query.id));
		});
		this.$socket.emit('getWatchList', { ID: this.$route.query.id });
	},
	unmounted() {
		this.$socket.off('watchListChange');
	},
	beforeUnmount() {
		const video = document.querySelector('video');
		this.sendVideoTimeUpdate(video.currentTime, true);
		localStorage.removeItem('data');
		document.title = `Cinema | Jodu555`;
	},
};
</script>

<style scoped></style>
