<template>
	<div class="mt-3 container">
		<div v-if="watchLoading || syncLoading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<pre v-if="userInfo.role == 3">
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
		<Modal v-if="currentRoom != null" size="xl" v-model:show="showSyncModal">
			<template #title> Sync Room {{ currentRoom.ID }} Manager</template>
			<template #body>
				<h5 v-if="isOwner" class="text-danger text-center">If you promote a person you will automatically get demoted</h5>
				<div class="table-responsive-md">
					<table class="table">
						<thead>
							<tr>
								<th scope="col">Username</th>
								<th scope="col">Role</th>
								<th scope="col">Actions</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="member in currentRoom.members" class="">
								<td scope="row">{{ member.name }}</td>
								<td>{{ toReadableRole(member.role) }}</td>
								<td>
									<button v-if="member.role == 0 && isOwner" @click="promote(member.UUID)" type="button" class="btn btn-primary me-3">Promote</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</template>
		</Modal>
		<div class="mb-3 d-flex justify-content-between">
			<div>
				<button @click="leaveRoom()" type="button" class="btn btn-outline-danger">Leave Room</button>
			</div>
			<div v-if="currentRoom != null" class="card" style="width: 12rem">
				<div class="card-body text-center">
					<h5 class="card-title text-center">
						<div class="spinner-grow text-danger" role="info">
							<span class="visually-hidden">Live Indicator</span>
						</div>
					</h5>
					<p class="card-text text-center">
						<span> Active Sync Session... </span>
						<br />
						<span class="text-muted">{{ currentRoom.members.length }} Participants</span>
					</p>
					<button @click="showSyncModal = true" class="btn btn-outline-info">Manage</button>
				</div>
			</div>
			<AutoComplete
				v-if="isOwner"
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
import Modal from '../../components/Modal.vue';

