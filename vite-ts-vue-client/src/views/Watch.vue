<template>
	<div class="innerdoc">
		<div v-if="watchStore.currentSeries == undefined || watchStore.currentSeries.ID == '-1'">
			<h1 class="text-center">No Series with that ID</h1>
		</div>
		<div v-if="indexStore.loading || watchStore.loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-auto-animate class="container" v-if="watchStore.currentSeries != undefined && watchStore.currentSeries.ID != '-1'">
			<div class="float-end btn-group">
				<button
					v-if="authStore.userInfo.role >= 2"
					@click="doSegmentAnnotation = !doSegmentAnnotation"
					class="btn btn-outline-info"
					title="Annotate Segments">
					<font-awesome-icon icon="fa-solid fa-highlighter" />
				</button>
				<button
					class="btn btn-outline-info"
					title="Series Information"
					data-bs-toggle="modal"
					data-bs-target="#seriesInformationModal"
					disabled>
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

			<div class="text-center" v-if="showDisabled">
				<h2 class="text-danger">It Seems there is currently no data for this Series</h2>
				<p class="text-danger mb-0">
					It either got removed, or is on a node which is currently un reachable, or is currently being transcoded
				</p>
				<p class="text-danger">Please check back later and if this issue persists please contact the Administrator</p>
				<router-link type="button" to="/" class="mt-3 mb-4 btn btn-outline-primary btn-lg">Go Watch something else</router-link>
			</div>

			<pre v-if="authStore.settings.developerMode.value">
				Watch Information:
				{{
					JSON.stringify(
						watchStore.watchList.find(
							(segment) => segment.season == watchStore.currentSeason && segment.episode == watchStore.currentEpisode
						)
					)
				}}
			</pre
			>
			<div v-auto-animate v-if="showLatestWatchButton" class="text-center mb-2">
				<button @click="skipToLatestTime" class="btn btn-outline-info">Jump to Latest watch position!</button>
			</div>

			<pre v-if="authStore.settings.developerMode.value">
				currentSeries.infos {{ JSON.stringify(watchStore.currentSeries.infos) }}
				currentMovie: {{ watchStore.currentMovie }}
				currentSeason: {{ watchStore.currentSeason }}
				currentEpisode: {{ watchStore.currentEpisode }}
				currentLanguage: {{ watchStore.currentLanguage }}
				videoSrc: {{ watchStore.videoSrc }}
				entityObject: {{ watchStore.entityObject }}
			</pre
			>

			<template v-if="!showDisabled">
				<MarkSeasonDropdown />

				<div
					v-if="
						watchStore.currentSeries.movies.length >= 1 &&
						watchStore.currentSeries.seasons.length == 0 &&
						(watchStore.currentSeries.movies.length == 1 || watchStore.currentMovie == -1)
					">
					<EntityListViewMovies v-if="watchStore.currentSeries.movies.length > 1" :changeMovie="changeMovie" />
				</div>

				<div v-else>
					<!-- Movies -->
					<EntityListView
						v-if="watchStore.currentSeries.movies.length >= 1"
						title="Movies:"
						:array="watchStore.currentSeries.movies"
						:current="watchStore.currentMovie"
						:changeFN="changeMovie"
						:watchList="watchStore.watchList" />
					<!-- Seasons -->
					<EntityListView
						title="Seasons:"
						v-if="watchStore.currentSeries.seasons.length >= 1"
						:array="watchStore.currentSeries.seasons"
						:current="watchStore.currentSeason"
						:changeFN="changeSeason"
						:season="true"
						:watchList="watchStore.watchList" />
					<!-- Episodes -->
					<EntityListView
						v-if="watchStore.currentSeason != -1"
						title="Episodes:"
						:array="watchStore.currentSeries.seasons.find((x) => x[0].season == ((watchStore.entityObject as SerieEpisode)?.season || -1))"
						:current="watchStore.currentEpisode"
						:currentSeason="watchStore.currentSeason"
						:changeFN="changeEpisode"
						:watchList="watchStore.watchList" />
				</div>

				<!-- Previous & Title & Languages & Next -->
				<EntityActionsInformation :switchTo="switchTo" :changeLanguage="changeLanguage" />
			</template>
		</div>
		<ExtendedVideo ref="videoRef" v-if="!showDisabled" v-show="showVideo" :switchTo="switchTo" :sendVideoTimeUpdate="sendVideoTimeUpdate" />
		<SegmentSubmission :videoRef="videoRef" v-if="!showDisabled && showVideo && doSegmentAnnotation" />
	</div>
