<template>
	<div class="container" v-auto-animate>
		<br />

		<div class="d-flex justify-content-between">
			<button class="btn btn-outline-primary mb-5" @click="addEmptyItem">Add Item</button>

			<button class="btn btn-outline-warning mb-5" @click="minimal = !minimal">Minimal View</button>

			<button class="btn btn-outline-danger mb-5" @click="rescrapeAllItems">Rescrape All Items</button>
		</div>

		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<draggable
			v-if="!loading"
			v-auto-animate
			class="list-group"
			tag="ul"
			:component-data="{
				tag: 'ul',
				name: !drag ? 'flip-list' : null,
			}"
			:list="state.list"
			v-bind="dragOptions"
			@start="drag = true"
			@end="drag = false"
			@change="change"
			item-key="ID">
			<template #item="{ element }: { element: TodoItem }">
				<li class="list-group-item" v-auto-animate>
					<div class="d-flex" v-auto-animate>
						<img
							v-if="
								!minimal &&
								element.scraped != undefined &&
								element.scraped !== true &&
								element.scraped.informations.image &&
								typeof element.scraped.informations.image == 'string'
							"
							:src="element.scraped.informations.image"
							class="img-fluid rounded-top me-4 dp-img"
							alt="" />
						<div style="width: 100%" v-auto-animate>
							<div class="d-flex justify-content-between">
								<div>
									{{ element.name }} -
									{{ element.categorie }}
									<span class="badge bg-primary mx-2 me-3">{{ element.order }}</span>
									<button v-if="!element.edited" title="Edit" type="button" @click="element.edited = true" class="btn btn-outline-primary me-3">
										<font-awesome-icon :icon="['fa-solid', 'fa-pen']" size="lg" />
									</button>
									<button v-if="!element.edited" title="Use" type="button" @click="useTodo(element.ID)" class="btn btn-outline-success me-3">
										<font-awesome-icon :icon="['fa-solid', 'fa-check']" size="lg" />
									</button>
									<button v-if="!element.edited" title="Delete" type="button" @click="deleteTodo(element.ID)" class="btn btn-outline-danger">
										<font-awesome-icon :icon="['fa-solid', 'fa-trash']" size="lg" />
									</button>
								</div>
								<div>
									<!-- Bring to Top -->
									<button
										v-if="!element.edited && element.order > 6 && auth.userInfo.role > 2"
										title="Bring to top"
										@click="moveToDoToTop(element.ID)"
										type="button"
										class="btn btn-outline-info me-2">
										<font-awesome-icon icon="fa-solid fa-up-long" />
									</button>
									<!-- Bring to Bottom -->
									<button
										v-if="!element.edited && element.order <= state.list.length / 1.2"
										title="Bring to Bottom"
										@click="moveToDoToBottom(element.ID)"
										type="button"
										class="btn btn-outline-warning">
										<font-awesome-icon icon="fa-solid fa-down-long" />
									</button>
									<button v-if="element.edited" type="button" @click="element.edited = false" class="btn btn-close"></button>
								</div>
							</div>
							<!-- <h5>Infos</h5> -->
							<span v-if="state.permittedAccounts.find((x) => x.UUID == element.creator) != null"
								>- {{ state.permittedAccounts.find((x) => x.UUID == element.creator)?.username }}</span
							>
							<div style="width: 15%" class="d-flex justify-content-around">
								<a v-if="element.references.aniworld" target="_blank" :href="element.references.aniworld" class="h6">A</a>
								<span v-if="element.references.zoro" class="h6">Z</span>
								<span v-if="element.references.sto" target="_blank" :href="element.references.aniworld" class="h6">S</span>
							</div>

							<ul v-if="!minimal && element.scraped != undefined && element.scraped !== true">
								<li>Episodes: {{ element.scraped?.seasons?.flat()?.length }}</li>
								<li>
									&nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk:
									{{ numWithFP((element.scraped?.seasons?.flat()?.length * constants.mbperEpisode) / 1024, 1) }}GB
								</li>
								<li v-for="[key, value] in Object.entries(languageDevision(element))">&nbsp;&nbsp;&nbsp;&nbsp;{{ key }}: {{ value }}%</li>
								<template v-if="element.scraped?.movies != undefined">
									<li>Movies: {{ element.scraped?.movies?.length }}</li>
									<li>
										&nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk:
										{{ numWithFP((element.scraped?.movies?.length * constants.mbperMovie) / 1024, 1) }}GB
									</li>
								</template>
								<li>
									<em>
										<template v-if="auth.userInfo.role > 2">
											Source:
											<br />
											<a target="_blank" :href="element.scraped?.url">{{ element.scraped?.url }}</a>
											<template v-if="element.scrapedZoro !== undefined && element.scrapedZoro !== true">
												<br />
												<a target="_blank" :href="element.scrapedZoro.episodes[0]?.url">{{ element.scrapedZoro.episodes[0]?.url }}</a>
											</template>
											<template v-if="element.scrapednewZoro !== undefined && element.scrapednewZoro !== true">
												<br />
												<a target="_blank" :href="element.scrapednewZoro.seasons[0][0].url">{{ element.scrapednewZoro.seasons[0][0].url }}</a>
											</template>
										</template>
										<br />
										<p style="cursor: pointer" @click="deleteParsedInfos(element.ID)"><u>Delete Scraped infos</u></p>
									</em>
								</li>
							</ul>

							<div v-if="element.scraped == true" class="m-3 d-flex justify-content-between">
								<div class="spinner-border text-warning spinner-border-xs" role="status">
									<span class="visually-hidden">Loading...</span>
								</div>
								<small class="text-danger" style="cursor: pointer" @click="retryScrapeTodo(element.ID)"><u>Retry</u></small>
							</div>

							<span v-if="element.scrapingError" class="h6 text-danger">
								<span
									>!!! {{ element.scrapingError }} !!! &nbsp;&nbsp;&nbsp;&nbsp;
									<small style="cursor: pointer" @click="retryScrapeTodo(element.ID)">
										<u>Retry</u>
									</small>
								</span>
							</span>

							<div v-if="element.edited">
								<div class="row text-center mt-2 mb-2 align-items-center">
									<div class="col-2">
										<label for="name" class="form-label">Name:</label>
									</div>
									<div class="col-7">
										<input
											type="text"
											:disabled="auth.userInfo.UUID != element.creator && auth.userInfo.role == 2"
											class="form-control"
											id="name"
											v-model="element.name" />
									</div>
								</div>
								<template v-if="auth.userInfo.role == 2">
									<div class="row text-center mt-2 mb-2 align-items-center">
										<div class="col-2">
											<label for="name" class="form-label">Creator:</label>
										</div>
										<div class="col-1 h5">
											<span>{{ state.permittedAccounts.find((x) => x.UUID == element.creator)?.username }}</span>
										</div>
									</div>
								</template>
								<template v-else>
									<div class="row text-center mt-2 mb-2 align-items-center">
										<div class="col-2">
											<label for="name" class="form-label">Creator:</label>
										</div>
										<div class="col-3">
											<select v-model="element.creator" style="width: 100%" class="form-select" aria-label="Default select example">
												<option selected disabled>From</option>
												<option v-for="account in state.permittedAccounts" :value="account.UUID">{{ account.username }}</option>
											</select>
										</div>
									</div>
								</template>
								<div class="row text-center mt-2 mb-2 align-items-center">
									<div class="col-2">
										<label for="name" class="form-label">Kategorie:</label>
									</div>
									<div class="col-3">
										<select
											v-model="element.categorie"
											style="width: 100%"
											:disabled="auth.userInfo.UUID != element.creator && auth.userInfo.role == 2"
											class="form-select"
											aria-label="Default select example">
											<option selected disabled>Kategorie</option>
											<option>Aniworld</option>
											<option>STO</option>
											<option>K-Drama</option>
										</select>
									</div>
								</div>
								<hr />
								<h5>References</h5>
								<h6>Anime</h6>
								<div class="row text-center align-items-center mb-4">
									<div class="col-2">
										<label for="url" class="form-label">Aniworld:</label>
									</div>
									<div class="col-7">
										<input
											type="text"
											:disabled="auth.userInfo.UUID != element.creator && auth.userInfo.role == 2"
											class="form-control"
											id="url"
											v-model="element.references.aniworld" />
									</div>
								</div>
								<div class="row text-center align-items-center">
									<div class="col-2">
										<label for="url" class="form-label">Zoro:</label>
									</div>
									<div class="col-7">
										<input
											type="text"
											:disabled="auth.userInfo.UUID != element.creator && auth.userInfo.role == 2"
											class="form-control"
											id="url"
											v-model="element.references.zoro" />
									</div>
								</div>
								<hr />
								<h6>Other</h6>
								<div class="row text-center align-items-center mb-4">
									<div class="col-2">
										<label for="url" class="form-label">STO:</label>
									</div>
									<div class="col-7">
										<input
											type="text"
											:disabled="auth.userInfo.UUID != element.creator && auth.userInfo.role == 2"
											class="form-control"
											id="url"
											v-model="element.references.sto" />
									</div>
								</div>

								<div class="d-flex justify-content-end">
									<button type="button" @click="element.edited = false" class="btn btn-outline-danger mx-2">Cancel</button>
									<button
										type="button"
										@click="
											element.edited = false;
											save();
										"
										class="btn btn-outline-success">
										Save
									</button>
								</div>
							</div>
						</div>
					</div>
				</li>
			</template>
		</draggable>

		<div v-if="state.list.length >= 7" class="d-flex justify-content-between mt-5 mb-5">
			<button class="btn btn-outline-primary mb-5" @click="addEmptyItem">Add Item</button>

			<button class="btn btn-outline-warning mb-5" @click="minimal = !minimal">Minimal View</button>

			<button class="btn btn-outline-danger mb-5" @click="rescrapeAllItems">Rescrape All Items</button>
		</div>

		<div v-if="auth.settings.developerMode.value" class="mt-5">
			<pre>{{ state.list }}</pre>
		</div>
	</div>
