<template>
	<div class="container" v-auto-animate>
		<br />

		<div class="d-flex justify-content-between">
			<button v-if="auth.userInfo.role >= 2" class="btn btn-outline-primary mb-5" @click="addEmptyItem">Add Item</button>

			<div>
				<h2 class="text-center">AniDB</h2>
			</div>

			<button v-if="auth.userInfo.role >= 2" class="btn btn-outline-danger mb-5" @click="rescrapeAllItems">Rescrape All Items</button>
		</div>

		<div v-if="loading" class="d-flex justify-content-center">
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
								<h5 id="title" class="card-title">{{ anime.name }}</h5>
								<ul id="languages" class="list-group mt-3 list-group-flush">
									<template v-if="anime.groups.length == 0">
										<li class="list-group-item">No languages found</li>
									</template>
									<template v-else>
										<li v-for="group in anime.groups" class="list-group-item">
											<small
												:class="{
													'text-info': group.languages.includes('EngDub') && !group.languages.includes('GerDub'),
													'text-success': group.languages.includes('GerDub'),
												}"
												>{{ group.name }} - {{ group.languages.join(', ') }}</small
											>
										</li>
									</template>
								</ul>
								<p class="card-text d-flex justify-content-end">
									<small class="text-body-secondary">ID: {{ anime.ID }}</small>
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

const ids = ref([17695, 18205, 11086, 18291, 12264, 17583, 17498, 15287, 18528]);

const animes = ref<AniDBAnime[]>([]);

interface AniDBAnime {
	ID: number;
	name: string;
	coverImage: string;
	groups: {
		name: string;
		state: string;
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

onMounted(async () => {
	await Promise.all(
		ids.value.map(async (id) => {
			const data = await axios.get<AniDBAnime>('http://localhost:3000/anidb/anime/' + id);
			animes.value.push(transformAniDBAnime(data.data));
		})
	);
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
		instance.$swal({ title: `The Card ${anidbID} has been added to the list! Please wait for the scraper to finish.` });
		ids.value.push(Number(anidbID));
		const data = await axios.get<AniDBAnime>('http://localhost:3000/anidb/anime/' + anidbID);
		animes.value.push(transformAniDBAnime(data.data));
	}
}

function rescrapeAllItems() {
	loading.value = true;
	$socket.emit('callCheckForUpdates');
}
</script>

<style scoped></style>
