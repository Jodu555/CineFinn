<template>
	<div>
		<!-- <button type="button" class="btn btn-outline-info" @click="handleResize">Recalc Window width</button> -->

		<div v-if="!inSyncRoom">
			<ShareModal />
			<RmvcModal :switchTo="switchTo" :skip="skip" />
		</div>
		<div style="margin-top: 0.5%" class="video-container paused" data-volume-level="high">
			<img class="thumbnail-img" />
			<div v-if="entityObject && settings.showVideoTitleContainer.value" class="video-title-container">
				<p v-if="currentMovie == -1">
					{{ entityObject.primaryName }} - {{ String((entityObject as SerieEpisode).season).padStart(2, '0') }}x{{
						String((entityObject as SerieEpisode).episode).padStart(2, '0')
					}}
				</p>
				<p v-if="currentMovie !== -1">
					{{ entityObject.primaryName }}
				</p>
			</div>
			<ActorContainer v-if="false" />
			<font-awesome-icon class="skip skip-left" size="2xl" icon="fa-solid fa-backward" />

			<div class="middle-play">
				<button type="button" @click="togglePlay()">
					<font-awesome-icon v-if="!videoData.isPlaying" size="4x" icon="fa-solid fa-play" />
					<font-awesome-icon v-else size="4x" icon="fa-solid fa-pause" />
				</button>
			</div>

			<font-awesome-icon class="skip skip-right" size="2xl" icon="fa-solid fa-forward" />
			<div
				:class="{
					'btn-intro-skip-container': true,
					enabled: isInterceptingWithIntro || isInterceptingWithOutro,
				}">
				<button type="button" @click="skipSegment" class="btn btn-light">
					Skip {{ isInterceptingWithIntro ? 'Intro' : 'Outro' }} <font-awesome-icon size="lg" icon="fa-solid fa-forward" />
				</button>
			</div>
			<div v-show="!dataLoading" class="video-controls-container">
				<div class="timeline-container">
					<div class="timeline">
						<div
							v-for="segment in segmentData"
							class="timeline-intro-skip"
							:style="{
								'--intro-skip-start': segment.startms / videoData.duration,
								'--intro-skip-end': segment.endms / videoData.duration,
							}"></div>

						<div
							v-for="i in videoData.buffered?.length"
							v-show="Math.round(Math.abs(videoData.buffered?.start(i - 1) - videoData.buffered?.end(i - 1))) > 10"
							class="timeline-buffer"
							:style="{
								'--buffer-start': videoData.buffered?.start(i - 1) / videoData.duration,
								'--buffer-end': videoData.buffered?.end(i - 1) / videoData.duration,
								// '--length': Math.round(Math.abs($refs.mainVid.buffered?.start(i - 1) - $refs.mainVid.buffered?.end(i - 1))),
							}"></div>

						<!-- <span v-for="i in videoData.buffered?.length">
							{{ $refs.mainVid.buffered?.start(i - 1)  }}ms - {{ $refs.mainVid.buffered?.end(i -1) }}ms = {{ Math.round(Math.abs($refs.mainVid.buffered?.start(i - 1) - $refs.mainVid.buffered?.end(i -1))) }}ms
						</span> -->
						<img class="preview-img" />
						<div class="thumb-indicator"></div>
						<p class="time-info-timeline-indicator">55:55</p>
					</div>
				</div>
				<div class="controls">
					<button title="Toggle Video State" class="play-pause-btn">
						<svg class="play-icon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
						</svg>
						<svg class="pause-icon" viewBox="0 0 24 24">
							<path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
						</svg>
					</button>
					<div class="volume-container">
						<button class="mute-btn">
							<svg class="volume-high-icon" viewBox="0 0 24 24">
								<path
									fill="currentColor"
									d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
							</svg>
							<svg class="volume-low-icon" viewBox="0 0 24 24">
								<path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
							</svg>
							<svg class="volume-muted-icon" viewBox="0 0 24 24">
								<path
									fill="currentColor"
									d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />
							</svg>
						</button>
						<input class="volume-slider" type="range" min="0" max="1" step="any" value="1" />
					</div>
					<div class="duration-container">
						<div class="current-time">0:00</div>
						/
						<div class="total-time"></div>
					</div>
					<button v-if="!inSyncRoom && screenWidth >= 470" title="RMVC Controls" data-bs-toggle="modal" data-bs-target="#rmvcModal">
						<font-awesome-icon icon="fa-solid fa-network-wired" />
					</button>
					<button v-if="!inSyncRoom" title="Share Video" data-bs-toggle="modal" data-bs-target="#shareModal">
						<font-awesome-icon icon="fa-solid fa-share" size="lg" />
					</button>
					<button v-if="screenWidth >= 480" title="Previous Episode" @click="switchTo(-1)">
						<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M0 18H2L2 0H0L0 18ZM17.7139 17.3827C18.7133 17.9977 20 17.2787 20 16.1052L20 1.8948C20 0.7213 18.7133 0.00230002 17.7139 0.6173L6.1679 7.7225C5.2161 8.3082 5.2161 9.6918 6.1679 10.2775L17.7139 17.3827ZM18 2.7896V15.2104L7.908 9L18 2.7896Z"
								fill="currentColor" />
						</svg>
					</button>
					<button title="Next Episode" @click="switchTo(1)">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="Hawkins-Icon Hawkins-Icon-Standard">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M22 3H20V21H22V3ZM4.28615 3.61729C3.28674 3.00228 2 3.7213 2 4.89478V19.1052C2 20.2787 3.28674 20.9977 4.28615 20.3827L15.8321 13.2775C16.7839 12.6918 16.7839 11.3082 15.8321 10.7225L4.28615 3.61729ZM4 18.2104V5.78956L14.092 12L4 18.2104Z"
								fill="currentColor"></path>
						</svg>
					</button>
					<button v-if="screenWidth >= 380" title="Toggle Video Speed" class="speed-btn wide-btn">1x</button>
					<button title="Toggle Mini Player" class="mini-player-btn">
						<svg viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z" />
						</svg>
					</button>
					<button v-if="screenWidth >= 450" title="Toggle Theatre Player" class="theater-btn">
						<svg class="tall" viewBox="0 0 24 24">
							<path fill="currentColor" d="M19 6H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H5V8h14v8z" />
						</svg>
						<svg class="wide" viewBox="0 0 24 24">
							<path fill="currentColor" d="M19 7H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 8H5V9h14v6z" />
						</svg>
					</button>
					<button title="Toggle Fullscreen Player" class="full-screen-btn">
						<svg class="open" viewBox="0 0 24 24">
							<path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
						</svg>
						<svg class="close" viewBox="0 0 24 24">
							<path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
						</svg>
					</button>
				</div>
			</div>
			<div v-if="videoLoading" class="video-spinner-container">
				<div class="spinner-border text-light video-spinner" role="status">
					<span class="visually-hidden">Loading...</span>
				</div>
			</div>
			<pre class="internal-video-devinfos" v-if="settings.developerMode.value">
				VideoLoading: {{ videoLoading }} 
				ReadyState: {{ videoData.readyState }} 
				CurrentTime: {{ videoData.currentTime }}ms
				Duration: {{ videoData.duration }}ms
				Progress: {{ videoData.duration - videoData.currentTime }}ms
				Volume: {{ videoData.volume }}
				Quality: T{{ videoData.quality?.totalVideoFrames }} / D{{ videoData.quality?.droppedVideoFrames }} / C{{ videoData.quality?.corruptedVideoFrames }}
				IntroData: {{ JSON.stringify(segmentData) }}
				AlreadySkipped: {{ JSON.stringify(alreadySkipped) }}
				Buffers: 
					{{ videoData.bufferedPercentage }}% / 100%
					<div class="internal-video-devinfos-child">
						<span v-for="i in videoData.buffered?.length">
							{{ videoData.buffered?.start(i - 1)  }}ms - {{ videoData.buffered?.end(i -1) }}ms = {{ Math.round(Math.abs(videoData.buffered?.start(i - 1) - videoData.buffered?.end(i -1))) }}ms
						</span>
					</div>
				Seekable: 
					<div class="internal-video-devinfos-child">
						<span v-for="i in videoData.seekable?.length">
							{{ ($refs.mainVid as HTMLVideoElement).seekable?.start(i - 1)  }}ms - {{ ($refs.mainVid as HTMLVideoElement).seekable?.end(i -1) }}ms = {{ Math.round(Math.abs(($refs.mainVid as HTMLVideoElement).seekable?.start(i - 1) - ($refs.mainVid as HTMLVideoElement).seekable?.end(i -1))) }}ms
						</span>
					</div>
			</pre>
			<video ref="mainVid" preload="auto" oncontextmenu="return false" playsinline :src="videoSrc"></video>
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapState, mapWritableState, mapActions } from 'pinia';
import { throttle } from '@/utils/debounceAndThrottle';
import ActorContainer from '@/components/Watch/ActorContainer.vue';
import ShareModal from '@/components/Watch/ShareModal.vue';
import RmvcModal from '@/components/Watch/RmvcModal.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useWatchStore } from '@/stores/watch.store';
import type { SerieEpisode } from '@/types';
import { useAxios, useBaseURL } from '@/utils';

