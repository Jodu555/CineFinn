import type { TodoItem } from '@cinefinn/types/database';
import { defineStore } from 'pinia'
import useAPIURL from '~/hooks/useAPIURL';

export interface permAcc {
    UUID: string;
    username: string;
    role: number;
}

export const useTodoStore = defineStore('todo', {
    state: () => ({
        loading: false,
        error: '',
        list: [
            // {
            //     ID: '1',
            //     order: 1,
            //     name: 'John',
            //     categorie: 'Aniworld',
            //     creator: '1',
            //     references: {
            //         aniworld: 'https://aniworld.to/anime/1',
            //         sto: 'https://sto.to/anime/1',
            //     },
            // },
            // {
            //     ID: '2',
            //     order: 2,
            //     name: 'Jane',
            //     categorie: 'Aniworld',
            //     creator: '1',
            //     references: {
            //         aniworld: 'https://aniworld.to/anime/2',
            //         sto: 'https://sto.to/anime/2',
            //     },
            // },
            // {
            //     ID: '3',
            //     order: 3,
            //     name: 'Bob',
            //     creator: '',
            //     categorie: 'Aniworld',
            //     references: {
            //         aniworld: 'https://aniworld.to/anime/3',
            //         sto: 'https://sto.to/anime/3',
            //     },
            // },
        ] as TodoItem[],
        permittedAccounts: [
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
            {
                UUID: '4f43fc81-6d19-4c51-8e8e-f56513c92e16',
                username: 'Jodu',
                role: 2,
            }
        ] as permAcc[],
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
        async addEmptyItem() {
            const authStore = useAuthStore();
            const ID = String(Math.round(Math.random() * 10 ** 6));
            const item = {
                name: '',
                creator: authStore.user.UUID,
                edited: false,
                categorie: 'Aniworld',
                references: { aniworld: '', zoro: '', sto: '' },
                order: -1,
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
                x.order = i + 1;
                return x;
            });
            await this.pushTodoListUpdate();
        },
        async saveTodo() {
            await this.pushTodoListUpdate();
        },
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
            }))
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

        },
        async deleteTodo(ID: string) {
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
})
