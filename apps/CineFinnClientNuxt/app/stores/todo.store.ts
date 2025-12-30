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
    list: [] as TodoItem[],
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
  }),
  actions: {
    async loadTodoList() { },
    async addEmptyItem() { },
    async save() { },
    async pushTodoListUpdate() { },
    async moveToDoToTop(ID: string) { },
    async moveToDoToBottom(ID: string) { },
    async useTodo(ID: string) { },
    async deleteTodo(ID: string) { },
    async deleteScrapeInfos(ID: string) { },
    async deleteOrRetryScrapeTodo(ID: string) { },
    async rescrapeAllItems() { },
    async updateTodoList(list: TodoItem[]) {
      this.list = list;
    },
  }
})
