<template>
	<div class="container" v-auto-animate>
		<br />
		<button class="btn btn-outline-primary mb-5" @click="addEmptyItem">Add Item</button>

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
							<span class="badge bg-info mx-2">{{ element.order }}</span>
							<button v-if="!element.edited" type="button" @click="element.edited = true" class="btn btn-outline-primary">
								<font-awesome-icon :icon="['fa-solid', 'fa-pen']" size="lg" />
							</button>
						</div>
						<div>
							<button v-if="element.edited" type="button" @click="element.edited = false" class="btn btn-close"></button>
						</div>
					</div>

					<div v-if="element.edited">
						<div class="row text-center mt-2 mb-2 align-items-center">
							<div class="col-2">
								<label for="name" class="form-label">Name:</label>
							</div>
							<div class="col-7">
								<input type="text" class="form-control" id="name" v-model="element.name" />
							</div>
						</div>
						<div class="row text-center mt-2 mb-2 align-items-center">
							<div class="col-2">
								<label for="name" class="form-label">Kategorie:</label>
							</div>
							<div class="col-3">
								<select v-model="element.categorie" style="width: 100%" class="form-select" aria-label="Default select example">
									<option selected disabled>Kategorie</option>
									<option>Aniworld</option>
									<option>STO</option>
									<option>K-Drama</option>
								</select>
							</div>
						</div>
						<!-- <div class="row text-center mt-2 mb-2 align-items-center">
								<div class="col-2">
									<label for="name" class="form-label">From:</label>
								</div>
								<div class="col-3">
									<select v-model="element.from" style="width: 100%" class="form-select" aria-label="Default select example">
										<option selected disabled>From</option>
										<option value="UUID">Jodu555</option>
										<option value="UUID">Svenja</option>
									</select>
								</div>
							</div> -->
						<hr />
						<h5>References</h5>
						<h6>Anime</h6>
						<div class="row text-center align-items-center mb-4">
							<div class="col-2">
								<label for="url" class="form-label">Aniworld:</label>
							</div>
							<div class="col-7">
								<input type="text" class="form-control" id="url" v-model="element.references.aniworld" />
							</div>
						</div>
						<div class="row text-center align-items-center">
							<div class="col-2">
								<label for="url" class="form-label">Zoro:</label>
							</div>
							<div class="col-7">
								<input type="text" class="form-control" id="url" v-model="element.references.zoro" />
							</div>
						</div>
						<hr />
						<h6>Other</h6>
						<div class="row text-center align-items-center mb-4">
							<div class="col-2">
								<label for="url" class="form-label">STO:</label>
							</div>
							<div class="col-7">
								<input type="text" class="form-control" id="url" v-model="element.references.sto" />
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

const state = reactive({
	list: [],
});

onMounted(async () => {
	instance.$socket.on('todoListUpdate', (list) => {
		state.list = list;
	});

	const response = await instance.$networking.get('/todo/');
	if (response.success) {
		state.list = response.json;
	}
});

onUnmounted(() => {
	instance.$socket.off('todoListUpdate');
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
	const item = { name: '', edited: false, categorie: '', references: { aniworld: '', zoro: '', sto: '' }, order: -1, ID };
	state.list.push(item);
	change();
};

const save = () => {
	pushTodoListUpdate();
};

const pushTodoListUpdate = async () => {
	const saveList = JSON.parse(JSON.stringify(state.list)).map((x) => {
		delete x.edited;
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
