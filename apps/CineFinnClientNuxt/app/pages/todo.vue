<template>
    <div class="container">
        <VueDraggableNext v-model="list" @change="onListChange" class="list-group" tag="ul" :component-data="{
            tag: 'ul',
            name: !drag ? 'flip-list' : null,
        }" v-bind="dragOptions" @start="drag = true" @end="drag = false" item-key="ID">
            <template v-for="element in list">
                <TodoItem :element="element" :minimal="minimal" :list-length="list.length"
                    :permitted-accounts="permittedAccounts" :drag="drag" />
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

const drag = ref(false);

const minimal = ref(false);

const permittedAccounts = ref<permAcc[]>([
    {
        UUID: '1',
        username: 'John',
        role: 1,
    },
    {
        UUID: '2',
        username: 'Jane',
        role: 1,
    },
]);

// Reactive list
const list = ref<TodoItem[]>([
    {
        ID: '1',
        order: 1,
        name: 'John',
        categorie: 'Aniworld',
        creator: '1',
        references: {
            aniworld: 'https://aniworld.to/anime/1',
            zoro: 'https://zoro.to/anime/1',
            anix: 'https://anix.to/anime/1',
            sto: 'https://sto.to/anime/1',
            myasiantv: 'https://myasiantv.se/anime/1',
        },
    },
    {
        ID: '2',
        order: 2,
        name: 'Jane',
        categorie: 'Aniworld',
        creator: '1',
        references: {
            aniworld: 'https://aniworld.to/anime/2',
            zoro: 'https://zoro.to/anime/2',
            anix: 'https://anix.to/anime/2',
            sto: 'https://sto.to/anime/2',
            myasiantv: 'https://myasiantv.se/anime/2',
        },
    },
    {
        ID: '3',
        order: 3,
        name: 'Bob',
        creator: '',
        categorie: 'Aniworld',
        references: {
            aniworld: 'https://aniworld.to/anime/3',
            zoro: 'https://zoro.to/anime/3',
            anix: 'https://anix.to/anime/3',
            sto: 'https://sto.to/anime/3',
            myasiantv: 'https://myasiantv.se/anime/3',
        },
    },
])

const moveToDoToTop = (ID: string) => {
    // const index = state.list.findIndex((x) => x.ID == ID);
    // const item = state.list.splice(index, 1)[0];
    // state.list.unshift(item);
    // change();
};

const moveToDoToBottom = (ID: string) => {
    // const index = state.list.findIndex((x) => x.ID == ID);
    // const item = state.list.splice(index, 1)[0];
    // state.list.push(item);
    // change();
};

const addEmptyItem = () => {
    // const ID = String(Math.round(Math.random() * 10 ** 6));
    // const item = {
    // 	name: '',
    // 	creator: auth.userInfo.UUID,
    // 	edited: false,
    // 	categorie: 'Aniworld',
    // 	references: { aniworld: '', zoro: '', sto: '' },
    // 	order: -1,
    // 	ID,
    // } as TodoItem;
    // state.list.push(item);
    // change();
};

const deleteTodo = async (ID: string) => {
    // const { isConfirmed: confirmed } = await instance.$swal({
    // 	title: 'Error!',
    // 	text: 'Do you really want to DELETE this Todo?',
    // 	icon: 'warning',
    // 	showCancelButton: true,
    // 	cancelButtonText: 'No im not sure anymore!',
    // 	confirmButtonText: 'Yes im sure!',
    // });
    // if (confirmed) {
    // 	state.list = state.list.filter((x) => x.ID != ID);
    // 	change();
    // }
};

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

const save = () => {
    pushTodoListUpdate();
};

function deleteScrapeInfos(item: TodoItem) {
    delete item?.scrapingError;
    for (const scraper of scrapers) {
        delete item?.[scraper.scrapeKey];
    }
    return item;
}

const deleteOrRetryScrapeTodo = (ID: string) => {
    // state.list = state.list.map((x) => {
    // 	if (x.ID == ID) {
    // 		x = deleteScrapeInfos(x);
    // 		return x;
    // 	} else {
    // 		return x;
    // 	}
    // });
    // pushTodoListUpdate();
};

const rescrapeAllItems = () => {
    // state.list = state.list.map((x) => {
    // 	x = deleteScrapeInfos(x);
    // 	return x;
    // });
    // pushTodoListUpdate();
};

const pushTodoListUpdate = async () => {
    // console.log(auth.userInfo.role, 2, auth.userInfo.role >= 2);
    // if (!(auth.userInfo.role >= 2)) {
    // 	console.log('Fire');
    // 	instance.$swal({
    // 		icon: 'error',
    // 		title: 'Oops...',
    // 		text: 'Seems Like you do not have enough Permission to do that',
    // 	});
    // }
    // const saveList = (JSON.parse(JSON.stringify(state.list)) as TodoItem[]).map((x) => {
    // 	delete x.edited;
    // 	return x;
    // });
    // useSocket().emit('todoListUpdate', saveList);
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

// Handle changes
const onListChange = (event: any) => {
    list.value = list.value.map((x, i) => {
        x.order = i + 1;
        return x;
    });
}
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