</template>
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useAxios } from '@/utils';
import { useSocket } from '@/utils/socket';
import { reactive, computed, ref, onMounted, getCurrentInstance, onUnmounted } from 'vue';

import type { NewsItem, TodoItem } from '@/types/index';
import type { AniWorldAdditionalSeriesInformations } from '@/types/scraper';
import draggable from 'vuedraggable';

const minimal = ref(false);

const instance = getCurrentInstance()!.appContext.config.globalProperties;
const auth = useAuthStore();
const $socket = useSocket();

const loading = ref(false);

const numWithFP = (num: string | number, pts: number): number => {
	if (typeof num == 'number') num = String(num);
	return parseFloat(parseFloat(num).toFixed(pts));
};

const constants = reactive({
	mbperEpisode: 260,
	mbperMovie: 1024,
});

const state = reactive({
	list: [] as TodoItem[],
	permittedAccounts: [] as permAcc[],
});

const windowWidth = ref(0);

const dragOptions = computed(() => {
	return {
		animation: 200,
		group: 'description',
		disabled: windowWidth.value < 580,
		ghostClass: 'ghost',
	};
});

onMounted(() => {
	window.addEventListener('resize', handleWindowSizeChange);
	handleWindowSizeChange();
});
onUnmounted(() => {
	window.removeEventListener('resize', handleWindowSizeChange);
});
const handleWindowSizeChange = () => {
	windowWidth.value = window.innerWidth;
	if (windowWidth.value < 580) {
	}
};

