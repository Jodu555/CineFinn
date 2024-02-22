<template>
	<div class="container" v-auto-animate>
		<br />

		<button class="btn btn-outline-primary mb-5" @click="addEmptyItem">Add Item</button>

		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<draggable
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
			item-key="ID"
		>
			<template #item="{ element }">
				<li class="list-group-item" v-auto-animate>
					<div class="d-flex justify-content-between">
						<div>
							{{ element.name }} -
							{{ element.categorie }}
							<span class="badge bg-info mx-2 me-3">{{ element.order }}</span>
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
							<button v-if="element.edited" type="button" @click="element.edited = false" class="btn btn-close"></button>
						</div>
					</div>
					<h5>Infos</h5>
					<div style="width: 15%" class="d-flex justify-content-around">
						<span v-if="element.references.aniworld" class="h6">A</span>
						<span v-if="element.references.zoro" class="h6">Z</span>
						<span v-if="element.references.sto" class="h6">S</span>
					</div>
					<ul v-if="element.scraped">
						<li>Episodes: {{ element?.scraped?.informations?.seasons.flat().length }}</li>
						<li>
							&nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk: {{ Math.round((element?.scraped?.informations?.seasons.flat().length * 260) / 1024) }}GB
						</li>
						<li>Movies: {{ element?.scraped?.informations?.movies.length }}</li>
						<li>&nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk: {{ Math.round((element?.scraped?.informations?.movies.length * 2000) / 1024) }}GB</li>
					</ul>

					<div v-if="element.edited">
						<div class="row text-center mt-2 mb-2 align-items-center">
							<div class="col-2">
								<label for="name" class="form-label">Name:</label>
							</div>
							<div class="col-7">
								<input
									type="text"
									:disabled="userInfo.UUID != element.creator && userInfo.role == 2"
									class="form-control"
									id="name"
									v-model="element.name"
								/>
							</div>
						</div>
						<template v-if="userInfo.role == 2">
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
									:disabled="userInfo.UUID != element.creator && userInfo.role == 2"
									class="form-select"
									aria-label="Default select example"
								>
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
									:disabled="userInfo.UUID != element.creator && userInfo.role == 2"
									class="form-control"
									id="url"
									v-model="element.references.aniworld"
								/>
							</div>
						</div>
						<div class="row text-center align-items-center">
							<div class="col-2">
								<label for="url" class="form-label">Zoro:</label>
							</div>
							<div class="col-7">
								<input
									type="text"
									:disabled="userInfo.UUID != element.creator && userInfo.role == 2"
									class="form-control"
									id="url"
									v-model="element.references.zoro"
								/>
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
									:disabled="userInfo.UUID != element.creator && userInfo.role == 2"
									class="form-control"
									id="url"
									v-model="element.references.sto"
								/>
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
								class="btn btn-outline-success"
							>
								Save
							</button>
						</div>
					</div>
				</li>
			</template>
		</draggable>

		<div v-if="settings.developerMode.value" class="mt-5">
			<pre>{{ state.list }}</pre>
		</div>
	</div>
</template>
<script setup>
import { reactive, computed, ref, onMounted, getCurrentInstance, onUnmounted } from 'vue';
import draggable from 'vuedraggable';
import { useStore } from 'vuex';

const instance = getCurrentInstance().appContext.config.globalProperties;
const store = useStore();

const settings = computed(() => store.state.auth.settings);
const userInfo = computed(() => store.state.auth.userInfo);

const loading = ref(false);

const state = reactive({
	list: [],
	permittedAccounts: [],
});

onMounted(async () => {
	document.title = `Cinema | Todo`;

	instance.$socket.on('todoListUpdate', (list) => {
		state.list = list;
	});
	loading.value = true;
	const response = await instance.$networking.get('/todo/');
	if (response.success) {
		state.list = response.json;
	}

	const accResponse = await instance.$networking.get('/todo/permittedAccounts');
	if (accResponse.success) {
		state.permittedAccounts = accResponse.json;
	}

	loading.value = false;
});

onUnmounted(() => {
	instance.$socket.off('todoListUpdate');
	document.title = `Cinema | Jodu555`;
});

const drag = ref(false);

const change = (event) => {
	state.list = state.list.map((name, index) => {
		return { ...name, order: index + 1 };
	});
	pushTodoListUpdate();
};

const addEmptyItem = () => {
	const ID = Math.round(Math.random() * 10 ** 6);
	const item = {
		name: '',
		creator: userInfo.value.UUID,
		edited: false,
		categorie: '',
		references: { aniworld: '', zoro: '', sto: '' },
		order: -1,
		ID,
	};
	state.list.push(item);
	change();
};

const deleteTodo = async (ID) => {
	const { isConfirmed: confirmed } = await instance.$swal.fire({
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

const useTodo = async (ID) => {
	const { isConfirmed: confirmed } = await instance.$swal.fire({
		title: 'Super!',
		text: 'Do you really want to USE this Todo?',
		icon: 'success',
		showCancelButton: true,
		cancelButtonText: 'No im not sure anymore!',
		confirmButtonText: 'Yes im sure!',
	});
	if (confirmed) {
		const todoObject = state.list.find((x) => x.ID == ID);
		const seriesObject = {
			categorie: todoObject.categorie,
			title: todoObject.name,
			movies: [],
			seasons: [],
			references: todoObject.references,
			infos: {},
		};

		if (todoObject.scraped) {
			seriesObject.infos = JSON.parse(JSON.stringify(todoObject?.scraped?.informations?.informations));
			delete seriesObject.infos.image;
		}
		const response = await instance.$networking.post('/index/', JSON.stringify(seriesObject));

		if (!response.success) {
			instance.$swal.fire({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: 'error',
				title: `${response.error}`,
				timerProgressBar: true,
			});
		} else {
			const newsObject = {
				content: `Added ${seriesObject.title}`,
				time: Date.now(),
			};
			await instance.$networking.post('/news/', JSON.stringify(newsObject));
		}
	}
};

const save = () => {
	pushTodoListUpdate();
};

const pushTodoListUpdate = async () => {
	console.log(userInfo.value.role, 2, userInfo.value.role >= 2);
	if (!(userInfo.value.role >= 2)) {
		console.log('Fire');
		instance.$swal.fire({
			icon: 'error',
			title: 'Oops...',
			text: 'Seems Like you do not have enough Permission to do that',
		});
	}
	const saveList = JSON.parse(JSON.stringify(state.list)).map((x) => {
		delete x.edited;
		// delete x.scraped;
		return x;
	});
	instance.$socket.emit('todoListUpdate', saveList);
};

const dragOptions = computed(() => {
	return {
		animation: 200,
		group: 'description',
		disabled: false,
		ghostClass: 'ghost',
	};
});
</script>
<style>
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
</style>
