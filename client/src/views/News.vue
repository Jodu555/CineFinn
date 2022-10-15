<template>
	<div class="container">
		<div>
			<h1 class="text-center">News</h1>
			<div class="text-end">
				<button class="btn btn-outline-info" @click="toggleSort">Sort {{ buttonInfo }}</button>
			</div>
		</div>
		<div v-for="(obj, i) in news">
			<hr v-if="i == 0" />
			<figure class="text-center">
				<blockquote class="blockquote">
					<p>{{ obj.content }}</p>
				</blockquote>
				<figcaption class="blockquote-footer">
					{{ new Date(obj.time).toLocaleString() }}
				</figcaption>
			</figure>
			<hr />
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			sort: false,
			news: [],
		};
	},
	computed: {
		buttonInfo() {
			return this.sort ? '↓' : '↑';
		},
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
	async created() {
		const response = await this.$networking.get('/news');
		if (response.success) {
			this.news = response.json;
		}
		this.changeSort();
		document.title = `Cinema | News`;
	},
};
</script>
<style></style>