interface permAcc {
	UUID: string;
	username: string;
	role: number;
}

onMounted(async () => {
	document.title = `Cinema | Todo`;

	$socket.on('todoListUpdate', (list) => {
		const editedIDs = state.list.filter((x) => x.edited == true).map((x) => x.ID);

		state.list = list
			.map((x) => {
				if (editedIDs.find((y) => y == x.ID)) {
					x.edited = true;
				}
				return x;
			})
			.sort((a, b) => a.order - b.order);
	});
	loading.value = true;

	const [response, accResponse] = await Promise.all([useAxios().get<TodoItem[]>('/todo/'), useAxios().get<permAcc[]>('/todo/permittedAccounts')]);

	if (response.status == 200) {
		state.list = response?.data?.sort((a, b) => a.order - b.order);
	}
	if (accResponse.status == 200) {
		state.permittedAccounts = accResponse.data;
	}

	loading.value = false;
});

onUnmounted(() => {
	$socket.off('todoListUpdate');
	document.title = `Cinema | Jodu555`;
});

const drag = ref(false);

const languageDevision = (element: TodoItem) => {
	const out: Record<string, number> = {};
	if (element.scraped == undefined || element.scraped == true) return out;
	const total = element.scraped.seasons.flat().length;

	element.scraped.seasons.flat().forEach((x) => x.langs.forEach((l) => (!out[l] ? (out[l] = 1) : (out[l] += 1))));

	if (element.scrapedZoro != undefined && element.scrapedZoro !== true) {
		const zoroEps = element.scrapedZoro?.episodes;
		zoroEps.forEach((e) => {
			e.langs.forEach((l) => {
				if (l == 'sub') l = 'EngSub';
				if (l == 'dub') l = 'EngDub';
				if (out[l]) {
					out[l] += 1;
				} else {
					out[l] = 1;
				}
			});
		});
	}
	if (element.scrapednewZoro != undefined && element.scrapednewZoro !== true) {
		const zoroEps = element.scrapednewZoro?.seasons.flat();
		zoroEps.forEach((e) => {
			e.langs.forEach((l) => {
				if (l == 'sub') l = 'EngSub';
				if (l == 'dub') l = 'EngDub';
				if (out[l]) {
					out[l] += 1;
				} else {
					out[l] = 1;
				}
			});
		});
	}

	for (const [key, value] of Object.entries(out)) {
		out[key] = parseFloat(parseFloat(String((value / total) * 100)).toFixed(2));
	}

	if (out['GerDub'] == 100) {
		delete out['GerSub'];
		delete out['EngSub'];
	} else if (out['GerSub'] == 100 && out['EngSub']) {
		delete out['EngSub'];
	}

	return out;
};

