<template>
	<div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xxl-3 mt-5 g-4">
		<div class="col" v-for="(movie, idx) in currentSeries.movies">
			<div
				@click="changeMovie(idx + 1)"
				class="card text-start movie-card"
				:class="{
					active: Boolean(
						watchList.find((segment) => {
							return segment.ID == $route.query.id && segment.watched && currentSeason == -1 && segment.movie == idx + 1;
						})
					),
				}">
				<div class="card-body">
					<h3 class="card-title">{{ movie.primaryName }}</h3>
					<p class="card-text text-muted">
						<img
							v-for="lang in movie.langs"
							:key="lang"
							class="shadow mb-2 mt-3 bg-body"
							style="width: 40px"
							:src="`/flag-langs/${lang.toLowerCase()}.svg`"
							:alt="langDetails[lang.toLowerCase()]?.alt || 'None Alt'"
							:title="langDetails[lang.toLowerCase()]?.title || 'None Title'" />
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapWritableState } from 'pinia';
import { langDetails } from '@/utils/constants';
import { useWatchStore } from '@/stores/watch.store';
export default defineComponent({
	props: {
		changeMovie: { type: Function as PropType<(id: number) => void>, required: true },
	},
	data() {
		return {
			langDetails: langDetails,
		};
	},
	computed: {
		...mapWritableState(useWatchStore, ['currentSeries', 'currentMovie', 'currentSeason', 'currentLanguage', 'watchList']),
	},
});
</script>
<style>
.movie-card {
	cursor: pointer;
}
.movie-card.active {
	-webkit-box-shadow: 0 8px 10px 0 #50f54d !important;
	box-shadow: 0 8px 10px 0 #50f54d !important;
}
</style>
