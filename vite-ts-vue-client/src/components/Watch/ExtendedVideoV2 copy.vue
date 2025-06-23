<template>
    <div>
        <div v-if="!inSyncRoom">
            <ShareModal />
            <RmvcModal :switchTo="switchTo" :skip="skip" />
        </div>
        <div style="margin-top: 0.5%" class="video-container paused" data-volume-level="high" :class="{
            hovered: isHovered,
            theater: isTheater,
            'full-screen': isFullScreen,
            'mini-player': isMiniPlayer,
            paused: !videoData.isPlaying,
            scrubbing: isScrubbing,
            touched: isTouched,
            skipping: isSkipping,
        }" @mousemove="onMouseMove" @mouseleave="onMouseLeave" @mouseenter="onMouseEnter" tabindex="0"
            @keydown="onKeyDown">
            <img class="thumbnail-img" :src="thumbnailSrc" />
            <div v-if="entityObject && settings.showVideoTitleContainer.value" class="video-title-container">
                <p v-if="currentMovie == -1">
                    {{ entityObject.primaryName }} - {{ String((entityObject as SerieEpisode).season).padStart(2, '0')
                    }}x{{
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
                <button type="button" @click="togglePlay">
                    <font-awesome-icon v-if="!videoData.isPlaying" size="4x" icon="fa-solid fa-play" />
                    <font-awesome-icon v-else size="4x" icon="fa-solid fa-pause" />
                </button>
            </div>
            <font-awesome-icon class="skip skip-right" size="2xl" icon="fa-solid fa-forward" />
            <div :class="{
                'btn-intro-skip-container': true,
                enabled: isInterceptingWithIntro || isInterceptingWithOutro,
            }">
                <button type="button" @click="skipSegment" class="btn btn-light">
                    Skip {{ isInterceptingWithIntro ? 'Intro' : 'Outro' }} <font-awesome-icon size="lg"
                        icon="fa-solid fa-forward" />
                </button>
            </div>
            <div v-show="!dataLoading" class="video-controls-container">
                <div class="timeline-container" @mousemove="handleTimelineUpdate" @mousedown="toggleScrubbing"
                    @mouseup="toggleScrubbing">
                    <div class="timeline">
                        <div v-for="segment in segmentData" class="timeline-intro-skip" :style="{
                            '--intro-skip-start': segment.startms / videoData.duration,
                            '--intro-skip-end': segment.endms / videoData.duration,
                        }"></div>
                        <div v-for="i in videoData.buffered?.length"
                            v-show="Math.round(Math.abs(videoData.buffered?.start(i - 1) - videoData.buffered?.end(i - 1))) > 10"
                            class="timeline-buffer" :style="{
                                '--buffer-start': videoData.buffered?.start(i - 1) / videoData.duration,
                                '--buffer-end': videoData.buffered?.end(i - 1) / videoData.duration,
                            }"></div>
                        <img class="preview-img" :src="previewImgSrc" />
                        <div class="thumb-indicator"></div>
                        <p class="time-info-timeline-indicator">{{ previewTime }}</p>
                    </div>
                </div>
                <div class="controls">
                    <button title="Toggle Video State" class="play-pause-btn" @click="togglePlay">
                        <svg class="play-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                        </svg>
                        <svg class="pause-icon" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                        </svg>
                    </button>
                    <div class="volume-container">
                        <button class="mute-btn" @click="toggleMute">
                            <svg class="volume-high-icon" viewBox="0 0 24 24">
                                <path fill="currentColor"
                                    d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                            </svg>
                            <svg class="volume-low-icon" viewBox="0 0 24 24">
                                <path fill="currentColor"
                                    d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
                            </svg>
                            <svg class="volume-muted-icon" viewBox="0 0 24 24">
                                <path fill="currentColor"
                                    d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />
                            </svg>
                        </button>
                        <input class="volume-slider" type="range" min="0" max="1" step="any"
                            v-model.number="videoData.volume" @input="onVolumeInput" />
                    </div>
                    <div class="duration-container">
                        <div class="current-time">{{ formatDuration(videoData.currentTime) }}</div>
                        /
                        <div class="total-time">{{ formatDuration(videoData.duration) }}</div>
                    </div>
                    <button v-if="!inSyncRoom && screenWidth >= 470" title="RMVC Controls" data-bs-toggle="modal"
                        data-bs-target="#rmvcModal">
                        <font-awesome-icon icon="fa-solid fa-network-wired" />
                    </button>
                    <button v-if="!inSyncRoom" title="Share Video" data-bs-toggle="modal" data-bs-target="#shareModal">
                        <font-awesome-icon icon="fa-solid fa-share" size="lg" />
                    </button>
                    <button v-if="screenWidth >= 480" title="Previous Episode" @click="switchTo(-1)">
                        <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd"
                                d="M0 18H2L2 0H0L0 18ZM17.7139 17.3827C18.7133 17.9977 20 17.2787 20 16.1052L20 1.8948C20 0.7213 18.7133 0.00230002 17.7139 0.6173L6.1679 7.7225C5.2161 8.3082 5.2161 9.6918 6.1679 10.2775L17.7139 17.3827ZM18 2.7896V15.2104L7.908 9L18 2.7896Z"
                                fill="currentColor" />
                        </svg>
                    </button>
                    <button title="Next Episode" @click="switchTo(1)">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                            class="Hawkins-Icon Hawkins-Icon-Standard">
                            <path fill-rule="evenodd" clip-rule="evenodd"
                                d="M22 3H20V21H22V3ZM4.28615 3.61729C3.28674 3.00228 2 3.7213 2 4.89478V19.1052C2 20.2787 3.28674 20.9977 4.28615 20.3827L15.8321 13.2775C16.7839 12.6918 16.7839 11.3082 15.8321 10.7225L4.28615 3.61729ZM4 18.2104V5.78956L14.092 12L4 18.2104Z"
                                fill="currentColor"></path>
                        </svg>
                    </button>
                    <button v-if="screenWidth >= 380" title="Toggle Video Speed" class="speed-btn wide-btn"
                        @click="changePlaybackSpeed">{{ playbackRate }}x</button>
                    <button title="Toggle Mini Player" class="mini-player-btn" @click="toggleMiniPlayerMode">
                        <svg viewBox="0 0 24 24">
                            <path fill="currentColor"
                                d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z" />
                        </svg>
                    </button>
                    <button v-if="screenWidth >= 450" title="Toggle Theatre Player" class="theater-btn"
                        @click="toggleTheaterMode">
                        <svg class="tall" viewBox="0 0 24 24">
                            <path fill="currentColor"
                                d="M19 6H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H5V8h14v8z" />
                        </svg>
                        <svg class="wide" viewBox="0 0 24 24">
                            <path fill="currentColor"
                                d="M19 7H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 8H5V9h14v6z" />
                        </svg>
                    </button>
                    <button title="Toggle Fullscreen Player" class="full-screen-btn" @click="toggleFullScreenMode">
                        <svg class="open" viewBox="0 0 24 24">
                            <path fill="currentColor"
                                d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                        </svg>
                        <svg class="close" viewBox="0 0 24 24">
                            <path fill="currentColor"
                                d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
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
                            {{ videoData.buffered?.start(i - 1) }}ms - {{ videoData.buffered?.end(i - 1) }}ms = {{ Math.round(Math.abs(videoData.buffered?.start(i - 1) - videoData.buffered?.end(i - 1))) }}ms
                        </span>
                    </div>
                Seekable: 
                    <div class="internal-video-devinfos-child">
                        <span v-for="i in videoData.seekable?.length">
                            {{ ($refs.mainVid as HTMLVideoElement).seekable?.start(i - 1) }}ms - {{ ($refs.mainVid as HTMLVideoElement).seekable?.end(i - 1) }}ms = {{ Math.round(Math.abs(($refs.mainVid as HTMLVideoElement).seekable?.start(i - 1) - ($refs.mainVid as HTMLVideoElement).seekable?.end(i - 1))) }}ms
                        </span>
                    </div>
            </pre>
            <video ref="mainVid" preload="auto" oncontextmenu="return false" playsinline :src="videoSrc"
                @loadeddata="onLoadedData" @loadstart="onLoadStart" @canplay="onCanPlay" @seeking="onSeeking"
                @stalled="onStalled" @waiting="onWaiting" @error="onError" @progress="onProgress"
                @durationchange="onDurationChange" @timeupdate="onTimeUpdate" @volumechange="onVolumeChange"
                @play="onPlay" @pause="onPause" @pointerdown="onPointerDown" @touchstart.passive="onTouchStart"
                @enterpictureinpicture="onEnterPiP" @leavepictureinpicture="onLeavePiP"></video>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, defineProps, defineExpose, nextTick } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useWatchStore } from '@/stores/watch.store';
