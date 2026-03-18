import type { Series, SeriesInfos, TodoItem } from '@cinefinn/types/database';
import { defineStore } from 'pinia';


export interface permAcc {
    UUID: string;
    username: string;
    role: number;
}

export const useTodoStore = defineStore('todo', {
    state: () => ({
        loading: false,
        error: '',
        list: [] as TodoItem[],
        permittedAccounts: [] as permAcc[],
        minimal: false,
        drag: false,
    }),
    actions: {
        async loadTodoList() {
            this.loading = true;
            const todos = await $fetch<TodoItem[]>(useAPIURL() + '/todo', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            });
            this.list = todos;
            this.loading = false;
        },
        async loadPermittedAccounts() {
            const { data, error } = await tryCatch(() => $fetch<permAcc[]>(useAPIURL() + '/todo/permittedAccounts', {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                console.log(error);
                return;
            }
            this.permittedAccounts = data || [];
        },
        async addEmptyItem() {
            const authStore = useAuthStore();
            const ID = String(Math.round(Math.random() * 10 ** 6));
            const item = {
                name: '',
                creator: authStore.user.UUID,
                edited: false,
                categorie: 'Aniworld',
                refs: { aniworld: '', zoro: '', sto: '', anix: '' },
                sortOrder: -1,
                ID,
            } as TodoItem;
            this.list.push(item);
            this.change();
        },
        onListChange(event: any) {
            this.change();
        },
        async change() {
            this.list = this.list.map((x, i) => {
                x.sortOrder = i + 1;
                return x;
            });
            await this.pushTodoListUpdate();
        },
        async saveTodo() {
            await this.pushTodoListUpdate();
        },
        //TODO: Re-Implement this
        async pushTodoListUpdate() {
            // console.log(auth.userInfo.role, 2, auth.userInfo.role >= 2);
            // if (!(auth.userInfo.role >= 2)) {
            // 	console.log('Fire');
            // 	instance.$swal({
            // 		icon: 'error',
            // 		title: 'Oops...',
            // 		text: 'Seems Like you do not have enough Permission to do that',
            // 	});
            // }
            const saveList = (JSON.parse(JSON.stringify(this.list)) as TodoItem[]).map((x) => {
                delete x.edited;
                return x;
            });
            const { data, error } = await tryCatch(() => $fetch(useAPIURL() + '/todo', {
                method: 'POST',
                body: JSON.stringify(saveList),
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                console.log(error);
                return;
            }
            console.log(data);

            // useSocket().emit('todoListUpdate', saveList);
        },
        async moveToDoToTop(ID: string) {
            const index = this.list.findIndex((x) => x.ID == ID);
            const item = this.list.splice(index, 1)[0];
            if (item == undefined)
                return;
            this.list.unshift(item);
            await this.change();
        },
        async moveToDoToBottom(ID: string) {
            const index = this.list.findIndex((x) => x.ID == ID);
            const item = this.list.splice(index, 1)[0];
            if (item == undefined)
                return;
            this.list.push(item);
            await this.change();
        },
        async useTodo(ID: string) {
            const { $swal } = useNuxtApp();
            const { isConfirmed: confirmed } = await $swal.fire({
                title: 'Super!',
                text: 'Do you really want to USE this Todo?',
                icon: 'success',
                showCancelButton: true,
                cancelButtonText: 'No im not sure anymore!',
                confirmButtonText: 'Yes im sure!',
            });
            if (confirmed) {
                const todoObject = this.list.find((x) => x.ID == ID);
                if (!todoObject) {
                    $swal.fire({
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
                    tags: [todoObject.categorie],
                    title: todoObject.name,
                    refs: todoObject.refs,
                    infos: {} as SeriesInfos,
                } satisfies Omit<Series, 'UUID'>;

                if (todoObject.scrapingInfo?.aniworld?.state === 'success' && todoObject.scrapingInfo?.aniworld?.data !== undefined) {
                    seriesObject.infos = JSON.parse(JSON.stringify(todoObject.scrapingInfo?.aniworld?.data?.informations)) satisfies SeriesInfos;
                    delete seriesObject?.infos?.image;
                }

                if (todoObject.scrapingInfo?.sto?.state === 'success' && todoObject.scrapingInfo?.sto?.data !== undefined) {
                    seriesObject.infos = JSON.parse(JSON.stringify(todoObject.scrapingInfo?.sto?.data?.informations)) satisfies SeriesInfos;
                    delete seriesObject?.infos?.image;
                }

                const { data, error } = await tryCatch(() => $fetch<Series>(useAPIURL() + '/index/', {
                    method: 'POST',
                    body: JSON.stringify(seriesObject),
                    headers: {
                        'auth-token': useAuthStore().authToken,
                    },
                }));

                if (error) {
                    $swal.fire({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000,
                        icon: 'error',
                        title: `${error.message || 'An Error occurd'}`,
                        timerProgressBar: true,
                    });
                    return;
                }

                if (data.UUID == undefined) return;

                const imageUrl = decideImageURL(todoObject);


                const { data: imageData, error: imageError } = await tryCatch(() => $fetch<string>(useAPIURL() + `/index/${data.UUID}/cover`, {
                    method: 'POST',
                    body: JSON.stringify({
                        imageUrl: imageUrl,
                    }),
                    headers: {
                        'auth-token': useAuthStore().authToken
                    }
                }));

                if (imageError) {
                    $swal.fire({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000,
                        icon: 'error',
                        title: `${imageError.message || 'An Error occurd'}`,
                        timerProgressBar: true,
                    });
                }

                // const newsObject = {
                // 	content: `Added ${seriesObject.title}`,
                // 	time: Date.now(),
                // } as DatabaseNewsItem;
                // await useAxios().post('/news/', newsObject);

            }
        },
        async deleteTodo(ID: string) {
            const { $swal } = useNuxtApp();
            const { isConfirmed: confirmed } = await $swal.fire({
                title: 'Error!',
                text: 'Do you really want to DELETE this Todo?',
                icon: 'warning',
                showCancelButton: true,
                cancelButtonText: 'No im not sure anymore!',
                confirmButtonText: 'Yes im sure!',
                scrollbarPadding: false,
                theme: 'bootstrap-5-dark'
            });
            if (confirmed) {
                this.list = this.list.filter((x) => x.ID != ID);
                this.change();
            }
        },
        async deleteOrRetryScrapeTodo(ID: string, key?: string) {
            this.list = this.list.map((x) => {
                if (x.ID == ID) {
                    if (key == undefined || key == 'all') {
                        delete x.scrapingInfo;
                    } else {
                        //@ts-expect-error
                        delete x.scrapingInfo?.[key as any];
                    }
                    return x;
                } else {
                    return x;
                }
            });
            await this.pushTodoListUpdate();
        },
        async rescrapeAllItems() {
            this.list = this.list.map((x) => {
                delete x.scrapingInfo;
                return x;
            });
            await this.pushTodoListUpdate();
        },
        async updateTodoList(list: TodoItem[]) {
            this.list = list;
        },
    }
});
