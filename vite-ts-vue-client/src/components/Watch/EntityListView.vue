<template>
	<div>
		<div class="d-flex row justify-content-start">
			<h2 class="col-sm-2 col-md-2 col-lg-1 col-3" style="margin-right: 3.5%">{{ title }}</h2>
			<!-- <h2 class="col-sm-1 col-3" style="margin-right: 3.5%">{{ title }}</h2> -->
			<h3 class="col">
				<button
					style="font-weight: 900; font-size: 1.18rem; padding: 0.3rem 0.6rem"
					type="button"
					:title="isMovie ? (s as SerieEpisode).primaryName : ''"
					:class="{
						btn: true,
						'text-white': true,
						'btn-secondary': true, //Unselected && Not Watched
						'btn-info': current == getNumber(s, i), //i + 1, // Selected
						'btn-success': current !== getNumber(s, i) && checkWatched(getNumber(s, i)), // Watched && Not Selected
						'crazy-green': current !== getNumber(s, i) && checkWatched(getNumber(s, i)), // Watched && Not Selected
					}"
					v-for="(s, i) in array"
					:key="JSON.stringify(s)"
					@click="changeFN(getNumber(s, i))">
					<pre v-if="settings.developerMode.value">c{{ current }}-i{{ i }}-n{{ getNumber(s, i) }}-w{{ checkWatched(getNumber(s, i)) }}</pre>
					{{ getNumber(s, i) }}
				</button>
			</h3>
		</div>
	</div>
</template>
<script lang="ts">
import { mapWritableState } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Segment, SerieEpisode, SerieMovie } from '@/types';

export default defineComponent({
	props: {
		title: { type: String },
		array: { type: Array as PropType<SerieMovie[] | SerieEpisode | SerieEpisode[][]> },
		current: { type: Number },
		changeFN: { type: Function as PropType<(ID: number) => void>, required: true },
		currentSeason: { type: Number, default: -1 },
		currentSeriesID: { type: String, default: '-1' },
		watchList: { type: Array as PropType<Segment[]>, default: [] },
		season: { type: Boolean, default: false },
	},
	computed: {
		...mapWritableState(useAuthStore, ['settings']),
		isMovie() {
			return this.currentSeason == -1 && this.season == false;
		},
	},
	methods: {
		getNumber(s: SerieEpisode | SerieMovie | SerieEpisode[], i: number) {
			return this.isMovie ? i + 1 : this.season ? (s as SerieEpisode[])[0].season : (s as SerieEpisode).episode;
		},
		checkWatched(index: number) {
			if (this.season) {
				const filteredList = this.watchList.filter(
					(seg) => (seg.ID == this.$route.query.id || seg.ID == this.currentSeriesID) && seg.watched && seg.season == index
				);
				const idx = (this.array as SerieEpisode[][]).findIndex((s) => s[0].season == index);
				return (this.array as SerieEpisode[][])[idx].length <= filteredList.length;
			} else {
				if (this.watchList.length != 0) {
					return Boolean(
						this.watchList.find((segment) => {
							return (
								(segment.ID == this.$route.query.id || segment.ID == this.currentSeriesID) &&
								segment.watched &&
								((segment.season == this.currentSeason && segment.episode == index) || (this.currentSeason == -1 && segment.movie == index))
							);
						})
					);
				}
			}
		},
	},
});
</script>
<style lang="scss" scoped>
.crazy-green {
	background-color: #00ff40;
}

h3 button {
	margin-left: 5px;
	margin-bottom: 3px;
}
</style>