interface Segment {
	type: 'intro' | 'outro';
	startms: number;
	endms: number;
}

export default defineComponent({
	components: { ActorContainer, ShareModal, RmvcModal },
	props: {
		switchTo: { type: Function as PropType<(vel: number) => void>, required: true },
		sendVideoTimeUpdate: { type: Function as PropType<(time: number) => void>, required: true },
		inSyncRoom: { type: Boolean, default: false },
		canPlay: { type: Boolean, default: true },
		events: { type: Object, default: {} },
	},
	expose: ['videoData', 'videoLoading', 'trigger'],
	data() {
		return {
			cleanupFN: () => {},
			skip: (num: number, set?: boolean, server?: boolean) => {},
			skipPercent: (num: number) => {},
			togglePlay: () => {},
			videoLoading: false,
			dataLoading: false,
			videoData: {
				readyState: 0,
				isPlaying: false,
				currentTime: 0,
				duration: 0,
				volume: 0,
				quality: { creationTime: 0, totalVideoFrames: 0, droppedVideoFrames: 0, corruptedVideoFrames: 0 },
				buffered: [] as any as TimeRanges,
				bufferedPercentage: '0',
				seekable: [] as any as TimeRanges,
			},
			screenWidth: window.innerWidth,
			segmentData: [] as Segment[],
			alreadySkipped: [] as string[],
		};
	},
	computed: {
		...mapWritableState(useWatchStore, ['currentSeries', 'currentMovie', 'currentLanguage']),
		...mapWritableState(useAuthStore, ['authToken', 'settings']),
		...mapState(useWatchStore, ['videoSrc', 'entityObject']),
		isInterceptingWithIntro(): boolean {
			const introSegment = this.segmentData.find((x) => x.type == 'intro');
			return Boolean(introSegment && this.videoData?.currentTime >= introSegment?.startms && this.videoData?.currentTime <= introSegment?.endms);
		},
		isInterceptingWithOutro(): boolean {
			const outroSegment = this.segmentData.find((x) => x.type == 'outro');
			return Boolean(outroSegment && this.videoData?.currentTime >= outroSegment?.startms && this.videoData?.currentTime <= outroSegment?.endms);
		},
	},
	async mounted() {
		const { skip, skipPercent, togglePlay, cleanupFN } = this.initialize();
		this.togglePlay = togglePlay;
		this.skip = skip;
		this.skipPercent = skipPercent;
		this.cleanupFN = cleanupFN;
		await this.loadIntroData();
	},
	beforeUnmount() {
		this.cleanupFN();
	},
	watch: {
		'settings.volume.value'(newValue) {
			const video = document.querySelector('video');
			video!.volume = newValue;
		},
		async videoSrc() {
			this.segmentData = [];
			await this.loadIntroData();
		},
	},
	created() {
		window.addEventListener('resize', this.handleResize);
	},
	destroyed() {
		window.removeEventListener('resize', this.handleResize);
	},
	methods: {
		...mapActions(useAuthStore, ['updateSettings']),
		handleResize() {
			console.log(window.innerWidth);
			this.screenWidth = window.innerWidth;
		},
		generatePreviewImageURL(previewImgNumber: number) {
			let previewImgSrc = '';
			if (this.currentSeries != undefined && this.currentSeries.ID != '-1') {
				previewImgSrc = `${useBaseURL()}/images/${this.currentSeries.ID}/previewImages/`;
				if (this.currentMovie != -1 && this.currentMovie != undefined) {
					previewImgSrc += `Movies/${this.currentSeries.movies[this.currentMovie - 1].primaryName}`;
				} else {
					previewImgSrc += `${(this.entityObject as SerieEpisode).season}-${(this.entityObject as SerieEpisode).episode}`;
				}
				previewImgSrc += `/${this.currentLanguage}/preview${previewImgNumber}.jpg?auth-token=${this.authToken}`;
			}
			return previewImgSrc;
		},
		skipSegment() {
			if (this.isInterceptingWithIntro) {
				console.log('Skipped Intro: ButtonSkip');
				const segmentEndMs = this.segmentData.find((x) => x.type == 'intro')?.endms;
				if (segmentEndMs) this.skip(segmentEndMs + 2, true);
			}
			if (this.isInterceptingWithOutro) {
				console.log('Skipped Outro: ButtonSkip');
				const segmentEndMs = this.segmentData.find((x) => x.type == 'outro')?.endms;
				if (segmentEndMs) this.skip(segmentEndMs + 2, true);
			}
		},
		async loadIntroData() {
			this.alreadySkipped = [];
			if (true) {
				try {
					const response = await useAxios().get(
						`/segments/info/${this.currentSeries.ID}/${(this.entityObject as SerieEpisode).season}/${(this.entityObject as SerieEpisode).episode}`
					);
					// const response = await fetch(
					// 	`http://localhost:4897/segments/info/${this.currentSeries.ID}/${(this.entityObject as SerieEpisode).season}/${
					// 		(this.entityObject as SerieEpisode).episode
					// 	}`
					// );
					// const json = await response.json();
					// this.segmentData = json;
					if (response.status === 200) {
						this.segmentData = response.data;
					}
				} catch (error) {
					console.error('It was not possible to load any intro data maybe because the system is not available');
				}
			}
		},
		trigger(action: string, value: number | boolean, time: number) {
			console.log(action, value, time);
			if (action == 'sync-playback') {
				const video = document.querySelector('video');
				if (value) {
					video!.currentTime = time;
					video!.play();
				} else {
					video!.currentTime = time;
					video!.pause();
				}
			}
			if (action == 'sync-skip') {
				console.log('came');
				this.skip(value as number, true, true);
			}
			if (action == 'sync-skipTimeline') {
				this.skip(value as number, true, true);
			}
		},
		initialize() {
			const TIME_UPDATE_THROTTLE = 1000;
			const v = this;
			const playPauseBtn = document.querySelector('.play-pause-btn') as HTMLButtonElement;
			const theaterBtn = document.querySelector('.theater-btn') as HTMLButtonElement;
			const fullScreenBtn = document.querySelector('.full-screen-btn') as HTMLButtonElement;
			const miniPlayerBtn = document.querySelector('.mini-player-btn') as HTMLButtonElement;
			const muteBtn = document.querySelector('.mute-btn') as HTMLButtonElement;
			const speedBtn = document.querySelector('.speed-btn') as HTMLButtonElement;
			const currentTimeElem = document.querySelector('.current-time') as HTMLDivElement;
			const totalTimeElem = document.querySelector('.total-time') as HTMLDivElement;
			const previewImg = document.querySelector('.preview-img') as HTMLImageElement;
			const thumbnailImg = document.querySelector('.thumbnail-img') as HTMLImageElement;
			const volumeSlider = document.querySelector('.volume-slider') as HTMLInputElement;
			const videoContainer = document.querySelector('.video-container') as HTMLDivElement;
			const timelineContainer = document.querySelector('.timeline-container') as HTMLDivElement;
			const skipLeft = document.querySelector('.skip-left') as HTMLButtonElement;
			const skipRight = document.querySelector('.skip-right') as HTMLButtonElement;
			const video = document.querySelector('video') as HTMLVideoElement;
			let isScrubbing = false;
			let wasPaused: boolean;
			//All Document Listeners (which needed to be cleaned up)
			document.addEventListener('keydown', documentKeyDown);
			document.addEventListener('mouseup', documentMouseUp);
			document.addEventListener('mousemove', documentMouseMove);
			document.addEventListener('fullscreenchange', documentFullScreenChange);
			//Key Controls
			function documentKeyDown(e: KeyboardEvent) {
				const tagName = document.activeElement?.tagName.toLowerCase();
				if (tagName === 'input') return;
				switch (e.key.toLowerCase()) {
					case ' ':
						if (tagName === 'button') return;
					case 'k':
						togglePlay();
						break;
					case 'f':
						toggleFullScreenMode();
						break;
					case 't':
						toggleTheaterMode();
						break;
					case 'i':
						toggleMiniPlayerMode();
						break;
					case 'm':
						toggleMute();
						break;
					case 'arrowleft':
					case 'j':
						skip(-5);
						break;
					case 'arrowright':
					case 'l':
						skip(5);
						break;
					case '.':
						skip(0.333333333);
						break;
					case ',':
						skip(-0.333333333);
						break;
					case 'arrowup':
						e.preventDefault();
						try {
							video.volume += 0.1;
						} catch (_) {}
						break;
					case 'arrowdown':
						e.preventDefault();
						try {
							video.volume -= 0.1;
						} catch (_) {}
						break;
					case 'n':
						v.switchTo(1);
						break;
					case 'p':
						v.switchTo(-1);
						break;
					case '1':
					case '2':
					case '3':
					case '4':
					case '5':
					case '6':
					case '7':
					case '8':
					case '9':
					case '0':
						skipPercent(Number(e.key.toLowerCase()));
						break;
				}
			}

			//Vue Video
			function updateVueVideoData() {
				const { creationTime, totalVideoFrames, droppedVideoFrames, corruptedVideoFrames } = video.getVideoPlaybackQuality();

				let bufferedTime = 0;
				for (let i = 0; i < video.buffered.length; i++) {
					try {
						bufferedTime += video.buffered.end(i) - video.buffered.start(i);
					} catch (error) {}
				}

				const bufferedPercentage = (bufferedTime / video.duration) * 100;

				v.videoLoading = video.readyState < 1;

				v.videoData = {
					isPlaying: !video.paused,
					readyState: video.readyState,
					currentTime: video.currentTime,
					duration: video.duration,
					volume: video.volume,
					quality: { creationTime, totalVideoFrames, droppedVideoFrames, corruptedVideoFrames },
					buffered: video.buffered,
					bufferedPercentage: bufferedPercentage.toFixed(2),
					seekable: video.seekable,
				};
			}

			//Video Container Hover Logic
			var timeoutId: NodeJS.Timeout;

			function resetTimeout() {
				clearTimeout(timeoutId);
				timeoutId = setTimeout(() => {
					videoContainer.classList.remove('hovered');
					videoContainer.style.cursor = 'none';
				}, 5000);
				videoContainer.classList.add('hovered');
			}

			videoContainer.addEventListener('mouseover', function () {
				videoContainer.classList.add('hovered');
				resetTimeout();
			});

			videoContainer.addEventListener('mouseout', function () {
				videoContainer.classList.remove('hovered');
				videoContainer.style.cursor = '';
			});

			videoContainer.addEventListener('mousemove', function () {
				resetTimeout();
				videoContainer.style.cursor = '';
			});

			// Timeline
			function documentMouseUp(e: MouseEvent) {
				if (isScrubbing) toggleScrubbing(e);
			}
			function documentMouseMove(e: MouseEvent) {
				if (isScrubbing) handleTimelineUpdate(e);
			}
			// Fullscreen
			function documentFullScreenChange() {
				videoContainer.classList.toggle('full-screen', Boolean(document.fullscreenElement));
				videoContainer.scrollIntoView();
			}
			//Timeline
			timelineContainer.addEventListener('mousemove', handleTimelineUpdate);
			timelineContainer.addEventListener('mousedown', toggleScrubbing);
			function toggleScrubbing(e: MouseEvent) {
				if (!v.canPlay) {
					return;
				}
				const rect = timelineContainer.getBoundingClientRect();
				const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
				isScrubbing = (e.buttons & 1) === 1;
				videoContainer.classList.toggle('scrubbing', isScrubbing);
				if (isScrubbing) {
					wasPaused = video.paused;
					video.pause();
				} else {
					if (v.events?.skipTimeline) {
						v.events.skipTimeline(percent * video.duration);
					}
					video.currentTime = percent * video.duration;
					if (!wasPaused) video.play();
				}
				handleTimelineUpdate(e);
			}
			function handleTimelineUpdate(e: MouseEvent) {
				const rect = timelineContainer.getBoundingClientRect();
				const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
				(document.querySelector('.time-info-timeline-indicator') as HTMLDivElement).innerText = formatDuration(percent * video.duration);
				const previewImgNumber = Math.max(1, Math.floor((percent * video.duration) / 10));
				const previewImgSrc = v.generatePreviewImageURL(previewImgNumber);
				previewImg.src = previewImgSrc;
				timelineContainer.style.setProperty('--preview-position', String(percent));
				if (isScrubbing) {
					e.preventDefault();
					thumbnailImg.src = previewImgSrc;
					timelineContainer.style.setProperty('--progress-position', String(percent));
				}
			}
			// Playback Speed
			speedBtn?.addEventListener('click', changePlaybackSpeed);
			function changePlaybackSpeed() {
				let newPlaybackRate = video.playbackRate + 0.25;
				if (newPlaybackRate > 2) newPlaybackRate = 0.25;
				video.playbackRate = newPlaybackRate;
				speedBtn.textContent = `${newPlaybackRate}x`;
			}
			// Duration
			video.addEventListener('loadeddata', () => {
				totalTimeElem.textContent = formatDuration(video.duration);
				console.log('loading got data...');
				v.dataLoading = false;
			});
			// video.addEventListener('progress', () => {
			// 	console.log('progress');
			// });
			video.addEventListener('loadstart', () => {
				v.videoLoading = true;
				v.dataLoading = true;
			});
			video.addEventListener('canplay', () => {
				updateVueVideoData();
				v.videoLoading = false;
			});
			video.addEventListener('seeking', () => {
				v.videoLoading = true;
			});
			video.addEventListener('stalled', async () => {
				console.log('stalled, the internet seems to be missing video could not be loaded');
				v.videoLoading = true;
				setTimeout(async () => {
					if (video.readyState !== 4) {
						console.log('Attemting Restart');
						const time = video.currentTime;
						video.load();
						await video.play();
						v.videoLoading = false;
						video.currentTime = time;
					}
				}, 1000 * 15);
			});
			video.addEventListener('waiting', () => {
				console.log('waiting for data (no current data but video still playing cause of buffering)');
			});
			video.addEventListener('error', (event) => {
				console.error('Error loading: Video');
				v.videoLoading = true;
			});

			video.addEventListener('progress', () => {
				// updateBuffer();
				updateVueVideoData();
			});

			video.addEventListener('durationchange', () => {
				updateVueVideoData();
			});
			video.volume = parseFloat(String(v.settings.volume.value));

			function updateBuffer() {
				// let max = -Infinity;
				// for (let i = 0; i < video.buffered.length; i++) {
				// 	const time = video.buffered.end(i);
				// 	if (time > max) {
				// 		max = time;
				// 	}
				// }
				// const bufferPercent = max / video.duration;
				// document.querySelector('.timeline-buffer').style.setProperty('--buffer-position', bufferPercent);
			}

			const timeUpdateThrottle = throttle(v.sendVideoTimeUpdate as any, TIME_UPDATE_THROTTLE);
			video.addEventListener('timeupdate', () => {
				updateVueVideoData();
				// updateBuffer();
				timeUpdateThrottle(video.currentTime);
				currentTimeElem.textContent = formatDuration(video.currentTime);
				let percent = video.currentTime / video.duration;
				percent = isNaN(percent) ? 0 : percent;
				timelineContainer.style.setProperty('--progress-position', String(percent));
				if (this.settings?.autoSkip.value == true && video.currentTime == video.duration) {
					this.switchTo(1);
					setTimeout(() => {
						video.play();
					}, 400);
				}
				if (
					(this.isInterceptingWithIntro && !this.alreadySkipped.find((x) => x == 'intro')) ||
					(this.isInterceptingWithOutro && !this.alreadySkipped.find((x) => x == 'outro'))
				) {
					if (this.settings?.autoSkip?.value == true) {
						const segment = this.segmentData.find((x) => x.type == (this.isInterceptingWithIntro ? 'intro' : 'outro'));
						if (!segment) return;
						//Add 2 so the function does not loop itself
						console.log('Skipped ', segment.type.toUpperCase(), ': AutoSkip');
						this.alreadySkipped.push(segment.type);
						skip(segment.endms + 2, true);
					}
				}
			});
			const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
				minimumIntegerDigits: 2,
			});
			function formatDuration(time: number) {
				const seconds = Math.floor(time % 60);
				const minutes = Math.floor(time / 60) % 60;
				const hours = Math.floor(time / 3600);
				if (hours === 0) {
					return `${minutes}:${leadingZeroFormatter.format(seconds)}`;
				} else {
					return `${hours}:${leadingZeroFormatter.format(minutes)}:${leadingZeroFormatter.format(seconds)}`;
				}
			}
			function skipPercent(percent: number) {
				percent = percent * 10;
				const max = video.duration;
				const duration = (max / 100) * percent;
				skip(duration, true);
			}
			function skip(duration: number, set = false, server = false) {
				if (v.canPlay == false && server == false) return;
				if (v.events?.skip && server == false) {
					v.events?.skip(set ? duration : video.currentTime + duration);
				}
				const animationDuration = 400;
				const doIconAnimation = Math.abs(duration) > 1 || Math.abs(duration) == 0;
				let pref = '';
				let sel;
				if ((!set && duration >= 0) || duration > video.currentTime) {
					sel = skipRight;
				} else {
					pref = '-';
					sel = skipLeft;
				}

				if (doIconAnimation) {
					videoContainer.classList.add('skipping');
					sel.animate([{ transform: 'translateX(0px)', opacity: '1' }, { transform: `translateX(${pref}60px)` }], {
						duration: animationDuration,
						iterations: 1,
					});
				}
				if (set) {
					video.currentTime = duration;
				} else {
					video.currentTime += duration;
				}

				if (doIconAnimation)
					setTimeout(() => {
						videoContainer.classList.remove('skipping');
					}, animationDuration - 100);
			}
			// Volume
			muteBtn.addEventListener('click', toggleMute);
			volumeSlider.addEventListener('input', (e) => {
				const target = e.target as HTMLInputElement;
				video.volume = parseFloat(target.value);
				video.muted = target.value === '0';
			});
			function toggleMute() {
				video.muted = !video.muted;
			}
			video.addEventListener('volumechange', () => {
				volumeSlider.value = String(video.volume);
				let volumeLevel;
				if (video.muted || video.volume === 0) {
					volumeSlider.value = '0';
					volumeLevel = 'muted';
				} else if (video.volume >= 0.5) {
					volumeLevel = 'high';
				} else {
					volumeLevel = 'low';
				}
				if (v.settings.volume.value !== video.volume && video.volume != 0) {
					console.log('KEKW I AM AN IDIOT', Date.now(), v.settings.volume.value, video.volume);

					v.settings.volume.value = video.volume;
					v.updateSettings();
				}
				videoContainer.dataset.volumeLevel = volumeLevel;
			});
			// View Modes
			theaterBtn?.addEventListener('click', toggleTheaterMode);
			fullScreenBtn.addEventListener('click', toggleFullScreenMode);
			miniPlayerBtn.addEventListener('click', toggleMiniPlayerMode);
			function toggleTheaterMode() {
				videoContainer.classList.toggle('theater');
			}
			function toggleFullScreenMode() {
				if (document.fullscreenElement == null) {
					videoContainer.requestFullscreen();
				} else {
					document.exitFullscreen();
				}
			}
			function toggleMiniPlayerMode() {
				if (videoContainer.classList.contains('mini-player')) {
					document.exitPictureInPicture();
				} else {
					video.requestPictureInPicture();
				}
			}
			video.addEventListener('enterpictureinpicture', () => {
				videoContainer.classList.add('mini-player');
			});
			video.addEventListener('leavepictureinpicture', () => {
				videoContainer.classList.remove('mini-player');
			});
			// Play/Pause
			playPauseBtn.addEventListener('click', togglePlay);
			// video.addEventListener('click', togglePlay);
			let touchTimeout: NodeJS.Timeout | null = null;
			video.addEventListener('pointerdown', (ev) => {
				console.log(ev.pointerType);
				if (ev.pointerType == 'mouse') {
					//Only Left click should pause / play
					if (ev.button == 0) {
						togglePlay();
					}
				} else {
					if (!videoContainer.classList.contains('paused')) {
						//Triggere the paused state shortly so the icons get shown
						videoContainer.classList.add('paused');
					}
					videoContainer.classList.remove('paused');
					videoContainer.classList.add('touched');
					if (touchTimeout != null) clearTimeout(touchTimeout);
					touchTimeout = setTimeout(() => {
						videoContainer.classList.remove('touched');
						touchTimeout = null;
					}, 5 * 1000);
				}
			});
			function togglePlay() {
				if (!v.canPlay) return;
				video.paused ? video.play() : video.pause();
				updateVueVideoData();
			}
			video.addEventListener('play', () => {
				if (v.events?.playback) {
					v.events.playback(true, video.currentTime);
				}
				videoContainer.classList.remove('paused');
			});
			video.addEventListener('pause', () => {
				if (v.events?.playback) {
					v.events.playback(false, video.currentTime);
				}
				videoContainer.classList.add('paused');
			});

			//Mobile Accessibillity
			let tapedTwice = false;
			let prevDblTapTimeout: NodeJS.Timeout;
			video.addEventListener(
				'touchstart',
				(event) => {
					const isIntersecting = () => {
						const { top, left, width } = video.getBoundingClientRect();

						const localX = event.touches[0].clientX - left;

						const middle = top == 0 && left == 0 ? window.innerWidth / 2 : width / 2;
						const max = top == 0 && left == 0 ? window.innerWidth : width;

						let value = false;
						let velocity = 0;

						if (localX > 0 && localX < middle) {
							value = true;
							velocity = -5;
							// console.log('Intersection left');
						}
						if (localX > middle && localX < max) {
							value = true;
							velocity = 5;
							// console.log('Intersection right');
						}

						return { value, velocity };
					};

					if (!isIntersecting().value) return;

					if (!tapedTwice) {
						tapedTwice = true;
						setTimeout(() => {
							tapedTwice = false;
						}, 300);
						return false;
					}

					// console.log('You tapped me Twice !!!');

					const out = isIntersecting();
					if (out.value) {
						skip(out.velocity);
					}

					if (prevDblTapTimeout) clearTimeout(prevDblTapTimeout);

					prevDblTapTimeout = setTimeout(() => {
						video.play();
					}, 301);
				},
				{ passive: true }
			);

			return {
				skip,
				skipPercent,
				togglePlay,
				cleanupFN: () => {
					document.removeEventListener('keydown', documentKeyDown);
					document.removeEventListener('mouseup', documentMouseUp);
					document.removeEventListener('mousemove', documentMouseMove);
					document.removeEventListener('fullscreenchange', documentFullScreenChange);
				},
			};
		},
	},
});
</script>
<style scoped>
.btn-intro-skip-container {
	pointer-events: none;
	position: absolute;
	bottom: 3.3rem;
	right: 1rem;
	opacity: 0;
	transition: opacity 300ms ease-in-out;
}
.btn-intro-skip-container.enabled {
	pointer-events: auto;
	opacity: 1;
	z-index: 500;
	transition: opacity 300ms ease-in-out;
}

