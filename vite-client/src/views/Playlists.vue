<template>
	<div class="container">
		<div class="row mt-3 g-3">
			<div class="col" v-for="playlist in playlists">
				<!-- <div class="card mb-3" style="max-width: 540px; padding: 1rem" :style="{ height: `${13 + 0.4 + playlist.children.length * 0.2}rem` }"> -->
				<div
					v-auto-animate
					class="card mb-3"
					style="max-width: 540px; padding: 1rem"
					:style="{ height: `${expand ? 58 : 35 + 2 + playlist.children.length * 1}vh` }"
				>
					<div v-if="!expand" class="row g-5">
						<div class="col-md-5">
							<div class="image-wrapper">
								<img
									v-for="(child, idx) in playlist.children.slice(0, 5)"
									class="playlist-image rounded"
									:style="{ 'margin-left': `${idx * 1.1}rem`, 'margin-top': `${idx * 0.2}rem`, 'z-index': playlist.children.length - idx }"
									:src="`http://cinema-api.jodu555.de/images/${child.ID}/cover.jpg?auth-token=41d83991-b9a6-4b3b-b30e-856d42bdb0ee`"
									alt="Title"
								/>
							</div>
						</div>
						<div class="col-md-6">
							<div class="card-body">
								<div class="d-flex justify-content-between">
									<div>
										<h3 class="card-title">{{ playlist.name }}</h3>
									</div>
									<div>
										<button @click="expand = true" type="button" class="btn btn-primary">&rtri;</button>
									</div>
								</div>
								<div class="card-text">
									<p class="text-body-secondary">
										Created: {{ new Date().toLocaleDateString() }} <br />
										Items: {{ playlist.children.length }}
									</p>
								</div>
							</div>
						</div>
					</div>
					<div v-else>
						<div class="card-body" style="padding: 0">
							<div class="d-flex justify-content-between">
								<div>
									<h3 class="card-title">{{ playlist.name }}</h3>
								</div>
								<div>
									<button @click="expand = false" type="button" class="btn btn-primary">&ltri;</button>
								</div>
							</div>
						</div>
						<div class="d-flex mt-4 justify-content-between">
							<div style="margin-top: 15%; margin-right: 5%">
								<button @click="prev" type="button" class="btn btn-primary">&lt;</button>
							</div>
							<div v-auto-animate class="card-img-bottom image-wrapper">
								<img
									v-for="(child, idx) in playlist.children.slice(start % playlist.children.length, end)"
									:key="child.ID"
									@mouseover="selected = child"
									@click="$router.push({ path: '/watch', query: { id: child.ID } })"
									class="playlist-image playlist-bottom-image rounded"
									:style="{ 'margin-left': `${idx * 2}rem`, 'z-index': playlist.children.length - idx }"
									:src="`http://cinema-api.jodu555.de/images/${child.ID}/cover.jpg?auth-token=41d83991-b9a6-4b3b-b30e-856d42bdb0ee`"
									:alt="child.ID"
									:text="child.ID"
								/>
							</div>
							<div style="margin-top: 15%; margin-right: 5%">
								<button @click="next(playlist)" type="button" class="btn btn-primary">></button>
							</div>
						</div>
						<div style="margin-top: 16vh" class="d-flex justify-content-center">
							<h3 class="text-truncate">{{ selected.title }}</h3>
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
			expand: false,
			start: 0,
			end: 8,
			selected: '',
			playlists: [
				{
					name: 'Legend Tier',
					children: [
						'814f331c',
						'325ec6e5',
						'7dbb748a',
						'ee28ef23',
						'baeaf204',
						'49381178',
						'dbc0aa61',
						'00ba2a50',
						'bc3ed45e',
						'48ccd6f0',
						'64cd2545',
						'6a8720f5',
						'14580e05',
						'e2708912',
						'dda00ebc',
						'dd921d8f',
						'125e06d6',
						'34f7f256',
						'8b76d630',
						'314966cb',
						'c734e9c1',
						'bd8b45d0',
						'8922a4f0',
						'a570c73c', //Last: The Dawn of the witch
					],
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
		next(playlist) {
			this.end += 8;
			this.start += 8;

			if (this.end > playlist.children.length) {
				this.end = playlist.children.length;
				this.start -= 8;
			}
		},
		prev() {
			this.end -= 8;
			this.start -= 8;
			if (this.end < 8) this.end = 8;
			if (this.start < 0) this.start = 0;
		},
		async loadData() {
			//TODO: Do the get playlist stuff here
			// this.loading = true;
			// const response = await this.$networking.get('/playlists');
			// if (response.success) {
			// 	this.playlists = response.json;
			// }
			// this.loading = false;

			this.playlists = this.playlists.map((x) => {
				return {
					name: x.name,
					children: x.children.map((y) => {
						return { ID: y, title: this.series.find((s) => s.ID == y).title };
					}),
				};
			});
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
	opacity: 0.9;
	transition: all 200ms ease-in-out;
}

.playlist-bottom-image:hover {
	margin-top: -10vh !important;
	transform: scale(1.2);
	opacity: 1;
}
</style>
