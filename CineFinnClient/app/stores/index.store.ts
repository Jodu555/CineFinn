
const CURRENT_EXTERNAL_API = 'http://localhost:3000';
export const useIndexStore = defineStore('index', {
    state: () => ({
        loading: false,
        series: [] as Series[],
        selectedCategory: 'Alle',
    }),
    actions: {
        async loadSeries() {
            this.loading = true;
            // const response = await useAxios().get('/index');
            // const response = await $fetch<Series[]>(CURRENT_EXTERNAL_API + '/index');
            const response = await $fetch<Series[]>(CURRENT_EXTERNAL_API + '/index');
            this.series = response;
            this.loading = false;
        },
        // async loadSeriesByCategory(category: string) {
        //     this.loading = true;
        //     const response = await useAxios().get('/index', { params: { category } });
        //     this.series = response.data;
        //     this.categories = Array.from(new Set(this.series.map((i) => i.categorie))).sort();
        //     this.loading = false;
        // },
        // async loadSeriesByID(ID: string) {
        //     this.loading = true;
        //     const response = await useAxios().get('/index/' + ID);
        //     this.series = response.data;
        //     this.categories = Array.from(new Set(this.series.map((i) => i.categorie))).sort();
        //     this.loading = false;
        // },
        // async loadSeriesByIDs(IDs: string[]) {
        //     this.loading = true;
        //     const response = await useAxios().get('/index', { params: { IDs: IDs.join(',') } });
        //     this.series = response.data;
        //     this.categories = Array.from(new Set(this.series.map((i) => i.categorie))).sort();
        //     this.loading = false;
        // },
    }
});