.internal-video-devinfos-child {
	line-height: 0.8;
	margin-left: -10%;
	margin-top: -3%;
	margin-bottom: -3%;
}
.internal-video-devinfos {
	position: absolute;
	top: 10%;
	left: 0;
	right: 5%;
	background-color: rgba(0, 0, 0, 0.75);
	color: white;
	z-index: 100;
	line-height: 1.5;
	margin: 1rem;
	height: 70%;
}

.video-spinner-container {
	position: absolute;
	top: 50%;
}

.video-spinner {
	width: 5rem;
	height: 5rem;
}
.skip {
	position: absolute;
	top: 50%;
	left: 50%;
	color: white;
	opacity: 0;
}

.middle-play button {
	background: none;
	border: none;
	color: white;
}
.middle-play {
	z-index: 100;
	background: none;
	position: absolute;
	border: none;
	top: 50%;
	left: 50%;
	opacity: 0;
	transform: translate(-50%, -50%);
	transition: opacity 150ms ease-in-out;
	cursor: pointer;
	pointer-events: all;
}

.video-container.touched .middle-play {
	pointer-events: all;
	opacity: 1;
}

@keyframes skip {
	50% {
		transform: rotate(0deg);
		opacity: 1;
	}
	100% {
		transform: rotate(360deg);
	}
}

