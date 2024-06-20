<template>
	<div class="d-flex justify-content-center">
		<div class="container row mt-4 justify-content-around">
			<div v-for="segmentType in sgementTypes" class="col-5">
				<h5 class="text-center">{{ segmentType }}</h5>
				<div class="input-group mb-3">
					<button class="btn btn-outline-success" @click="set(segmentType, 'start')" type="button" id="button-addon2">Set (S)</button>
					<input
						type="text"
						v-model="currentSegment(segmentType).startTime"
						class="form-control"
						disabled
						placeholder="Start Time"
						aria-label="Start Time"
						aria-describedby="button-addon2" />

					<input
						type="text"
						v-model="currentSegment(segmentType).endTime"
						class="form-control"
						disabled
						placeholder="End Time"
						aria-label="End Time"
						aria-describedby="button-addon2" />
					<button class="btn btn-outline-warning" @click="set(segmentType, 'end')" type="button" id="button-addon2">Set (E)</button>
				</div>
			</div>
		</div>
	</div>
	<div v-if="state.segment.length > 0" class="container">
		<div class="d-flex justify-content-center">
			<button @click="submitSegments" type="button" name="" id="" class="btn btn-outline-primary col-5">
				Submit Segments<font-awesome-icon class="ms-3" :icon="['fa-solid', 'fa-check']" size="lg" />
			</button>
		</div>
	</div>

	<h4 class="mt-2 text-center">Segment List - ({{ state.segment.length }})</h4>
	<div class="d-flex justify-content-center">
		<ul class="list-group col-4">
			<li v-for="segment in state.segment" class="list-group-item">
				<div class="d-flex text-center justify-content-between">
					<span class="mt-1">
						{{ segment.type }}: {{ segment.seriesID }} - {{ segment.season }}x{{ segment.episode }} - {{ currentSegment(segment.type).startTime }} -
						{{ currentSegment(segment.type).endTime }}
					</span>
					<button type="button" title="Remove Segment" @click="deleteSegment(segment)" class="btn btn-outline-warning">
						<font-awesome-icon :icon="['fa-solid', 'fa-trash']" size="sm" />
					</button>
				</div>
			</li>
		</ul>
	</div>
</template>
<script setup lang="ts">
import { useWatchStore } from '@/stores/watch.store';
import { useAxios } from '@/utils';
import { computed } from 'vue';
import { reactive } from 'vue';
import { ref } from 'vue';

const sgementTypes = ['Intro', 'Outro'];

const blank = ref('');

const props = defineProps<{
	videoRef: any;
}>();

interface Segment {
	seriesID: string;
	season: number;
	episode: number;
	type: string;
	startms: number;
	endms: number;
}

const state = reactive({
	segment: [] as Segment[],
});

const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
	minimumIntegerDigits: 2,
});

function submitSegments() {
	const response = useAxios().post('/segments/submit', state.segment);
}

function deleteSegment(segment: Segment) {
	const index = state.segment.indexOf(segment);
	state.segment.splice(index, 1);
}

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

function currentSegment(segmentType: string) {
	const seg = state.segment.find((x) => x.type == segmentType && checkIfSegIsEqToWatch(x));
	if (seg) {
		return {
			startTime: formatDuration(seg.startms),
			endTime: formatDuration(seg.endms),
		};
	}
	return {
		startTime: '00:00:00',
		endTime: '00:00:00',
	};
}

console.log('TEST');

// const indexStore = useIndexStore();
// const authStore = useAuthStore();
const watchStore = useWatchStore();

function checkIfSegIsEqToWatch(x: Segment) {
	return x.seriesID == watchStore.currentSeries.ID && x.season == watchStore.currentSeason && x.episode == watchStore.currentEpisode;
}

function set(type: string, version: 'start' | 'end') {
	console.log('SET');
	const segment = state.segment.find((x) => x.type == type && checkIfSegIsEqToWatch(x));
	if (segment == undefined) {
		const segment = {
			seriesID: watchStore.currentSeries.ID,
			season: watchStore.currentSeason,
			episode: watchStore.currentEpisode,
			type: type,
			startms: 0,
			endms: 0,
		} as Segment;

		if (version == 'start') {
			segment.startms = props.videoRef!.videoData.currentTime;
		} else if (version == 'end') {
			segment.endms = props.videoRef!.videoData.currentTime;
		}
		state.segment.push(segment);
	} else {
		if (version == 'start') {
			segment.startms = props.videoRef!.videoData.currentTime;
		} else if (version == 'end') {
			segment.endms = props.videoRef!.videoData.currentTime;
		}
	}
}

const test = () => {
	console.log(props.videoRef!.videoData);
};
</script>