import { useAxios, useBaseURL } from '@/utils';
import { throttle } from '@/utils/debounceAndThrottle';
import ActorContainer from '@/components/Watch/ActorContainer.vue';
import ShareModal from '@/components/Watch/ShareModal.vue';
import RmvcModal from '@/components/Watch/RmvcModal.vue';
import type { SerieEpisode } from '@Types/classes';

interface Segment {
    type: 'intro' | 'outro';
    startms: number;
    endms: number;
}

const props = defineProps<{
    switchTo: (vel: number) => void;
    sendVideoTimeUpdate: (time: number) => void;
    inSyncRoom?: boolean;
    canPlay?: {
        default: true,
        type: Boolean,
    };
    events?: any;
}>();

const inSyncRoom = props.inSyncRoom ?? false;
const canPlay = props.canPlay ?? true;
console.log('inSyncRoom:', inSyncRoom, 'canPlay:', canPlay);


const authStore = useAuthStore();
const watchStore = useWatchStore();

const currentSeries = computed({
    get: () => watchStore.currentSeries,
    set: v => (watchStore.currentSeries = v),
});
const currentMovie = computed({
    get: () => watchStore.currentMovie,
    set: v => (watchStore.currentMovie = v),
});
const currentLanguage = computed({
    get: () => watchStore.currentLanguage,
    set: v => (watchStore.currentLanguage = v),
});
const authToken = computed({
    get: () => authStore.authToken,
    set: v => (authStore.authToken = v),
});
const settings = computed({
    get: () => authStore.settings,
    set: v => (authStore.settings = v),
});
const videoSrc = computed(() => watchStore.videoSrc);
const entityObject = computed(() => watchStore.entityObject);

