<template>
    <div class="container">
        <br />

        <div class="d-flex justify-content-between">
            <button v-if="authStore.user.role >= 2" class="btn btn-outline-primary mb-5"
                @click="todoStore.addEmptyItem()">Add
                Item</button>

            <button class="btn btn-outline-warning mb-5" @click="todoStore.minimal = !todoStore.minimal">Minimal
                View</button>

            <button v-if="authStore.user.role >= 2" class="btn btn-outline-danger mb-5"
                @click="todoStore.rescrapeAllItems()">Rescrape All Items</button>
        </div>

        <div v-if="todoStore.loading" class="d-flex justify-content-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <!-- <pre>
            {{ todoStore.list }}
        </pre> -->

        <VueDraggableNext v-model="todoStore.list" @change="todoStore.onListChange" class="list-group" tag="ul"
            :component-data="{
                tag: 'ul',
                name: !todoStore.drag ? 'flip-list' : null,
            }" v-bind="dragOptions" @start="todoStore.drag = true" @end="todoStore.drag = false" item-key="ID">
            <template v-for="element in todoStore.list">
                <TodoItem :element="element" :minimal="todoStore.minimal" :list-length="todoStore.list.length"
                    :permitted-accounts="permittedAccounts" :drag="todoStore.drag" />
            </template>
        </VueDraggableNext>

    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueDraggableNext } from 'vue-draggable-next'

definePageMeta({
    middleware: ['auth'],
});

const authStore = useAuthStore();
const todoStore = useTodoStore();

await callOnce('loadTodoList', () => todoStore.loadTodoList(), { mode: 'navigation' });

const permittedAccounts = computed(() => todoStore.permittedAccounts);


const useTodo = async (ID: string) => {
    // const { isConfirmed: confirmed } = await instance.$swal({
    // 	title: 'Super!',
    // 	text: 'Do you really want to USE this Todo?',
    // 	icon: 'success',
    // 	showCancelButton: true,
    // 	cancelButtonText: 'No im not sure anymore!',
    // 	confirmButtonText: 'Yes im sure!',
    // });
    // if (confirmed) {
    // 	const todoObject = state.list.find((x) => x.ID == ID);
    // 	if (!todoObject) {
    // 		instance.$swal({
    // 			toast: true,
    // 			position: 'top-end',
    // 			showConfirmButton: false,
    // 			timer: 3000,
    // 			icon: 'error',
    // 			title: `Todo Item with ID ${ID} not found`,
    // 			timerProgressBar: true,
    // 		});
    // 		return;
    // 	}
    // 	const seriesObject = {
    // 		categorie: todoObject.categorie,
    // 		title: todoObject.name,
    // 		movies: [] as SerieMovie[],
    // 		seasons: [] as SerieEpisode[][],
    // 		references: todoObject.references,
    // 		infos: {} as SerieInfo,
    // 	};

    // 	if (todoObject.scraped !== true && todoObject.scraped != undefined) {
    // 		seriesObject.infos = JSON.parse(JSON.stringify(todoObject.scraped?.informations)) satisfies SerieInfo;
    // 		delete seriesObject?.infos?.image;
    // 	}
    // 	const response = await useAxios().post('/index/', seriesObject);

    // 	if (response.status !== 200) {
    // 		instance.$swal({
    // 			toast: true,
    // 			position: 'top-end',
    // 			showConfirmButton: false,
    // 			timer: 3000,
    // 			icon: 'error',
    // 			title: `${response.data.error.message || 'An Error occurd'}`,
    // 			timerProgressBar: true,
    // 		});
    // 	} else {
    // 		if (response.data.ID !== undefined) {
    // 			const serieID = response.data.ID;

    // 			const imageUrl = decideImageURL(false, todoObject);

    // 			const imageResponse = await useAxios().post(`/index/${serieID}/cover`, { imageUrl });

    // 			if (imageResponse.status !== 200) {
    // 				instance.$swal({
    // 					toast: true,
    // 					position: 'top-end',
    // 					showConfirmButton: false,
    // 					timer: 3000,
    // 					icon: 'error',
    // 					title: `${imageResponse.data.error.message || 'An Error occurd'}`,
    // 					timerProgressBar: true,
    // 				});
    // 			}
    // 		}

    // 		const newsObject = {
    // 			content: `Added ${seriesObject.title}`,
    // 			time: Date.now(),
    // 		} as DatabaseNewsItem;
    // 		await useAxios().post('/news/', newsObject);
    // 	}
    // }
};

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

const windowWidth = ref(600);

const dragOptions = computed(() => {
    return {
        animation: 200,
        group: 'description',
        disabled: windowWidth.value < 580,
        ghostClass: 'ghost',
    };
});
</script>

<style scoped>
/* .drag-container {
    min-height: 200px;
    padding: 20px;
}

.drag-item {
    padding: 10px;
    margin: 5px 0;
    background: #f0f0f0;
    border-radius: 4px;
    cursor: move;
    transition: background 0.2s;
}

.drag-item:hover {
    background: #e0e0e0;
} */
</style>