.skip.show {
	opacity: 1;
}

.skip-left {
	left: 20%;
}
.skip-right {
	left: 80%;
}

.video-container.skipping video {
	opacity: 0.6;
}

.video-container.skipping video {
	transition: opacity 400ms ease-in-out;
}

.video-title-container {
	pointer-events: none;
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	color: white;
	z-index: 100;
	margin: 0.5rem;
	font-size: 27px;

	opacity: 0;
	transition: opacity 300ms ease-in-out;
	text-shadow: 2px 2px 10px #000000;
}
/* This was changed */
.video-container.hovered .video-title-container,
.video-container:focus-within .video-title-container,
.video-container.paused .video-title-container {
	opacity: 0.8;
}

*,
*::before,
*::after {
	box-sizing: border-box;
}

body {
	margin: 0;
}

.video-container {
	position: relative;
	width: 90%;
	max-width: 1000px;
	display: flex;
	justify-content: center;
	margin-inline: auto;
	background-color: black;
}

.video-container.theater,
.video-container.full-screen {
	max-width: initial;
	width: 100%;
}

.video-container.theater {
	max-height: 90vh;
}

.video-container.full-screen {
	max-height: 100vh;
}

video {
	width: 100%;
}

.video-controls-container {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	color: white;
	z-index: 100;
	opacity: 0;
	transition: opacity 150ms ease-in-out;
}