const videoLoading = ref(false);
const dataLoading = ref(false);
const screenWidth = ref(window.innerWidth);

const segmentData = ref<Segment[]>([]);
const alreadySkipped = ref<string[]>([]);

const videoData = ref({
    readyState: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    quality: { creationTime: 0, totalVideoFrames: 0, droppedVideoFrames: 0, corruptedVideoFrames: 0 },
    buffered: [] as any as TimeRanges,
    bufferedPercentage: '0',
    seekable: [] as any as TimeRanges,
});

const mainVid = ref<HTMLVideoElement | null>(null);

const isHovered = ref(false);
const isTheater = ref(false);
const isFullScreen = ref(false);
const isMiniPlayer = ref(false);
const isScrubbing = ref(false);
const isTouched = ref(false);
const isSkipping = ref(false);

const playbackRate = ref(1);
const previewImgSrc = ref('');
const previewTime = ref('0:00');
const thumbnailSrc = ref('');

let wasPaused = false;
let touchTimeout: NodeJS.Timeout | null = null;
let skipTimeout: NodeJS.Timeout | null = null;

const isInterceptingWithIntro = computed(() => {
    const introSegment = segmentData.value.find((x) => x.type == 'intro');
    return Boolean(
        introSegment && videoData.value?.currentTime >= introSegment?.startms && videoData.value?.currentTime <= introSegment?.endms
    );
});
const isInterceptingWithOutro = computed(() => {
    const outroSegment = segmentData.value.find((x) => x.type == 'outro');
    return Boolean(
        outroSegment && videoData.value?.currentTime >= outroSegment?.startms && videoData.value?.currentTime <= outroSegment?.endms
    );
});