</template>
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';
import { useWatchStore } from '@/stores/watch.store';
import { singleDimSwitcher, multiDimSwitcher, deepswitchTo } from '@/utils/switcher';
import EntityListView from '@/components/Watch/EntityListView.vue';
import SegmentSubmission from '@/components/Watch/SegmentSubmission.vue';
import ExtendedVideo from '@/components/Watch/ExtendedVideo.vue';
import ControlInformationModal from '@/components/Watch/ControlInformationModal.vue';
import EntityActionsInformation from '@/components/Watch/EntityActionsInformation.vue';
import MarkSeasonDropdown from '@/components/Watch/MarkSeasonDropdown.vue';
import EntityListViewMovies from '@/components/Watch/EntityListViewMovies.vue';
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { useSocket } from '@/utils/socket';
import { useRoute, useRouter } from 'vue-router';
import type { Langs, SerieEpisode } from '@Types/classes';

const cleanupFN = ref(null);
const buttonTimer = ref<NodeJS.Timeout>(null as unknown as NodeJS.Timeout);
const forceHideButton = ref(false);
const videoRef = ref();

const doSegmentAnnotation = ref(false);

const indexStore = useIndexStore();
const authStore = useAuthStore();
const watchStore = useWatchStore();

const route = useRoute();

const test = () => {
	console.log(videoRef.value!.videoData);
};

onMounted(async () => {
	useSocket().on('watchListChange', ({ watchList, seriesID }) => {
		console.log('GOT watchListChange');
		if (seriesID == undefined) watchStore.watchList = watchList.filter((e) => e.ID == route.query.id);
		if (seriesID == route.query.id) watchStore.watchList = watchList.filter((e) => e.ID == route.query.id);
	});

	try {
		useSocket().emit('getWatchList', { ID: route.query.id });
		const seriesID = route.query.id?.toString();
		if (seriesID == undefined) return;
		await watchStore.loadSeriesInfo(seriesID);
		if (watchStore.currentSeries == undefined || watchStore.currentSeries.ID == '-1') return;
		const localStorageString = localStorage.getItem('data') || '';
		const data = localStorageString.trim() != '' ? JSON.parse(localStorageString) : null;

		watchStore.loadWatchList(seriesID);
		const queryIdx = route.query?.idx?.toString();
		if (queryIdx) {
			const language: Langs = (route.query?.lang?.toString() as Langs) || 'GerDub';

			const queryTimeString = route.query?.time?.toString();
			const queryTime = queryTimeString ? parseInt(queryTimeString) : -55;

			if (queryIdx.includes('x')) {
				//SeasonxEpisode
				const [se, ep] = queryIdx.split('x').map((x) => Number(x));

				handleVideoChange(se, ep, -1, language != undefined, language, (video) => {
					if (queryTime != -55) video.currentTime = queryTime;
				});
			} else {
				//Movie
				const movieID = parseInt(queryIdx);
				handleVideoChange(-1, -1, movieID, language != undefined, language, (video) => {
					if (queryTime != -55) video.currentTime = queryTime;
				});
			}
		} else if (data && data.ID == seriesID) {
			handleVideoChange(data.season || -1, data.episode || -1, data.movie || -1, undefined, undefined, undefined);
		} else {
			localStorage.removeItem('data');

			handleVideoChange(-1, -1, -1, undefined, undefined, undefined);
		}

		document.title = `Cinema | ${watchStore.currentSeries.title}`;

		console.log(watchStore.currentSeries.movies.length, watchStore.currentMovie);

		if (watchStore.currentSeries.movies.length == 1 && watchStore.currentSeries.seasons.length == 0) {
			handleVideoChange(-1, -1, 1, undefined, undefined, undefined);
		}
	} catch (error) {
		console.error('Error in Watch.vue Created Hook', error);
	}
});

onBeforeUnmount(() => {
	const video = document.querySelector('video');
	if (video) {
		sendVideoTimeUpdate(video.currentTime, true);
	}
	localStorage.removeItem('data');
	document.title = `Cinema | Jodu555`;
});

onUnmounted(() => {
	useSocket().off('watchListChange');
});

const showDisabled = computed(() => {
	if (watchStore.currentSeries == undefined || watchStore.currentSeries.ID == '-1') return true;
	return watchStore.currentSeries.infos?.disabled || (watchStore.currentSeries.movies.length == 0 && watchStore.currentSeries.seasons.length == 0);
});

const showLatestWatchButton = computed(() => {
	if (forceHideButton.value) return false;
	const info = Boolean(watchStore.currentMovie !== -1 || watchStore.currentSeason !== -1 || watchStore.currentEpisode !== -1);
	if (info) {
		const segment = watchStore.watchList.find(
			(segment) => segment.ID == route.query.id && segment.season == watchStore.currentSeason && segment.episode == watchStore.currentEpisode
		);
		if (segment == undefined) return false;
		if (segment.time > 100) return true;
	} else {
		return false;
	}
});

const showVideo = computed(() => {
	return (
		watchStore.currentSeries != undefined &&
		watchStore.currentSeries.ID != '-1' &&
		(watchStore.currentMovie !== -1 || watchStore.currentSeason !== -1 || watchStore.currentEpisode !== -1)
	);
});

