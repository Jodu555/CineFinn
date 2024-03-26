<template>
	<div class="container">
		<pre v-if="settings.developerMode.value">
				{{ { loading: loading, newsInput: newsInput, sort: sort } }}
		</pre
		>
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
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
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
<script lang="ts">
import { mapWritableState } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { useAxios } from '@/utils';
import type { NewsItem } from '@/types/index';

export default {
	data() {
		return {
			loading: true,
			newsInput: '',
			sort: false,
			news: [] as NewsItem[],
		};
	},
	computed: {
		...mapWritableState(useAuthStore, ['settings']),
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
			this.loading = true;
			const response = await useAxios().post('/news', {
				content: this.newsInput,
			});
			this.newsInput = '';

			if (response.status == 200) {
				await this.loadData();
			} else {
				this.$swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					icon: 'error',
					title: `${response.data?.error?.message}`,
					timerProgressBar: true,
				});
			}
			this.loading = false;
		},
		async loadData() {
			this.loading = true;
			const response = await useAxios().get('/news');
			if (response.status == 200) {
				this.news = response.data;
			}
			this.changeSort();
			this.loading = false;
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
