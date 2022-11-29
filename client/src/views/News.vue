<template>
	<div class="container">
		<div>
			<h1 class="text-center">News</h1>
			<div v-if="settings.showNewsAddForm.value">
				<form @submit.prevent="onAddNews" class="text-center mb-3 hstack gap-4">
					<input type="text" v-model="newsInput" class="form-control" placeholder="News" />
					<button type="submit" :disabled="!(newsInput.trim().length > 5)" class="btn btn-outline-primary">Submit</button>
				</form>
			</div>
			<div class="text-end">
				<button class="btn btn-outline-info" @click="toggleSort">Sort {{ buttonInfo }}</button>
			</div>
		</div>
		<div v-for="(obj, i) in news" :key="i">
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
import { mapState } from 'vuex';

export default {
	data() {
		return {
			newsInput: '',
			sort: false,
			news: [],
		};
	},
	computed: {
		...mapState('auth', ['settings']),
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
		async onAddNews() {
			const response = await this.$networking.post(
				'/news',
				JSON.stringify({
					content: this.newsInput,
				})
			);

			if (response.success) {
				await this.loadData();
			} else {
				console.log(`response`, response);
				this.$swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					icon: 'danger',
					title: `${response.error}`,
					timerProgressBar: true,
				});
			}
		},
		async loadData() {
			const response = await this.$networking.get('/news');
			if (response.success) {
				this.news = response.json;
			}
			this.changeSort();
		},
	},
	async created() {
		await this.loadData();
		document.title = `Cinema | News`;
	},
	beforeUnmount() {
		document.title = `Cinema | Jodu555`;
	},
};
</script>
<style></style>