const moveToDoToTop = (ID: string) => {
	const index = state.list.findIndex((x) => x.ID == ID);
	const item = state.list.splice(index, 1)[0];
	state.list.unshift(item);
	change();
};

const moveToDoToBottom = (ID: string) => {
	const index = state.list.findIndex((x) => x.ID == ID);
	const item = state.list.splice(index, 1)[0];
	state.list.push(item);
	change();
};

const change = (event?: any) => {
	state.list = state.list.map((name, index) => {
		return { ...name, order: index + 1 };
	});
	pushTodoListUpdate();
};

const addEmptyItem = () => {
	const ID = String(Math.round(Math.random() * 10 ** 6));
	const item = {
		name: '',
		creator: auth.userInfo.UUID,
		edited: false,
		categorie: '',
		references: { aniworld: '', zoro: '', sto: '' },
		order: -1,
		ID,
	} as TodoItem;
	state.list.push(item);
	change();
};

const deleteTodo = async (ID: string) => {
	const { isConfirmed: confirmed } = await instance.$swal({
		title: 'Error!',
		text: 'Do you really want to DELETE this Todo?',
		icon: 'warning',
		showCancelButton: true,
		cancelButtonText: 'No im not sure anymore!',
		confirmButtonText: 'Yes im sure!',
	});
	if (confirmed) {
		state.list = state.list.filter((x) => x.ID != ID);
		change();
	}
};

const useTodo = async (ID: string) => {
	const { isConfirmed: confirmed } = await instance.$swal({
		title: 'Super!',
		text: 'Do you really want to USE this Todo?',
		icon: 'success',
		showCancelButton: true,
		cancelButtonText: 'No im not sure anymore!',
		confirmButtonText: 'Yes im sure!',
	});
	if (confirmed) {
		const todoObject = state.list.find((x) => x.ID == ID);
		if (!todoObject) {
			instance.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `Todo Item with ID ${ID} not found`,
				timerProgressBar: true,
			});
			return;
		}
		const seriesObject = {
			categorie: todoObject.categorie,
			title: todoObject.name,
			movies: [],
			seasons: [],
			references: todoObject.references,
			infos: {} as Partial<AniWorldAdditionalSeriesInformations>,
		};

		if (todoObject.scraped !== true) {
			seriesObject.infos = JSON.parse(JSON.stringify(todoObject.scraped?.informations));
			delete seriesObject?.infos?.image;
		}
		const response = await useAxios().post('/index/', seriesObject);

		if (response.status !== 200) {
			instance.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `${response.data.error.message || 'An Error occurd'}`,
				timerProgressBar: true,
			});
		} else {
			const newsObject = {
				content: `Added ${seriesObject.title}`,
				time: Date.now(),
			} as NewsItem;
			await useAxios().post('/news/', newsObject);
		}
	}
};

const save = () => {
	pushTodoListUpdate();
};

const deleteParsedInfos = (ID: string) => {
	state.list = state.list.map((x) => {
		if (x.ID == ID) {
			delete x?.scraped;
			delete x?.scrapedZoro;
			delete x?.scrapednewZoro;
			return x;
		} else {
			return x;
		}
	});
	pushTodoListUpdate();
};

const retryScrapeTodo = (ID: string) => {
	state.list = state.list.map((x) => {
		if (x.ID == ID) {
			delete x?.scraped;
			delete x?.scrapingError;
			return x;
		} else {
			return x;
		}
	});
	pushTodoListUpdate();
};

const rescrapeAllItems = () => {
	state.list = state.list.map((x) => {
		delete x?.scraped;
		delete x?.scrapingError;
		return x;
	});
	pushTodoListUpdate();
};

const pushTodoListUpdate = async () => {
	console.log(auth.userInfo.role, 2, auth.userInfo.role >= 2);
	if (!(auth.userInfo.role >= 2)) {
		console.log('Fire');
		instance.$swal({
			icon: 'error',
			title: 'Oops...',
			text: 'Seems Like you do not have enough Permission to do that',
		});
	}
	const saveList = (JSON.parse(JSON.stringify(state.list)) as TodoItem[]).map((x) => {
		delete x.edited;
		// delete x.scraped;
		return x;
	});
	useSocket().emit('todoListUpdate', saveList);
};
</script>
<style scoped lang="scss">
.flip-list-move {
	transition: transform 0.5s;
}

.no-move {
	transition: transform 0s;
}

.ghost {
	opacity: 0.5;
	background: #c8ebfb;
}

.list-group-item {
	cursor: move;
}

.dp-img {
	max-width: 18rem;
	min-width: 17rem;
	min-height: 24rem;
	max-height: 20rem;
	width: 100%;
	object-fit: cover;
	border-radius: 25px;
}
</style>
