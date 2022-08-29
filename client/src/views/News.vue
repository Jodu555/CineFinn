<template lang="">
	<div class="container">
		<div>
			<h1 class="text-center">News</h1>
			<div class="text-end">
				<button class="btn btn-outline-info" @click="toggleSort">Sort</button>
			</div>
		</div>
		<div v-for="(obj, i) in news">
			<hr v-if="i == 0" />
			<h4 class="text-center">{{ obj.message }}</h4>
			<p class="text-muted float-end">- {{ new Date(obj.time).toLocaleString() }}</p>
			<br />
			<hr />
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			sort: true,
			news: [
				{ time: 1661756485430, message: 'Added Interspective Reviewers' },
				{ time: 1661675558678, message: 'Added Season 3 & 4 of Food Wars' },
				{ time: 1661756485430, message: 'Added Interspective Reviewers' },
			],
		};
	},
	methods: {
		changeSort() {
			this.news = this.news.sort((a, b) => {
				return this.sort == true ? a.time - b.time : b.time - a.time;
			});
		},
		toggleSort() {
			this.sort = !this.sort;
			this.changeSort();
		},
	},
	created() {
		this.changeSort();
	},
};
</script>
<style lang=""></style>