function handleResize() {
    screenWidth.value = window.innerWidth;
}
onMounted(async () => {
    window.addEventListener('resize', handleResize);
    await nextTick();
    await loadIntroData();
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (touchTimeout) clearTimeout(touchTimeout);
    if (skipTimeout) clearTimeout(skipTimeout);
});

watch(() => settings.value.volume.value, (newValue) => {
    if (mainVid.value) mainVid.value.volume = newValue as number;
});
watch(videoSrc, async () => {
    segmentData.value = [];
    await loadIntroData();
});

function generatePreviewImageURL(previewImgNumber: number) {
    let previewImgSrc = '';
    if (currentSeries.value != undefined && currentSeries.value.ID != '-1') {
        previewImgSrc = `${useBaseURL()}/images/${currentSeries.value.ID}/previewImages/`;
        if (currentMovie.value != -1 && currentMovie.value != undefined) {
            previewImgSrc += `Movies/${currentSeries.value.movies[currentMovie.value - 1].primaryName}`;
        } else {
            previewImgSrc += `${(entityObject.value as SerieEpisode).season}-${(entityObject.value as SerieEpisode).episode}`;
        }
        previewImgSrc += `/${currentLanguage.value}/preview${previewImgNumber}.jpg?auth-token=${authToken.value}`;
    }
    return previewImgSrc;
}

function skipSegment() {
    if (isInterceptingWithIntro.value) {
        const segmentEndMs = segmentData.value.find((x) => x.type == 'intro')?.endms;
        if (segmentEndMs) skip(segmentEndMs + 2, true);
    }
    if (isInterceptingWithOutro.value) {
        const segmentEndMs = segmentData.value.find((x) => x.type == 'outro')?.endms;
        if (segmentEndMs) skip(segmentEndMs + 2, true);
    }
}

async function loadIntroData() {
    alreadySkipped.value = [];
    const season = (entityObject.value as SerieEpisode)?.season;
    const episode = (entityObject.value as SerieEpisode)?.episode;
    if (season == undefined || episode == undefined) {
        return;
    }
    try {
        const response = await useAxios().get(
            `/segments/info/${currentSeries.value.ID}/${(entityObject.value as SerieEpisode).season}/${(entityObject.value as SerieEpisode).episode
            }`
        );
        if (response.status === 200) {
            segmentData.value = response.data;
        }
    } catch (error) {
        console.error('It was not possible to load any intro data maybe because the system is not available');
    }
}

function trigger(action: string, value: number | boolean, time: number) {
    if (!mainVid.value) return;
    if (action == 'sync-playback') {
        if (value) {
            mainVid.value.currentTime = time;
            mainVid.value.play();
        } else {
            mainVid.value.currentTime = time;
            mainVid.value.pause();
        }
    }
    if (action == 'sync-skip' || action == 'sync-skipTimeline') {
        skip(value as number, true, true);
    }
}

// --- UI/DOM event handlers ---

function onMouseMove() {
    isHovered.value = true;
    resetCursorTimeout();
}
function onMouseEnter() {
    isHovered.value = true;
    resetCursorTimeout();
}
function onMouseLeave() {
    isHovered.value = false;
    document.body.style.cursor = '';
}
let cursorTimeout: NodeJS.Timeout | null = null;
function resetCursorTimeout() {
    if (cursorTimeout) clearTimeout(cursorTimeout);
    document.body.style.cursor = '';
    cursorTimeout = setTimeout(() => {
        isHovered.value = false;
        document.body.style.cursor = 'none';
    }, 5000);
}

