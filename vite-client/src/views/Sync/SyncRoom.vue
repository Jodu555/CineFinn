<template>
	<div class="mt-3 container">
		<div v-if="watchLoading || syncLoading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div class="mb-3 d-flex justify-content-between">
			<button @click="leaveRoom()" type="button" class="btn btn-outline-danger">Leave Room</button>
			<AutoComplete :options="{ placeholder: 'Select a Series...', clearAfterSelect: true }" :data="autoCompleteSeries" :select-fn="selectSeries" />
		</div>
		<div v-if="currentSeries != undefined && currentSeries.ID != -1">
			<!-- Movies -->
			<EntityListView
				v-if="currentSeries.movies.length >= 1"
				title="Movies:"
				:array="currentSeries.movies"
				:current="currentMovie"
				:chnageFN="changeMovie"
				:watchList="[]"
			/>
			<!-- Seasons -->
			<EntityListView
				title="Seasons:"
				v-if="currentSeries.seasons.length >= 1"
				:array="currentSeries.seasons"
				:current="currentSeason"
				:chnageFN="changeSeason"
				:season="true"
				:watchList="[]"
			/>
			<!-- Episodes -->
			<EntityListView
				v-if="currentSeason != -1"
				title="Episodes:"
				:array="currentSeries.seasons.find((x) => x[0].season == entityObject.season)"
				:current="currentEpisode"
				:currentSeason="currentSeason"
				:chnageFN="changeEpisode"
				:watchList="[]"
			/>

			<EntityActionsInformation />
			<ExtendedVideo v-show="showVideo" :switchTo="switchTo" :sendVideoTimeUpdate="() => {}" />
		</div>
	</div>
</template>
<script>
import AutoComplete from '@/components/Layout/AutoComplete.vue';
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import EntityActionsInformation from '../../components/Watch/EntityActionsInformation.vue';
import EntityListView from '../../components/Watch/EntityListView.vue';
import ExtendedVideo from '../../components/Watch/ExtendedVideo.vue';

export default {
	components: { AutoComplete, EntityActionsInformation, EntityListView, ExtendedVideo },
	computed: {
		...mapState(['series']),
		...mapState('sync', { syncLoading: 'loading' }),
		...mapState('watch', { watchLoading: 'loading' }),
		...mapState('watch', ['currentSeries', 'currentMovie', 'currentSeason', 'currentEpisode', 'currentLanguage', 'watchList']),
		...mapState('auth', ['authToken', 'settings']),
		...mapGetters('watch', ['videoSrc', 'entityObject']),
		autoCompleteSeries() {
			return this.series.map((x) => ({ value: x.title, ID: x.ID }));
		},
		showVideo() {
			return (
				this.currentSeries != undefined &&
				this.currentSeries.ID != -1 &&
				(this.currentMovie !== -1 || this.currentSeason !== -1 || this.currentEpisode !== -1)
			);
		},
	},
	methods: {
		...mapActions('sync', ['leaveRoom']),
		...mapActions('watch', ['loadSeriesInfo']),
		...mapMutations('watch', ['setCurrentMovie', 'setCurrentSeason', 'setCurrentEpisode', 'setCurrentLanguage', 'setWatchList']),
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
		async selectSeries(ID) {
			await this.$socket.emit('sync-selectSeries', { ID });
			await this.loadSeriesInfo(ID);
			this.handleVideoChange(-1, -1, -1);
		},
		switchTo(vel) {
			deepswitchTo(vel, this);
		},
		handleVideoChange(season = -1, episode = -1, movie = -1, langchange = false, lang) {
			if (langchange && this.currentLanguage == lang) return;
			const video = document.querySelector('video');

			//TODO: Maybe add here default language from user prefered settings
			let defaultLanguage = 'GerDub';

			const wasPaused = video.paused;
			const prevTime = video.currentTime;

			console.log('GOT handleVideoChange() EMIT to Server', { season, episode, movie, langchange, lang });
			//TODO: make here an emit to the server
			video.pause();

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
				}, 100);
			}, 200);
		},
	},
	mounted() {
		this.$socket.on('sync-videoAction', ({ action, value }) => {
			if (action == 'sync-playback') {
				// value = true = Play
				// Value = false = Pause
			} else if (action == 'sync-skip') {
				// The Skip if you click the arrow keys
			} else if (action == 'sync-skipPercent') {
				// The Skip you can perform with the numpad
			} else if (action == 'sync-skipTimeline') {
				// The skip if you click on the timeline at any position
			}
		});
	},
	async unmounted() {
		this.$socket.off('roomVideoAction');
	},
};
</script>
<style lang=""></style>
