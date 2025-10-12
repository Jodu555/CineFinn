import useAPIURL from '~/hooks/useAPIURL';

export const useIndexStore = defineStore('index', {
    state: () => ({
        loading: false,
        series: [] as Series[],
        detailedSeasons: [] as DetailedSeason[],
        detailedMovies: [] as DetailedMovie[],
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
        async loadDetailedSeasonInfo(seriesID: string) {
            this.loading = true;
            const response = await $fetch<DetailedSeries>(useAPIURL() + '/index/' + seriesID);
            this.detailedSeasons = response.seasons;
            this.detailedMovies = response.movies;
            this.loading = false;
        },
    }
});