function onKeyDown(e: KeyboardEvent) {
    console.log('TEST', e);

    const tagName = document.activeElement?.tagName.toLowerCase();
    if (tagName === 'input') return;
    switch (e.key.toLowerCase()) {
        case ' ':
            if (tagName === 'button') return;
        case 'k':
        case '*':
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
            if (mainVid.value) mainVid.value.volume = Math.min(1, mainVid.value.volume + 0.1);
            break;
        case 'arrowdown':
            e.preventDefault();
            if (mainVid.value) mainVid.value.volume = Math.max(0, mainVid.value.volume - 0.1);
            break;
        case 'n':
        case '+':
            props.switchTo(1);
            break;
        case 'p':
        case '-':
            props.switchTo(-1);
            break;
        case '1': case '2': case '3': case '4': case '5': case '6': case '7': case '8': case '9': case '0':
            skipPercent(Number(e.key.toLowerCase()));
            break;
    }
}

// --- Timeline scrubbing ---

function toggleScrubbing(e: MouseEvent) {
    if (!canPlay || !mainVid.value) return;
    const timelineContainer = (e.currentTarget as HTMLElement);
    const rect = timelineContainer.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
    isScrubbing.value = (e.buttons & 1) === 1;
    if (isScrubbing.value) {
        wasPaused = mainVid.value.paused;
        mainVid.value.pause();
    } else {
        if (props.events?.skipTimeline) {
            props.events.skipTimeline(percent * mainVid.value.duration);
        }
        mainVid.value.currentTime = percent * mainVid.value.duration;
        if (!wasPaused) mainVid.value.play();
    }
    handleTimelineUpdate(e);
}

function handleTimelineUpdate(e: MouseEvent) {
    if (!mainVid.value) return;
    const timelineContainer = (e.currentTarget as HTMLElement);
    const rect = timelineContainer.getBoundingClientRect();
    const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
    previewTime.value = formatDuration(percent * mainVid.value.duration);
    const previewImgNumber = Math.max(1, Math.floor((percent * mainVid.value.duration) / 10));
    previewImgSrc.value = generatePreviewImageURL(previewImgNumber);
    timelineContainer.style.setProperty('--preview-position', String(percent));
    if (isScrubbing.value) {
        e.preventDefault();
        thumbnailSrc.value = previewImgSrc.value;
        timelineContainer.style.setProperty('--progress-position', String(percent));
    }
}

// --- Playback controls ---

function togglePlay() {

    if (!canPlay || !mainVid.value) return;

    mainVid.value.paused ? mainVid.value.play() : mainVid.value.pause();
    updateVueVideoData();
}
function toggleMute() {
    if (!mainVid.value) return;
    mainVid.value.muted = !mainVid.value.muted;
}
function onVolumeInput(e: Event) {
    if (!mainVid.value) return;
    const target = e.target as HTMLInputElement;
    mainVid.value.volume = parseFloat(target.value);
    mainVid.value.muted = target.value === '0';
}
function changePlaybackSpeed() {
    if (!mainVid.value) return;
    let newPlaybackRate = mainVid.value.playbackRate + 0.25;
    if (newPlaybackRate > 2) newPlaybackRate = 0.25;
    mainVid.value.playbackRate = newPlaybackRate;
    playbackRate.value = newPlaybackRate;
}
function toggleTheaterMode() {
    isTheater.value = !isTheater.value;
}
function toggleFullScreenMode() {
    if (!mainVid.value) return;
    const container = mainVid.value.parentElement as HTMLElement;
    if (!document.fullscreenElement) {
        container.requestFullscreen();
        isFullScreen.value = true;
    } else {
        document.exitFullscreen();
        isFullScreen.value = false;
    }
}
function toggleMiniPlayerMode() {
    if (!mainVid.value) return;
    if (isMiniPlayer.value) {
        document.exitPictureInPicture();
    } else {
        mainVid.value.requestPictureInPicture();
    }
}

// --- Video events ---

