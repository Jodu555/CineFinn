<template>
	<div>
		<div class="d-flex row justify-content-start">
			<h2 class="col-sm-2 col-md-2 col-lg-1 col-3" style="margin-right: 3.5%">{{ title }}</h2>
			<!-- <h2 class="col-sm-1 col-3" style="margin-right: 3.5%">{{ title }}</h2> -->
			<h3 class="col">
				<button
					style="font-weight: 900; font-size: 1.18rem; padding: 0.3rem 0.6rem"
					type="button"
					:class="{
						btn: true,
						'text-white': true,
						'btn-secondary': true, //Unselected && Not Watched
						'btn-info': current == getNumber(s, i), //i + 1, // Selected
						'btn-success': current !== getNumber(s, i) && checkWatched(getNumber(s, i)), // Watched && Not Selected
						'crazy-green': current !== getNumber(s, i) && checkWatched(getNumber(s, i)), // Watched && Not Selected
					}"
					v-for="(s, i) in array"
					:key="s"
					@click="chnageFN(getNumber(s, i))"
				>
					{{ getNumber(s, i) }}
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
	computed: {
		isMovie() {
			return this.currentSeason == -1 && this.season == false;
		},
	},
	methods: {
		getNumber(s, i) {
			return this.isMovie ? i + 1 : this.season ? s[0].season : s.episode;
		},
		checkWatched(index) {
			if (this.season) {
				const filteredList = this.watchList.filter((seg) => seg.ID == this.$route.query.id && seg.watched && seg.season == index);
				const idx = this.array.findIndex((s) => s[0].season == index);
				return this.array[idx].length == filteredList.length;
			} else {
				if (this.watchList.length != 0) {
					return Boolean(
						this.watchList.find((segment) => {
							return (
								segment.ID == this.$route.query.id &&
								segment.watched &&
								((segment.season == this.currentSeason && segment.episode == index) || segment.movie == index)
							);
						})
					);
				}
			}
		},
	},
};
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
