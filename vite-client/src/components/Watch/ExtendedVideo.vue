<template>
	<div>
		<ShareModal />
		<div style="margin-top: 0.5%" class="video-container paused" data-volume-level="high">
			<img class="thumbnail-img" />
			<div v-if="entityObject && settings.showVideoTitleContainer.value" class="video-title-container">
				<p v-if="currentMovie == -1">
					{{ entityObject.primaryName }} - {{ String(entityObject.season).padStart(2, '0') }}x{{ String(entityObject.episode).padStart(2, '0') }}
				</p>
				<p v-if="currentMovie !== -1">
					{{ entityObject.primaryName }}
				</p>
			</div>
			<ActorContainer v-if="false" />
			<font-awesome-icon class="skip skip-left" size="2xl" icon="fa-solid fa-backward" />
			<font-awesome-icon class="skip skip-right" size="2xl" icon="fa-solid fa-forward" />
			<div v-show="!dataLoading" class="video-controls-container">
				<div class="timeline-container">
					<div class="timeline">
						<div class="timeline-buffer"></div>
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
									d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"
								/>
							</svg>
							<svg class="volume-low-icon" viewBox="0 0 24 24">
								<path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
							</svg>
							<svg class="volume-muted-icon" viewBox="0 0 24 24">
								<path
									fill="currentColor"
									d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"
								/>
							</svg>
						</button>
						<input class="volume-slider" type="range" min="0" max="1" step="any" value="1" />
					</div>
					<div class="duration-container">
						<div class="current-time">0:00</div>
						/
						<div class="total-time"></div>
					</div>
					<button title="Share Video" data-bs-toggle="modal" data-bs-target="#shareModal" disabled @click="shareModal()">
						<font-awesome-icon icon="fa-solid fa-share" size="lg" />
					</button>
					<button title="Previous Episode" @click="switchTo(-1)">
						<svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M0 18H2L2 0H0L0 18ZM17.7139 17.3827C18.7133 17.9977 20 17.2787 20 16.1052L20 1.8948C20 0.7213 18.7133 0.00230002 17.7139 0.6173L6.1679 7.7225C5.2161 8.3082 5.2161 9.6918 6.1679 10.2775L17.7139 17.3827ZM18 2.7896V15.2104L7.908 9L18 2.7896Z"
								fill="currentColor"
							/>
						</svg>
					</button>
					<button title="Next Episode" @click="switchTo(1)">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="Hawkins-Icon Hawkins-Icon-Standard">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M22 3H20V21H22V3ZM4.28615 3.61729C3.28674 3.00228 2 3.7213 2 4.89478V19.1052C2 20.2787 3.28674 20.9977 4.28615 20.3827L15.8321 13.2775C16.7839 12.6918 16.7839 11.3082 15.8321 10.7225L4.28615 3.61729ZM4 18.2104V5.78956L14.092 12L4 18.2104Z"
								fill="currentColor"
							></path>
						</svg>
					</button>
					<button title="Toggle Video Speed" class="speed-btn wide-btn">1x</button>
					<button title="Toggle Mini Player" class="mini-player-btn">
						<svg viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z"
							/>
						</svg>
					</button>
					<button title="Toggle Theatre Player" class="theater-btn">
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
				CurrentTime: {{ videoData.currentTime }}ms
				Duration: {{ videoData.duration }}ms
				Progress: {{ videoData.duration - videoData.currentTime }}ms
				Volume: {{ videoData.volume }}
				Quality: T{{ videoData.quality?.totalVideoFrames }} / D{{ videoData.quality?.droppedVideoFrames }} / C{{ videoData.quality?.corruptedVideoFrames }}
				Buffers: 
					<div class="internal-video-devinfos-child">
						<span v-for="i in videoData.buffered?.length">
							{{ $refs.mainVid.buffered?.start(i - 1)  }}ms - {{ $refs.mainVid.buffered?.end(i -1) }}ms
						</span>
					</div>
				Seekable: 
					<div class="internal-video-devinfos-child">
						<span v-for="i in videoData.seekable?.length">
							{{ $refs.mainVid.seekable?.start(i - 1)  }}ms - {{ $refs.mainVid.seekable?.end(i -1) }}ms
						</span>
					</div>
			</pre>
			<video ref="mainVid" preload="auto" oncontextmenu="return false" :src="videoSrc"></video>
		</div>
	</div>