function onLoadedData() {
    dataLoading.value = false;
}
function onLoadStart() {
    videoLoading.value = true;
    dataLoading.value = true;
}
function onCanPlay() {
    updateVueVideoData();
    videoLoading.value = false;
}
function onSeeking() {
    videoLoading.value = true;
}
function onStalled() {
    videoLoading.value = true;
    setTimeout(async () => {
        if (mainVid.value && mainVid.value.readyState !== 4) {
            const time = mainVid.value.currentTime;
            mainVid.value.load();
            await mainVid.value.play();
            videoLoading.value = false;
            mainVid.value.currentTime = time;
        }
    }, 1000 * 15);
}
function onWaiting() { }
function onError() {
    videoLoading.value = true;
}
function onProgress() {
    updateVueVideoData();
}
function onDurationChange() {
    updateVueVideoData();
}
const timeUpdateThrottle = throttle((time: number) => props.sendVideoTimeUpdate(time), 1000);
function onTimeUpdate() {
    updateVueVideoData();
    if (!mainVid.value) return;
    timeUpdateThrottle(mainVid.value.currentTime);
    let percent = mainVid.value.currentTime / mainVid.value.duration;
    percent = isNaN(percent) ? 0 : percent;
    const timelineContainer = mainVid.value.parentElement?.querySelector('.timeline-container') as HTMLElement;
    if (timelineContainer) timelineContainer.style.setProperty('--progress-position', String(percent));
    if (settings.value?.autoSkip.value == true && mainVid.value.currentTime == mainVid.value.duration) {
        props.switchTo(1);
        setTimeout(() => {
            mainVid.value?.play();
        }, 400);
    }
    if (
        (isInterceptingWithIntro.value && !alreadySkipped.value.find((x) => x == 'intro')) ||
        (isInterceptingWithOutro.value && !alreadySkipped.value.find((x) => x == 'outro'))
    ) {
        if (settings.value?.skipSegments?.value == true) {
            const segment = segmentData.value.find((x) => x.type == (isInterceptingWithIntro.value ? 'intro' : 'outro'));
            if (!segment) return;
            alreadySkipped.value.push(segment.type);
            skip(segment.endms + 2, true);
        }
    }
}
function onVolumeChange() {
    if (!mainVid.value) return;
    videoData.value.volume = mainVid.value.volume;
    let volumeLevel;
    if (mainVid.value.muted || mainVid.value.volume === 0) {
        volumeLevel = 'muted';
    } else if (mainVid.value.volume >= 0.5) {
        volumeLevel = 'high';
    } else {
        volumeLevel = 'low';
    }
    if (settings.value.volume.value !== mainVid.value.volume && mainVid.value.volume != 0) {
        settings.value.volume.value = mainVid.value.volume;
        authStore.updateSettings();
    }
    const container = mainVid.value.parentElement as HTMLElement;
    if (container) container.dataset.volumeLevel = volumeLevel;
}
function onPlay() {
    videoData.value.isPlaying = true;
    const container = mainVid.value?.parentElement as HTMLElement;
    if (container) container.classList.remove('paused');
    if (props.events?.playback) {
        props.events.playback(true, mainVid.value?.currentTime);
    }
}
function onPause() {
    videoData.value.isPlaying = false;
    const container = mainVid.value?.parentElement as HTMLElement;
    if (container) container.classList.add('paused');
    if (props.events?.playback) {
        props.events.playback(false, mainVid.value?.currentTime);
    }
}
function onPointerDown(ev: PointerEvent) {
    if (!mainVid.value) return;
    if (ev.pointerType == 'mouse') {
        if (ev.button == 0) {
            togglePlay();
        }
    } else {
        isTouched.value = true;
        if (touchTimeout != null) clearTimeout(touchTimeout);
        touchTimeout = setTimeout(() => {
            isTouched.value = false;
            touchTimeout = null;
        }, 5 * 1000);
    }
}
let tapedTwice = false;
let prevDblTapTimeout: NodeJS.Timeout;
function onTouchStart(event: TouchEvent) {
    if (!mainVid.value) return;
    const { top, left, width } = mainVid.value.getBoundingClientRect();
    const localX = event.touches[0].clientX - left;
    const middle = top == 0 && left == 0 ? window.innerWidth / 2 : width / 2;
    const max = top == 0 && left == 0 ? window.innerWidth : width;
    let value = false;
    let velocity = 0;
    if (localX > 0 && localX < middle) {
        value = true;
        velocity = -5;
    }
    if (localX > middle && localX < max) {
        value = true;
        velocity = 5;
    }
    if (!value) return;
    if (!tapedTwice) {
        tapedTwice = true;
        setTimeout(() => {
            tapedTwice = false;
        }, 300);
        return false;
    }
    skip(velocity);
    if (prevDblTapTimeout) clearTimeout(prevDblTapTimeout);
    prevDblTapTimeout = setTimeout(() => {
        mainVid.value?.play();
    }, 301);
}
function onEnterPiP() {
    isMiniPlayer.value = true;
}
function onLeavePiP() {
    isMiniPlayer.value = false;
}

