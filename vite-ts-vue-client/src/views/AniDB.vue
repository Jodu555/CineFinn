<template>
	<div class="container" v-auto-animate>
		<br />

		<div class="d-flex justify-content-between">
			<button v-if="auth.userInfo.role >= 2" class="btn btn-outline-primary mb-5" @click="addEmptyItem">Add
				Item</button>

			<div>
				<h2 class="text-center">AniDB</h2>
			</div>

			<button v-if="auth.userInfo.role >= 2" class="btn btn-outline-danger mb-5"
				@click="rescrapeAllItems">Rescrape All Items</button>
		</div>

		<div v-if="loading" class="d-flex justify-content-center mt-2 mb-5">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<div id="cards" class="row row-cols-1 row-cols-md-3 g-4">
			<div v-for="anime in animes" class="col">
				<div class="card mb-3" style="max-width: 540px">
					<div class="row g-0">
						<div class="col-md-4">
							<img :src="anime.coverImage" class="img-fluid rounded-start" style="height: 100%" />
						</div>
						<div class="col-md-8">
							<div class="card-body">
								<h5 v-if="anime.loading" id="title" class="card-title">Loading...</h5>
								<h5 v-else id="title" class="card-title">{{ anime.name }}</h5>
								<div class="d-flex justify-content-between">
									<div class="d-flex justify-content-end gap-2">
										<small @click="refetchAnime(anime.ID)" style="cursor: pointer"
											class="text-success-emphasis">Refetch</small>
										<small @click="deleteAnime(anime.ID)" style="cursor: pointer"
											class="text-danger-emphasis">Delete</small>
									</div>
									<p class="card-text">
										<small class="text-body-secondary">Episodes: {{ anime.totalEpisodes }}</small>
									</p>
								</div>
								<div v-if="anime.loading" class="d-flex justify-content-center mt-5">
									<div class="spinner-border text-primary" role="status">
										<span class="visually-hidden">Loading...</span>
									</div>
								</div>
								<ul v-else id="languages" class="list-group mt-3 list-group-flush">
									<template v-if="anime.groups.length == 0">
										<li class="list-group-item">No languages found</li>
									</template>
									<template v-else>
										<li v-for="group in anime.groups" class="list-group-item">
											<small :class="{
												'text-info': group.languages.includes('EngDub') && !group.languages.includes('GerDub'),
												'text-success': group.languages.includes('GerDub'),
											}">{{ group.name }} - {{ group.languages.join(', ') }} | {{ group.highestEpisodeCount }}</small>
										</li>
									</template>
								</ul>

								<p class="card-text d-flex justify-content-end mb-0">
									<small class="text-body-secondary">ID: {{ anime.ID }}</small>
								</p>
								<p class="card-text d-flex justify-content-end mb-0">
									<small class="text-body-secondary">Age: {{ new
										Date(anime.lastScraped).toLocaleString() }}</small>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useAuthStore } from '@/stores/auth.store';
import { useAxios } from '@/utils';
import { useSocket } from '@/utils/socket';
import axios from 'axios';
import { getCurrentInstance, onMounted, ref } from 'vue';

const instance = getCurrentInstance()!.appContext.config.globalProperties;
const auth = useAuthStore();
const $socket = useSocket();

const loading = ref(false);

const ids = ref<number[]>([]);

const animes = ref<AniDBAnime[]>([]);

interface AniDBAnime {
	loading: boolean;
	ID: number;
	totalEpisodes: number;
	name: string;
	coverImage: string;
	lastScraped: number;
	groups: {
		name: string;
		state: string;
		highestEpisodeCount: string;
		languages: string[];
	}[];
}

function transformAniDBAnime(data: AniDBAnime): AniDBAnime {
	const keys = ['GerSub', 'EngDub', 'GerDub'];
	let hasDub: string[] = [];
	const filtered = data.groups
		.map((x) => {
			return {
				name: x.name,
				state: x.state,
				highestEpisodeCount: x.highestEpisodeCount,
				languages: x.languages
					.map((l) => {
						const re = /(audio|subtitle)[ ]\|[ ](language):[ ](.*)/gm;
						const res = re.exec(l);
						if (!res) return undefined;
						const [_, type, __, lang] = res;

						if (type == 'audio' && lang == 'german') {
							return 'GerDub' as string;
						}

						if (type == 'audio' && lang == 'english') {
							return 'EngDub';
						}

						if (type == 'subtitle' && lang == 'german') {
							return 'GerSub';
						}

						if (type == 'subtitle' && lang == 'english') {
							return 'EngSub';
						}
						return undefined;
					})
					.filter((x) => x),
			};
		})
		.filter((x) => x.languages.some((l) => keys.some((k) => l?.includes(k))))
		.filter((g) => {
			if (g.languages.includes('GerDub')) {
				if (hasDub.includes('GerDub')) {
					return false;
				}
				hasDub.push('GerDub');
				return true;
			}
			if (g.languages.includes('EngDub')) {
				if (hasDub.includes('EngDub')) {
					return false;
				}
				hasDub.push('EngDub');
				return true;
			}
		});

	data.groups = filtered as any;
	return data;
}