.video-controls-container::before {
	content: '';
	position: absolute;
	bottom: 0;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.75), transparent);
	width: 100%;
	aspect-ratio: 6 / 1;
	z-index: -1;
	pointer-events: none;
}
/* This was changed */
.video-container.hovered .video-controls-container,
.video-container:focus-within .video-controls-container,
.video-container.paused .video-controls-container {
	opacity: 1;
}

.video-controls-container .controls {
	display: flex;
	gap: 0.5rem;
	padding: 0.25rem;
	align-items: center;
}

.video-controls-container .controls button {
	background: none;
	border: none;
	color: inherit;
	padding: 0;
	height: 30px;
	width: 30px;
	font-size: 1.1rem;
	cursor: pointer;
	opacity: 0.85;
	transition: opacity 150ms ease-in-out;
}

.video-controls-container .controls button:hover {
	opacity: 1;
}

/* TODO: Change ME  */

.video-container.paused .pause-icon {
	display: none;
}

.video-container:not(.paused) .play-icon {
	display: none;
}

.video-container.theater .tall {
	display: none;
}

.video-container:not(.theater) .wide {
	display: none;
}

.video-container.full-screen .open {
	display: none;
}

.video-container:not(.full-screen) .close {
	display: none;
}

.volume-high-icon,
.volume-low-icon,
.volume-muted-icon {
	display: none;
}

