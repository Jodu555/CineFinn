<template lang="">
	<div>
		<div class="row justify-content-start">
			<h2 class="col-sm-2" style="width: 13.666667%">{{ title }}</h2>
			<h3 class="col">
				<button
					style="font-weight: 900; font-size: 1.18rem; padding: 0.3rem 0.6rem"
					type="button"
					:class="{
						btn: true,
						'text-white': true,
						'btn-secondary': current !== i + 1 && !checkWatched(i), //Unselected && Not Watched
						'btn-info': current == i + 1, // Selected
						'btn-success': checkWatched(i) && current !== i + 1, // Watched && Not Selected
						'crazy-green': checkWatched(i) && current !== i + 1, // Watched && Not Selected
					}"
					v-for="(s, i) in array"
					:key="s"
					@click="chnageFN(i + 1)"
				>
					{{ i + 1 }}
				</button>
			</h3>
		</div>
	</div>
</template>
<script>
export default {
	// props: ['title', 'array', 'current', 'chnageFN', 'watchList'],
	props: {
		title: { type: String },
		array: { type: Array },
		current: { type: Number },
		chnageFN: { type: Function },
		currentSeason: { type: Number, default: -1 },
		watchList: { type: Array, default: [] },
	},
	methods: {
		checkWatched(ep) {
			//TODO: add ID restrictions
			if (this.watchList.length != 0) {
				return Boolean(
					this.watchList.find(
						(segment) =>
							segment.season == this.currentSeason && segment.episode == ep + 1 && segment.watched
					)
				);
			} else {
				return false;
			}
		},
	},
};
</script>
<style lang="scss">
.crazy-green {
	background-color: #00ff40;
}
</style>