// --- Utility ---

function updateVueVideoData() {
    if (!mainVid.value) return;
    const { creationTime, totalVideoFrames, droppedVideoFrames, corruptedVideoFrames } = mainVid.value.getVideoPlaybackQuality?.() || {};
    let bufferedTime = 0;
    for (let i = 0; i < mainVid.value.buffered.length; i++) {
        try {
            bufferedTime += mainVid.value.buffered.end(i) - mainVid.value.buffered.start(i);
        } catch (error) { }
    }
    const bufferedPercentage = (bufferedTime / mainVid.value.duration) * 100;
    videoLoading.value = mainVid.value.readyState < 1;
    videoData.value = {
        isPlaying: !mainVid.value.paused,
        readyState: mainVid.value.readyState,
        currentTime: mainVid.value.currentTime,
        duration: mainVid.value.duration,
        volume: mainVid.value.volume,
        quality: { creationTime, totalVideoFrames, droppedVideoFrames, corruptedVideoFrames },
        buffered: mainVid.value.buffered,
        bufferedPercentage: bufferedPercentage.toFixed(2),
        seekable: mainVid.value.seekable,
    };
}

const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
    minimumIntegerDigits: 2,
});
function formatDuration(time: number) {
    if (!time || isNaN(time)) return '0:00';
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
    const max = videoData.value.duration;
    const duration = (max / 100) * percent;
    skip(duration, true);
}

function skip(duration: number, set = false, server = false) {
    if (!mainVid.value) return;
    if (canPlay as boolean == false && server == false) return;
    if (props.events?.skip && server == false) {
        props.events?.skip(set ? duration : mainVid.value.currentTime + duration);
    }
    const animationDuration = 400;
    const doIconAnimation = Math.abs(duration) > 1 || Math.abs(duration) == 0;
    let pref = '';
    let sel: HTMLElement | null = null;
    if ((!set && duration >= 0) || duration > mainVid.value.currentTime) {
        sel = mainVid.value.parentElement?.querySelector('.skip-right') as HTMLElement;
    } else {
        pref = '-';
        sel = mainVid.value.parentElement?.querySelector('.skip-left') as HTMLElement;
    }
    if (doIconAnimation && sel) {
        isSkipping.value = true;
        sel.animate([{ transform: 'translateX(0px)', opacity: '1' }, { transform: `translateX(${pref}60px)` }], {
            duration: animationDuration,
            iterations: 1,
        });
    }
    if (set) {
        mainVid.value.currentTime = duration;
    } else {
        mainVid.value.currentTime += duration;
    }
    if (doIconAnimation) {
        if (skipTimeout) clearTimeout(skipTimeout);
        skipTimeout = setTimeout(() => {
            isSkipping.value = false;
        }, animationDuration - 100);
    }
}

defineExpose({
    videoData,
    videoLoading,
    trigger,
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
