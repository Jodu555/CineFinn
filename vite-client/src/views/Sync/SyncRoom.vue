<template>
	<div class="mt-3 container">
		<div v-if="watchLoading || syncLoading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<pre>
				syncLoading: {{ syncLoading }}
				watchLoading: {{ watchLoading }}
				currentMovie: {{ currentMovie }}
				currentSeason: {{ currentSeason }}
				currentEpisode: {{ currentEpisode }}
				currentLanguage: {{ currentLanguage }}
				videoSrc: {{ videoSrc }}
				entityObject: {{ entityObject }}
				currentRoom: {{ currentRoom }}
				isOwner: {{ isOwner }}
		</pre
		>
		<div class="mb-3 d-flex justify-content-between">
			<button @click="leaveRoom()" type="button" class="btn btn-outline-danger">Leave Room</button>
			<AutoComplete
				:options="{ placeholder: 'Select a Series...', clearAfterSelect: true }"
				:data="autoCompleteSeries"
				:select-fn="
					(id) => {
						isOwner ? selectSeries(id) : null;
					}
				"
			/>
		</div>
		<div v-if="currentSeries != undefined && currentSeries.ID != -1">
			<div v-if="isOwner">
				<!-- Movies -->
				<EntityListView
					v-if="currentSeries.movies.length >= 1"
					title="Movies:"
					:array="currentSeries.movies"
					:current="currentMovie"
					:changeFN="changeMovie"
					:watchList="[]"
				/>
				<!-- Seasons -->
				<EntityListView
					title="Seasons:"
					v-if="currentSeries.seasons.length >= 1"
					:array="currentSeries.seasons"
					:current="currentSeason"
					:changeFN="changeSeason"
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
					:changeFN="changeEpisode"
					:watchList="[]"
				/>

				<EntityActionsInformation :switch-to="switchTo" :change-language="changeLanguage" />
			</div>

			<ExtendedVideo
				ref="extendedVideoChild"
				v-show="showVideo"
				:events="{ playback: deepPlayback, skip: deepSkip, skipTimeline: deepSkipTimeline }"
				:inSyncRoom="true"
				:canPlay="isOwner"
				:switchTo="switchTo"
				:sendVideoTimeUpdate="() => {}"
			/>
		</div>
	</div>
</template>
<script>
import AutoComplete from '@/components/Layout/AutoComplete.vue';
import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
import EntityActionsInformation from '../../components/Watch/EntityActionsInformation.vue';
import EntityListView from '../../components/Watch/EntityListView.vue';
import ExtendedVideo from '@/components/Watch/ExtendedVideo.vue';
import { deepswitchTo } from '@/plugins/switcher';