const displayTitle = computed(() => {
	let str = `${watchStore.currentSeries.infos?.title || watchStore.currentSeries.infos?.infos || watchStore.currentSeries.title} - `;

	if (watchStore.currentSeries.movies.length >= 1) {
		str += `${watchStore.currentSeries.movies.length} ` + (watchStore.currentSeries.movies.length > 1 ? 'Movies' : 'Movie');
	}

	if (watchStore.currentSeries.movies.length >= 1 && watchStore.currentSeries.seasons.length >= 1) {
		str += ' | ';
	}

	if (watchStore.currentSeries.seasons.length >= 1) {
		str += `${watchStore.currentSeries.seasons.length} ` + (watchStore.currentSeries.seasons.length > 1 ? 'Seasons' : 'Season');
	}

	return str;
});

function skipToLatestTime() {
	const segment = watchStore.watchList.find(
		(segment) => segment.season == watchStore.currentSeason && segment.episode == watchStore.currentEpisode
	);
	const video = document.querySelector('video');
	if (video && segment) {
		video.currentTime = segment.time;
		forceHideButton.value = true;
	}
}
function switchTo(vel: number) {
	deepswitchTo(vel, handleVideoChange);
}
function changeMovie(ID: number) {
	if (watchStore.currentMovie == ID) return handleVideoChange();
	handleVideoChange(-1, -1, ID);
}
function changeEpisode(ID: number) {
	handleVideoChange(watchStore.currentSeason, ID);
}
function changeSeason(ID: number) {
	console.log(ID, 'CAME');
	console.log(watchStore.currentSeason);

	if (watchStore.currentSeason == ID) return handleVideoChange();
	return handleVideoChange(ID, 1);
}
function changeLanguage(lang: Langs) {
	handleVideoChange(watchStore.currentSeason, watchStore.currentEpisode, watchStore.currentMovie, true, lang, undefined);
}

const router = useRouter();

function handleVideoChange(
	season = -1,
	episode = -1,
	movie = -1,
	langchange = false,
	lang?: Langs | undefined,
	callback?: ((video: HTMLVideoElement) => void) | undefined
) {
	if (langchange && watchStore.currentLanguage == lang) return;
	const video = document.querySelector('video');

	//TODO: Maybe add here default language from user prefered settings
	let defaultLanguage = watchStore.currentLanguage || ('GerDub' as Langs);

	let wasPaused = false;
	let prevTime = 0;
	if (video) {
		wasPaused = video.paused;
		prevTime = video.currentTime;

		sendVideoTimeUpdate(video.currentTime, true);

		video.pause();
	}
	console.log('GOT handleVideoChange()', { season, episode, movie, langchange, lang }, { wasPaused, prevTime, defaultLanguage });

	//Handle the skip to latest watch postion button
	buttonTimer != null && clearTimeout(buttonTimer.value);
	forceHideButton.value = false;
	buttonTimer.value = setTimeout(() => {
		forceHideButton.value = true;
	}, 10000);

	//Save The Current infos in localstorage
	localStorage.setItem(
		'data',
		JSON.stringify({
			ID: route.query.id,
			season,
			episode,
			movie,
		})
	);

	setTimeout(() => {
		watchStore.currentSeason = season;
		watchStore.currentEpisode = episode;
		watchStore.currentMovie = movie;

		// router.replace({
		// 	query: {
		// 		id: watchStore.currentSeries.ID,
		// 		idx: `${watchStore.currentSeason}x${watchStore.currentEpisode}`,
		// 	},
		// });
		let ref = `/watch?id=${watchStore.currentSeries.ID}`;
		let changed = false;
		if (watchStore.currentSeason == -1 && watchStore.currentEpisode == -1) {
			if (watchStore.currentMovie != -1) {
				ref += `&idx=${watchStore.currentMovie}`;
				changed = true;
			}
		} else {
			ref += `&idx=${watchStore.currentSeason}x${watchStore.currentEpisode}`;
			changed = true;
		}

		//Ensure that the selected language exists on the entity
		if (watchStore.entityObject && !watchStore.entityObject.langs.includes(defaultLanguage) && !langchange) {
			console.log('The Requestes Language does not exist on the Entity');
			defaultLanguage = watchStore.entityObject.langs[0] as Langs;
		}

		watchStore.currentLanguage = langchange ? (lang as Langs) : defaultLanguage;

		if (changed) ref += `&lang=${watchStore.currentLanguage}`;

		window.history.replaceState({}, document.title, ref);

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
}
function sendVideoTimeUpdate(time: number, force = false) {
	console.log('sendVideoTimeUpdate()', time, force);
	useSocket().emit('timeUpdate', {
		series: route.query.id,
		movie: watchStore.currentMovie,
		season: watchStore.currentSeason,
		episode: watchStore.currentEpisode,
		time: time,
		force,
	});
}
</script>

<style scoped></style>