</template>
<script>
import { mapState, mapGetters, mapActions } from 'vuex';
import { throttle } from '@/plugins/debounceAndThrottle';
import ActorContainer from './ActorContainer.vue';
import ShareModal from './ShareModal.vue';
export default {
	props: {
		switchTo: { type: Function },
		sendVideoTimeUpdate: { type: Function },
		interaction: { type: Boolean, default: true },
	},
	data() {
		return {
			cleanupFN: null,
			skip: null,
			skipPercent: null,
			videoLoading: false,
			dataLoading: false,
			videoData: {
				currentTime: 0,
				duration: 0,
				volume: 0,
				quality: undefined,
				buffered: undefined,
				seekable: undefined,
			},
		};
	},
	computed: {
		...mapState('watch', ['currentSeries', 'currentMovie', 'currentLanguage']),
		...mapState('auth', ['authToken', 'settings']),
		...mapGetters('watch', ['videoSrc', 'entityObject']),
	},
	async mounted() {
		const { skip, skipPercent, cleanupFN } = this.initialize();
		this.skip = skip;
		this.skipPercent = skipPercent;
		this.cleanupFN = cleanupFN;
	},
	beforeUnmount() {
		this.cleanupFN();
	},
	watch: {
		'settings.volume.value'(newValue) {
			const video = document.querySelector('video');
			video.volume = newValue;
		},
	},
	methods: {
		...mapActions('auth', ['updateSettings']),
		generatePreviewImageURL(previewImgNumber) {
			let previewImgSrc = '';
			if (this.currentSeries != undefined && this.currentSeries.ID != -1) {
				previewImgSrc = `${this.$networking.API_URL}/images/${this.currentSeries.ID}/previewImages/`;
				if (this.currentMovie != -1 && this.currentMovie != undefined) {
					previewImgSrc += `Movies/${this.currentSeries.movies[this.currentMovie - 1].primaryName}/preview${previewImgNumber}.jpg?auth-token=${
						this.authToken
					}`;
				} else {
					previewImgSrc += `${this.entityObject.season}-${this.entityObject.episode}/preview${previewImgNumber}.jpg?auth-token=${this.authToken}`;
				}
			}
			return previewImgSrc;
		},
		initialize() {
			const TIME_UPDATE_THROTTLE = 1000;
			const v = this;
			const playPauseBtn = document.querySelector('.play-pause-btn');
			const theaterBtn = document.querySelector('.theater-btn');
			const fullScreenBtn = document.querySelector('.full-screen-btn');
			const miniPlayerBtn = document.querySelector('.mini-player-btn');
			const muteBtn = document.querySelector('.mute-btn');
			const speedBtn = document.querySelector('.speed-btn');
			const currentTimeElem = document.querySelector('.current-time');
			const totalTimeElem = document.querySelector('.total-time');
			const previewImg = document.querySelector('.preview-img');
			const thumbnailImg = document.querySelector('.thumbnail-img');
			const volumeSlider = document.querySelector('.volume-slider');
			const videoContainer = document.querySelector('.video-container');
			const timelineContainer = document.querySelector('.timeline-container');
			const skipLeft = document.querySelector('.skip-left');
			const skipRight = document.querySelector('.skip-right');
			const video = document.querySelector('video');
			let isScrubbing = false;
			let wasPaused;
			//All Document Listeners (which needed to be cleaned up)
			document.addEventListener('keydown', documentKeyDown);
			document.addEventListener('mouseup', documentMouseUp);
			document.addEventListener('mousemove', documentMouseMove);
			document.addEventListener('fullscreenchange', documentFullScreenChange);
			//Key Controls
			function documentKeyDown(e) {
				const tagName = document.activeElement.tagName.toLowerCase();
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
				v.videoData = {
					currentTime: video.currentTime,
					duration: video.duration,
					volume: video.volume,
					quality: { creationTime, totalVideoFrames, droppedVideoFrames, corruptedVideoFrames },
					buffered: video.buffered,
					seekable: video.seekable,
				};
			}

			//Video Container Hover Logic
			var timeoutId;

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
			function documentMouseUp(e) {
				if (isScrubbing) toggleScrubbing(e);
			}
			function documentMouseMove(e) {
				if (isScrubbing) handleTimelineUpdate(e);
			}
			// Fullscreen
			function documentFullScreenChange() {
				videoContainer.classList.toggle('full-screen', document.fullscreenElement);
				videoContainer.scrollIntoView();
			}
			//Timeline
			timelineContainer.addEventListener('mousemove', handleTimelineUpdate);
			timelineContainer.addEventListener('mousedown', toggleScrubbing);
			function toggleScrubbing(e) {
				const rect = timelineContainer.getBoundingClientRect();
				const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
				isScrubbing = (e.buttons & 1) === 1;
				videoContainer.classList.toggle('scrubbing', isScrubbing);
				if (isScrubbing) {
					wasPaused = video.paused;
					video.pause();
				} else {
					video.currentTime = percent * video.duration;
					if (!wasPaused) video.play();
				}
				handleTimelineUpdate(e);
			}
			function handleTimelineUpdate(e) {
				const rect = timelineContainer.getBoundingClientRect();
				const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
				document.querySelector('.time-info-timeline-indicator').innerText = formatDuration(percent * video.duration);
				const previewImgNumber = Math.max(1, Math.floor((percent * video.duration) / 10));
				// let previewImgSrc = `/assets/previewImgs/preview${previewImgNumber}.jpg`;
				const previewImgSrc = v.generatePreviewImageURL(previewImgNumber);
				previewImg.src = previewImgSrc;
				timelineContainer.style.setProperty('--preview-position', percent);
				if (isScrubbing) {
					e.preventDefault();
					thumbnailImg.src = previewImgSrc;
					timelineContainer.style.setProperty('--progress-position', percent);
				}
			}
			// Playback Speed
			speedBtn.addEventListener('click', changePlaybackSpeed);
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
			video.addEventListener('stalled', () => {
				console.log('stalled, the internet seems to be missing video could not be loaded');
				v.videoLoading = true;
			});
			video.addEventListener('waiting', () => {
				console.log('waiting for data (no current data but video still playing cause of buffering)');
			});
			video.addEventListener('error', (event) => {
				console.error('Error loading: Video');
			});

			video.addEventListener('progress', () => {
				updateBuffer();
				updateVueVideoData();
			});

			video.addEventListener('durationchange', () => {
				updateVueVideoData();
			});

			video.volume = v.settings.volume.value;

			function updateBuffer() {
				let max = -Infinity;
				for (let i = 0; i < video.buffered.length; i++) {
					const time = video.buffered.end(i);
					if (time > max) {
						max = time;
					}
				}
				const bufferPercent = max / video.duration;
				document.querySelector('.timeline-buffer').style.setProperty('--buffer-position', bufferPercent);
			}

			const timeUpdateThrottle = throttle(v.sendVideoTimeUpdate, TIME_UPDATE_THROTTLE);
			video.addEventListener('timeupdate', () => {
				updateVueVideoData();
				updateBuffer();
				timeUpdateThrottle(video.currentTime);
				currentTimeElem.textContent = formatDuration(video.currentTime);
				let percent = video.currentTime / video.duration;
				percent = isNaN(percent) ? 0 : percent;
				timelineContainer.style.setProperty('--progress-position', percent);
				if (this.settings?.autoSkip.value == true && video.currentTime == video.duration) {
					this.switchTo(1);
					setTimeout(() => {
						video.play();
					}, 400);
				}
			});
			const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
				minimumIntegerDigits: 2,
			});
			function formatDuration(time) {
				const seconds = Math.floor(time % 60);
				const minutes = Math.floor(time / 60) % 60;
				const hours = Math.floor(time / 3600);
				if (hours === 0) {
					return `${minutes}:${leadingZeroFormatter.format(seconds)}`;
				} else {
					return `${hours}:${leadingZeroFormatter.format(minutes)}:${leadingZeroFormatter.format(seconds)}`;
				}
			}
			function skipPercent(percent) {
				percent = percent * 10;
				const max = video.duration;
				const duration = (max / 100) * percent;
				skip(duration, true);
			}
			function skip(duration, set = false) {
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
				video.volume = e.target.value;
				video.muted = e.target.value === 0;
			});
			function toggleMute() {
				video.muted = !video.muted;
			}
			video.addEventListener('volumechange', () => {
				volumeSlider.value = video.volume;
				let volumeLevel;
				if (video.muted || video.volume === 0) {
					volumeSlider.value = 0;
					volumeLevel = 'muted';
				} else if (video.volume >= 0.5) {
					volumeLevel = 'high';
				} else {
					volumeLevel = 'low';
				}
				if (v.settings.volume.value !== video.volume) {
					v.settings.volume.value = video.volume;
					v.updateSettings();
				}
				videoContainer.dataset.volumeLevel = volumeLevel;
			});
			// View Modes
			theaterBtn.addEventListener('click', toggleTheaterMode);
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
			video.addEventListener('click', togglePlay);
			function togglePlay() {
				video.paused ? video.play() : video.pause();
			}
			video.addEventListener('play', () => {
				videoContainer.classList.remove('paused');
			});
			video.addEventListener('pause', () => {
				videoContainer.classList.add('paused');
			});

			//Mobile Accessibillity
			let tapedTwice = false;
			let prevDblTapTimeout;
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
				cleanupFN: () => {
					document.removeEventListener('keydown', documentKeyDown);
					document.removeEventListener('mouseup', documentMouseUp);
					document.removeEventListener('mousemove', documentMouseMove);
					document.removeEventListener('fullscreenchange', documentFullScreenChange);
				},
			};
		},
	},
	components: { ActorContainer, ShareModal },
};
</script>
<style scoped>
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
	position: relative;
}

.timeline-buffer::before {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	right: calc(100% - var(--buffer-position) * 100%);
	background-color: rgb(99, 99, 99);
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
</style>