.video-container[data-volume-level='high'] .volume-high-icon {
	display: block;
}

.video-container[data-volume-level='low'] .volume-low-icon {
	display: block;
}

.video-container[data-volume-level='muted'] .volume-muted-icon {
	display: block;
}

.volume-container {
	display: flex;
	align-items: center;
}

.volume-slider {
	width: 0;
	transform-origin: left;
	transform: scaleX(0);
	transition: width 150ms ease-in-out, transform 150ms ease-in-out;
}

.volume-container:hover .volume-slider,
.volume-slider:focus-within {
	width: 100px;
	transform: scaleX(1);
}

.duration-container {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	flex-grow: 1;
}

.video-container.captions .captions-btn {
	border-bottom: 3px solid red;
}

.video-controls-container .controls button.wide-btn {
	width: 50px;
}

.timeline-container {
	height: 7px;
	margin-inline: 0.5rem;
	cursor: pointer;
	display: flex;
	align-items: center;
}

.timeline {
	background-color: rgba(100, 100, 100, 0.5);
	height: 3px;
	width: 100%;
	position: relative;
}

.timeline-buffer {
	height: 2px;
	width: 100%;
	position: absolute;
}

.timeline-buffer::before {
	content: '';
	position: absolute;
	left: calc(100% - calc(1 - var(--buffer-start)) * 100%);
	top: 0;
	bottom: 0;
	right: calc(100% - var(--buffer-end) * 100%);
	background-color: rgb(99, 99, 99);
	border-radius: 50px;
}

