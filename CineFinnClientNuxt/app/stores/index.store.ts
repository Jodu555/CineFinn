import useAPIURL from '~/hooks/useAPIURL';

export const useIndexStore = defineStore('index', {
    state: () => ({
        loading: false,
        series: [] as Series[],
        detailedSeasons: [] as DetailedSeason[],
        detailedMovies: [] as DetailedMovie[],
        selectedEntity: null as DetailedEpisode | DetailedMovie | null,
        selectedWatchableEntity: null as WatchableEntity | null,
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
        setSelectedWatchableEntityUUID(entityUUID: string | null) {
            console.log('setSelectedWatchableEntityUUID', entityUUID);

            const preferredLanguageList = ['GerDub', 'EngDub', 'GerSub', 'EngSub'];
            let entity: DetailedMovie | DetailedEpisode | null = null;
            if (entityUUID?.startsWith('M#')) {
                entity = this.detailedMovies.find((m) => m.UUID === entityUUID)!;
            }
            if (entityUUID?.startsWith('E#')) {
                entity = this.detailedSeasons.map(s => s.episodes).flat().find((e) => e.UUID === entityUUID)!;
            }

            this.selectedEntity = entity;

            console.log('selectedEntity', entity);

            if (!entity) {
                this.selectedWatchableEntity = null;
                return;
            }

            const preferredLanguage = preferredLanguageList.find(l => entity.watchableEntitys.find(we => we.lang === l));

            this.selectedWatchableEntity = entity.watchableEntitys.find(we => we.lang === preferredLanguage)!;
        },
        setSelectedWatchableEntity(entity: WatchableEntity | null) {
            this.selectedWatchableEntity = entity;
        },
    }
});