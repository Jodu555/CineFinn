<template lang="">
	<div>
		<div class="row justify-content-start">
			<h2 class="col-sm-2" style="width: 13.666667%">{{ title }}</h2>
			<!-- <pre>{{ array }}</pre> -->
			<h3 class="col">
				<button
					style="font-weight: 900; font-size: 1.18rem; padding: 0.3rem 0.6rem"
					type="button"
					:class="{
						btn: true,
						'text-white': true,
						'btn-secondary': current !== getNumber(s) && !checkWatched(getNumber(s) - 1), //Unselected && Not Watched
						'btn-info': current == getNumber(s), // Selected
						'btn-success': checkWatched(getNumber(s) - 1) && current !== getNumber(s), // Watched && Not Selected
						'crazy-green': checkWatched(getNumber(s) - 1) && current !== getNumber(s), // Watched && Not Selected
						// 'btn-secondary': current !== i + 1 && !checkWatched(i), //Unselected && Not Watched
						// 'btn-info': current == i + 1, // Selected
						// 'btn-success': checkWatched(i) && current !== i + 1, // Watched && Not Selected
						// 'crazy-green': checkWatched(i) && current !== i + 1, // Watched && Not Selected
					}"
					v-for="(s, i) in array"
					:key="s"
					@click="chnageFN(getNumber(s))"
				>
					{{ getNumber(s) }}
					<!-- {{ i + 1 }} -->
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
		season: { type: Boolean, default: false },
	},
	methods: {
		getNumber(s) {
			return this.season == true ? s[0].season : s.episode;
		},
		checkWatched(index) {
			if (this.season) {
				const filteredList = this.watchList.filter(
					(seg) => seg.ID == this.$route.query.id && seg.watched && seg.season == index + 1
				);
				return this.array[index].length == filteredList.length;
			} else {
				if (this.watchList.length != 0) {
					return Boolean(
						this.watchList.find((segment) => {
							return (
								segment.ID == this.$route.query.id &&
								segment.watched &&
								((segment.season == this.currentSeason && segment.episode == index + 1) ||
									segment.movie == index + 1)
							);
						})
					);
				} else {
					return false;
				}
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