export default {
	components: { AutoComplete, EntityActionsInformation, EntityListView, ExtendedVideo },
	computed: {
		...mapState(['series']),
		...mapState('sync', { syncLoading: 'loading', roomList: 'roomList' }),
		...mapState('watch', { watchLoading: 'loading' }),
		...mapState('watch', ['currentSeries', 'currentMovie', 'currentSeason', 'currentEpisode', 'currentLanguage', 'watchList']),
		...mapState('auth', ['authToken', 'settings']),
		...mapGetters('watch', ['videoSrc', 'entityObject']),
		...mapGetters('sync', ['currentRoom', 'isOwner']),
		autoCompleteSeries() {
			if (this.isOwner) {
				return this.series.map((x) => ({ value: x.title, ID: x.ID }));
			} else {
				return [];
			}
		},
		showVideo() {
			console.log(
				'this.currentSeries',
				this.currentSeries,
				'this.currentMovie',
				this.currentMovie,
				'this.currentSeason',
				this.currentSeason,
				'this.currentEpisode',
				this.currentEpisode
			);
			return (
				this.currentSeries != undefined &&
				this.currentSeries.ID != -1 &&
				(this.currentMovie !== -1 || this.currentSeason !== -1 || this.currentEpisode !== -1)
			);
		},
	},
	methods: {
		...mapActions('sync', ['leaveRoom', 'loadRooms', 'joinRoom']),
		...mapActions('watch', ['loadSeriesInfo']),
		...mapMutations('watch', ['setCurrentMovie', 'setCurrentSeason', 'setCurrentEpisode', 'setCurrentLanguage', 'setWatchList']),
		deepPlayback(state, time) {
			console.log('deepPlayback() Emitting sync-video-action: "sync-playback" with value:', state);
			this.$socket.emit('sync-video-action', { action: 'sync-playback', value: state, time });
		},
		deepSkip(time) {
			console.log('deepSkip() Emitting sync-video-action: "sync-skip" with value:', time);
			this.$socket.emit('sync-video-action', { action: 'sync-skip', value: time });
		},
		deepSkipTimeline(time) {
			console.log('deepSkipTimeline() Emitting sync-video-action: "sync-skipTimeline" with value:', time);
			this.$socket.emit('sync-video-action', { action: 'sync-skip', value: time });
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
		async selectSeries(ID, broadcast = true) {
			if (broadcast) {
				await this.$socket.emit('sync-selectSeries', { ID });
			}
			await this.loadSeriesInfo(ID);
			this.handleVideoChange(-1, -1, -1);
		},
		switchTo(vel) {
			deepswitchTo(vel, this);
		},

		/**
		 * Handles changing the video that is playing in the sync room.
		 *
		 * @param {number} season - The season number to change to. Default -1 for no change.
		 * @param {number} episode - The episode number to change to. Default -1 for no change.
		 * @param {number} movie - The movie ID to change to. Default -1 for no change.
		 * @param {boolean} langchange - Whether to change the language. Default false.
		 * @param {string} lang - The language code to change to if langchange is true.
		 * @param {boolean} silent - Whether to suppress emit to server. Default false.
		 */
		//silent = false not send back to server (so user based switch)
		handleVideoChange(season = -1, episode = -1, movie = -1, langchange = false, lang, silent = false) {
			console.log('Came', 0);
			if (!silent && !this.isOwner) return;
			console.log('Came', 1);
			if (langchange && this.currentLanguage == lang) return;
			const video = document.querySelector('video');
			console.log('Came', 2);

			//TODO: Maybe add here default language from user prefered settings
			let defaultLanguage = 'GerDub';

			const wasPaused = video.paused;
			const prevTime = video.currentTime;

			console.log('GOT handleVideoChange() EMIT to Server', { season, episode, movie, langchange, lang });
			!silent && this.$socket.emit('sync-video-change', { season, episode, movie, langchange, lang });
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
	async mounted() {
		if (this.currentRoom == undefined) {
			await this.loadRooms();
			const roomID = Number(this.$route.params.key);
			console.log(roomID, this.series);
			await this.joinRoom(roomID);
		}
		await this.selectSeries(this.currentRoom?.seriesID, false);
		console.log('this.currentRoom?.entityInfos?', JSON.stringify(this.currentRoom?.entityInfos));
		console.log('mounted(), currentRoom', this.currentRoom);
		setTimeout(() => {
			console.log(
				parseInt(this.currentRoom?.entityInfos?.season),
				parseInt(this.currentRoom?.entityInfos?.episode),
				parseInt(this.currentRoom?.entityInfos?.movie)
			);
			if (this.currentLanguage == this.currentRoom?.entityInfos?.lang) {
				this.handleVideoChange(
					parseInt(this.currentRoom?.entityInfos?.season),
					parseInt(this.currentRoom?.entityInfos?.episode),
					parseInt(this.currentRoom?.entityInfos?.movie),
					false,
					true
				);
			} else {
				this.handleVideoChange(
					parseInt(this.currentRoom?.entityInfos?.season),
					parseInt(this.currentRoom?.entityInfos?.episode),
					parseInt(this.currentRoom?.entityInfos?.movie),
					true,
					this.currentRoom?.entityInfos?.lang,
					true
				);
			}
		}, 500);
		this.$socket.on('sync-video-action', ({ action, value, time }) => {
			if (action == 'sync-playback') {
				// value = true = Play
				// Value = false = Pause
				console.log(this.$refs.extendedVideoChild);
				this.$refs.extendedVideoChild?.trigger(action, value, time);
			} else if (action == 'sync-skip') {
				// The Skip if you click the arrow keys or number keys
				console.log(this.$refs.extendedVideoChild);
				this.$refs.extendedVideoChild?.trigger(action, value);
			} else if (action == 'sync-skipTimeline') {
				// The skip if you click on the timeline at any position
				console.log(this.$refs.extendedVideoChild);
				this.$refs.extendedVideoChild?.trigger(action, value);
			}
		});
		this.$socket.on('sync-selectSeries', async ({ ID }) => {
			this.selectSeries(ID, false);
		});

		this.$socket.on('sync-video-change', async ({ season, episode, movie, langchange, lang }) => {
			this.handleVideoChange(season, episode, movie, langchange, lang, true);
		});
	},
	async unmounted() {
		this.$socket.off('sync-videoAction');
		this.$socket.off('sync-selectSeries');
		this.$socket.off('sync-video-action');
	},
};
</script>
<style lang=""></style>
