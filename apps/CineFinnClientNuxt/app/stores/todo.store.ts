import { defineStore } from 'pinia'

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
        ] as permAcc[],
        minimal: false,
        drag: false,
    }),
    actions: {
        async loadTodoList() { },
        async addEmptyItem() {
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
        },
        onListChange(event: any) {
            this.change();
        },
        change() {
            this.list = this.list.map((x, i) => {
                x.order = i + 1;
                return x;
            });
        },
        async save() {
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
            // const saveList = (JSON.parse(JSON.stringify(state.list)) as TodoItem[]).map((x) => {
            // 	delete x.edited;
            // 	return x;
            // });
            // useSocket().emit('todoListUpdate', saveList);
        },
        async moveToDoToTop(ID: string) {
            // const index = state.list.findIndex((x) => x.ID == ID);
            // const item = state.list.splice(index, 1)[0];
            // state.list.unshift(item);
            // change();
        },
        async moveToDoToBottom(ID: string) {
            // const index = state.list.findIndex((x) => x.ID == ID);
            // const item = state.list.splice(index, 1)[0];
            // state.list.push(item);
            // change();
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
        async deleteScrapeInfos(ID: string) {
            // delete item?.scrapingError;
            // for (const scraper of scrapers) {
            //     delete item?.[scraper.scrapeKey];
            // }
            // return item;
        },
        async deleteOrRetryScrapeTodo(ID: string) {
            // state.list = state.list.map((x) => {
            // 	if (x.ID == ID) {
            // 		x = deleteScrapeInfos(x);
            // 		return x;
            // 	} else {
            // 		return x;
            // 	}
            // });
            // pushTodoListUpdate();
        },
        async rescrapeAllItems() {
            // state.list = state.list.map((x) => {
            // 	x = deleteScrapeInfos(x);
            // 	return x;
            // });
            // pushTodoListUpdate();
        },
        async updateTodoList(list: TodoItem[]) {
            this.list = list;
        },
    }
})