async function load() {
	loading.value = true;
	try {
		const response = await useAxios().get<number[]>(`/anidb/list`);

		if (response.status != 200) {
			instance.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `Error loading AniDB Anime List!`,
				timerProgressBar: true,
			});
			return;
		}

		if (response.data == undefined) {
			instance.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `Error loading AniDB Anime List!`,
				timerProgressBar: true,
			});
			return;
		}

		if (response.data.length == 0) {
			instance.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `No Items found in the AniDB Anime List!`,
				timerProgressBar: true,
			});
			return;
		}

		ids.value = response.data;
	} catch (error) {
		instance.$swal({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 3000,
			icon: 'error',
			title: `Error loading AniDB Anime List!`,
			timerProgressBar: true,
		});
		return;
	} finally {
		loading.value = false;
	}

	animes.value = ids.value.map((id) => {
		return {
			loading: true,
			ID: id,
			totalEpisodes: 0,
			name: '',
			coverImage: '',
			lastScraped: 0,
			groups: [],
		};
	});

	/**
	 *
	 * Timing Results:
	 * Loading with Cache and no parallelization: 184.0029296875 ms
	 * Loading with Cache and parallelization: 237.534912109375 ms
	 * Loading without Cache and no parallelization: 9013.2080078125 ms
	 * Loading without Cache and parallelization: Loading:  10747.005859375 ms
	 *
	 * This would indicate that the parallelization is completely useless
	 *
	 */

	console.time('Loading');
	for (const id of ids.value) {
		const data = await useAxios().get<AniDBAnime>(`/anidb/anime/${id}`);
		const target = animes.value.find((x) => x.ID == id);
		const anime = transformAniDBAnime(data.data);
		if (!target) return;
		target.loading = false;
		target.coverImage = anime.coverImage;
		target.name = anime.name;
		target.totalEpisodes = anime.totalEpisodes || 0;
		target.groups = anime.groups;
		target.lastScraped = anime.lastScraped;
	}

	// await Promise.all(
	// 	ids.value.map(async (id) => {
	// 		const data = await useAxios().get<AniDBAnime>(`/anidb/anime/${id}`);
	// 		const target = animes.value.find((x) => x.ID == id);
	// 		const anime = transformAniDBAnime(data.data);
	// 		if (!target) return;
	// 		target.loading = false;
	// 		target.coverImage = anime.coverImage;
	// 		target.name = anime.name;
	// 		target.groups = anime.groups;
	// 	})
	// );
	console.timeEnd('Loading');
	loading.value = false;
}

onMounted(async () => {
	load();
});

async function addEmptyItem() {
	const { value: anidbID } = await instance.$swal({
		title: 'Enter AniDB ID',
		input: 'text',
		inputLabel: 'Your AniDB ID',
		showCancelButton: true,
		inputValidator: (value) => {
			if (!value) {
				return 'You need to write something!';
			}
			if (!Number.isInteger(Number(value))) {
				return 'Your ID has to be an integer!';
			}
		},
	});
	if (anidbID) {
		if (ids.value.find((x) => x == Number(anidbID))) {
			instance.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `The Card ${anidbID} is already in the list!`,
				timerProgressBar: true,
			});
			return;
		}
		instance.$swal({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 3000,
			icon: 'success',
			title: `The Card ${anidbID} has been added to the list! Please wait for the scraper to finish.`,
			timerProgressBar: true,
		});
		ids.value.push(Number(anidbID));
		const data = await useAxios().get<AniDBAnime>(`/anidb/anime/${anidbID}`);
		animes.value.push(transformAniDBAnime(data.data));
	}
}

async function refetchAnime(anidbID: number) {
	loading.value = true;
	animes.value = animes.value.map((x) => {
		if (x.ID == anidbID) {
			x.coverImage = '';
			x.loading = true;
		}
		return x;
	});

	await useAxios().get<AniDBAnime>(`/anidb/refetch/${anidbID}`);
	await load();
	loading.value = false;
}


async function deleteAnime(anidbID: number) {
	loading.value = true;
	animes.value = animes.value.filter((x) => {
		if (x.ID == anidbID) {
			return false;
		}
		return true;
	});
	await useAxios().get<AniDBAnime>(`/anidb/anime/${anidbID}/delete`);
	loading.value = false;
}

async function rescrapeAllItems() {
	loading.value = true;

	animes.value = animes.value.map((x) => {
		x.coverImage = '';
		x.loading = true;
		return x;
	});

	await useAxios().get<AniDBAnime>(`/anidb/refetch/`);
	await load();
	loading.value = false;
}
</script>

<style scoped></style>