export default {
	components: { AutoComplete, EntityActionsInformation, EntityListView, ExtendedVideo, Modal },
	data() {
		return {
			showSyncModal: false,
		};
	},
	computed: {
		...mapState(['series']),
		...mapState('sync', { syncLoading: 'loading', roomList: 'roomList' }),
		...mapState('watch', { watchLoading: 'loading' }),
		...mapState('watch', ['currentSeries', 'currentMovie', 'currentSeason', 'currentEpisode', 'currentLanguage', 'watchList']),
		...mapState('auth', ['authToken', 'settings', 'userInfo']),
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
				'showVideo',
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
		...mapActions('sync', ['leaveRoom', 'loadRooms', 'joinRoom', 'loadRoomInfo']),
		...mapActions('watch', ['loadSeriesInfo']),
		...mapMutations('watch', ['setCurrentMovie', 'setCurrentSeason', 'setCurrentEpisode', 'setCurrentLanguage', 'setWatchList']),
		toReadableRole(role) {
			return role == 1 ? 'Owner' : 'Viewer';
		},
		promote() {
			console.log('This Function is currently unsupported');
			this.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `This Function is currently unsupported`,
				timerProgressBar: true,
			});
		},
		deepPlayback(state, time) {
			if (!this.isOwner) return;
			console.log('deepPlayback() Emitting sync-video-action: "sync-playback" with value:', state);
			this.$socket.emit('sync-video-action', { action: 'sync-playback', value: state, time });
		},
		deepSkip(time) {
			if (!this.isOwner) return;
			console.log('deepSkip() Emitting sync-video-action: "sync-skip" with value:', time);
			this.$socket.emit('sync-video-action', { action: 'sync-skip', value: time });
		},
		deepSkipTimeline(time) {
			if (!this.isOwner) return;
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
			try {
				await this.handleVideoChange(-1, -1, -1);
			} catch (error) {
				console.error('selectSeries()', error);
			}
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
			return new Promise((resolve, reject) => {
				console.log('Came', 0);
				if (!silent && !this.isOwner) return reject('!silent && !this.isOwner');
				console.log('Came', 1);
				if (langchange && this.currentLanguage == lang) return reject('langchange && this.currentLanguage == lang');
				const video = document.querySelector('video');
				if (!video) return reject('!video');
				console.log('Came', 2);

				//TODO: Maybe add here default language from user prefered settings
				let defaultLanguage = 'GerDub';

				const wasPaused = video.paused;
				const prevTime = video.currentTime;

				console.log('GOT handleVideoChange() EMIT to Server', { season, episode, movie, langchange, lang: langchange ? lang : defaultLanguage });
				!silent && this.$socket.emit('sync-video-change', { season, episode, movie, langchange, lang: langchange ? lang : defaultLanguage });
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
						return resolve();
					}, 100);
				}, 200);
			});
		},
	},
	async mounted() {
		const debug = false;
		debug && console.log('mounted() SyncRoom', JSON.stringify(this.currentRoom, null, 3));
		if (this.currentRoom == undefined) {
			await this.loadRooms();
			const roomID = Number(this.$route.params.key);
			debug && console.log(roomID, this.series);
			await this.joinRoom(roomID);
		}
		await this.selectSeries(this.currentRoom?.seriesID, false);
		debug && console.log('this.currentRoom?.entityInfos?', JSON.stringify(this.currentRoom?.entityInfos));
		debug && console.log('mounted(), currentRoom', this.currentRoom);
		setTimeout(async () => {
			debug &&
				console.log(
					'setTimeout() videoChange',
					parseInt(this.currentRoom?.entityInfos?.season),
					parseInt(this.currentRoom?.entityInfos?.episode),
					parseInt(this.currentRoom?.entityInfos?.movie)
				);
			if (this.currentLanguage == this.currentRoom?.entityInfos?.lang) {
				debug && console.log('handleVideoChange', 1);
				try {
					await this.handleVideoChange(
						parseInt(this.currentRoom?.entityInfos?.season),
						parseInt(this.currentRoom?.entityInfos?.episode),
						parseInt(this.currentRoom?.entityInfos?.movie),
						false,
						undefined,
						true
					);
				} catch (error) {
					console.error('handleVideoChange', 1, error);
				}
			} else {
				debug && console.log('handleVideoChange', 2);
				try {
					await this.handleVideoChange(
						parseInt(this.currentRoom?.entityInfos?.season),
						parseInt(this.currentRoom?.entityInfos?.episode),
						parseInt(this.currentRoom?.entityInfos?.movie),
						true,
						this.currentRoom?.entityInfos?.lang,
						true
					);
				} catch (error) {
					console.error('handleVideoChange', 2, error);
				}
			}
			if (this.isOwner == false) {
				console.log('Performing Headsup');
				const response = await this.$networking.get(`/room/${this.currentRoom.ID}/headsup`);
				if (response.success == true) {
					setTimeout(() => {
						console.log('Setting headsup', this.entityObject);
						this.$refs.extendedVideoChild?.trigger('sync-playback', response.json.isPlaying, response.json.currentTime);
					}, 900);
				}
			}
		}, 800);
		this.$socket.on('sync-video-action', ({ action, value, time }) => {
			if (action == 'sync-playback') {
				// value = true = Play
				// Value = false = Pause
				this.$refs.extendedVideoChild?.trigger(action, value, time);
			} else if (action == 'sync-skip') {
				// The Skip if you click the arrow keys or number keys
				this.$refs.extendedVideoChild?.trigger(action, value);
			} else if (action == 'sync-skipTimeline') {
				// The skip if you click on the timeline at any position
				this.$refs.extendedVideoChild?.trigger(action, value);
			}
		});
		this.$socket.on('sync-selectSeries', async ({ ID }) => {
			this.selectSeries(ID, false);
			this.loadRoomInfo();
		});

		this.$socket.on('sync-video-change', async ({ season, episode, movie, langchange, lang }) => {
			this.handleVideoChange(season, episode, movie, langchange, lang, true);
			this.loadRoomInfo();
		});

		this.$socket.on('sync-video-info', () => {
			if (!this.isOwner) return;
			this.$socket.emit('sync-video-info', {
				currentTime: this.$refs.extendedVideoChild?.videoData?.currentTime || 0,
				isPlaying: this.$refs.extendedVideoChild?.videoData?.isPlaying || false,
			});
		});
	},
	async unmounted() {
		this.$socket.off('sync-video-action');
		this.$socket.off('sync-selectSeries');
		this.$socket.off('sync-video-change');
		this.$socket.off('sync-video-info');
		await this.leaveRoom();
	},
};
</script>
<style lang=""></style>
