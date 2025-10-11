import useAPIURL from '~/hooks/useAPIURL';

export const useIndexStore = defineStore('index', {
    state: () => ({
        loading: false,
        series: [] as Series[],
        detailedSeasons: null as Series | null,
    }),
    actions: {
        async loadSeries() {
            this.loading = true;
            // const response = await useAxios().get('/index');
            // const response = await $fetch<Series[]>(CURRENT_EXTERNAL_API + '/index');
            const response = await $fetch<Series[]>(useAPIURL() + '/index');
            this.series = response;
            this.loading = false;
        },
        async loadSeriesInfo(serieID: string) {
            this.loading = true;
            const response = await $fetch<Series>(useAPIURL() + '/index/' + serieID);
            console.log('Loading series Info for ', serieID, 'response:', response);

            this.series = this.series.map((s) => s.UUID === serieID ? response : s);
            this.loading = false;
        },
    }
});