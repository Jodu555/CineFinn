<template>
	<div class="container">
		<div class="row mt-3 g-3">
			<div class="col" v-for="playlist in playlists">
				<div class="card mb-3" style="max-width: 540px; padding: 1rem" :style="{ height: `${13 + 0.4 + playlist.children.length * 0.2}rem` }">
					<div class="row g-0">
						<div class="col-md-5">
							<div class="image-wrapper">
								<img
									v-for="(childID, idx) in playlist.children"
									class="playlist-image rounded"
									:style="{ 'margin-left': `${idx * 1.1}rem`, 'margin-top': `${idx * 0.2}rem`, 'z-index': playlist.children.length - idx }"
									:src="`http://cinema-api.jodu555.de/images/${childID}/cover.jpg?auth-token=41d83991-b9a6-4b3b-b30e-856d42bdb0ee`"
									alt="Title"
								/>
							</div>
						</div>
						<div class="col-md-6">
							<div class="card-body">
								<h3 class="card-title">{{ playlist.name }}</h3>
								<p class="card-text">
									<p class="text-body-secondary"
										>Created: {{ new Date().toLocaleDateString() }} <br />
										Items: {{ playlist.children.length }}
									</p>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState } from 'vuex';

export default {
	data() {
		return {
			playlists: [
				{
					name: 'Legend Tier',
					children: ['814f331c', '325ec6e5', '7dbb748a', '42d01d09', '8e2426ae', '814f331c'],
				},
				// { name: 'Noice', children: ['42bd8f65', '310a3546'] },
			],
		};
	},
	computed: {
		...mapState('auth', ['settings']),
		...mapState(['series', 'loading']),
	},
	methods: {
		async loadData() {
			// this.loading = true;
			// const response = await this.$networking.get('/news');
			// if (response.success) {
			// 	this.news = response.json;
			// }
			// this.changeSort();
			// this.loading = false;
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
<style>
.image-wrapper {
	position: relative;
	width: 100%;
	height: 100%;
}
.playlist-image {
	height: 35vh;
	width: auto;
	position: absolute;
	top: 0;
	left: 0;
}
</style>