.timeline-intro-skip {
	height: 2px;
	width: 100%;
	position: absolute;
}

.timeline-intro-skip::before {
	z-index: 1;
	content: '';
	position: absolute;
	left: calc(100% - calc(1 - var(--intro-skip-start)) * 100%);
	top: 0;
	bottom: 0;
	right: calc(100% - var(--intro-skip-end) * 100%);
	background-color: rgb(0, 165, 247);
	border-radius: 50px;
}

.timeline::before {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	right: calc(100% - var(--preview-position) * 100%);
	background-color: rgb(150, 150, 150);
	display: none;
	border-radius: 50px;
	z-index: 50;
}

.timeline::after {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	right: calc(100% - var(--progress-position) * 100%);
	background-color: red;
	border-radius: 50px;
	z-index: 51;
}

.timeline .thumb-indicator {
	--scale: 0;
	position: absolute;
	transform: translateX(-50%) scale(var(--scale));
	height: 200%;
	top: -50%;
	left: calc(var(--progress-position) * 100%);
	background-color: red;
	border-radius: 50%;
	transition: transform 150ms ease-in-out;
	aspect-ratio: 1 / 1;
	z-index: 51;
}

.timeline .preview-img {
	position: absolute;
	height: 80px;
	aspect-ratio: 16 / 9;
	top: -1.5rem;
	transform: translate(-50%, -100%);
	left: calc(var(--preview-position) * 100%);
	border-radius: 0.25rem;
	border: 2px solid white;
	display: none;
}

.timeline .time-info-timeline-indicator {
	position: absolute;
	height: 10px;
	top: -1rem;
	transform: translate(-50%, -100%);
	left: calc(var(--preview-position) * 100%);
	display: none;
}

.thumbnail-img {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	width: 100%;
	height: 100%;
	display: none;
}

.video-container.scrubbing .thumbnail-img {
	display: block;
}

.video-container.scrubbing .preview-img,
.timeline-container:hover .time-info-timeline-indicator {
	display: block;
}

.video-container.scrubbing .preview-img,
.timeline-container:hover .preview-img {
	display: block;
}

.video-container.scrubbing .timeline::before,
.timeline-container:hover .timeline::before {
	display: block;
}

.video-container.scrubbing .thumb-indicator,
.timeline-container:hover .thumb-indicator {
	--scale: 1;
}

.video-container.scrubbing .timeline,
.timeline-container:hover .timeline {
	height: 100%;
}

.video-container.scrubbing .timeline-buffer,
.timeline-container:hover .timeline-buffer {
	height: 100%;
}

.video-container.scrubbing .timeline-intro-skip,
.timeline-container:hover .timeline-intro-skip {
	height: 100%;
}
</style>
