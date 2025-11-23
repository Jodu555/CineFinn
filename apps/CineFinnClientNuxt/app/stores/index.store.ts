import type { DetailedSeason, DetailedEpisode, WatchableEntity, DetailedSeries, DetailedMovie, FrontendSeries, WatchHistory } from '@cinefinn/types/database';
import useAPIURL from '~/hooks/useAPIURL';

export const useIndexStore = defineStore('index', {
    state: () => ({
        loading: false,
        series: [] as FrontendSeries[],
        detailedSeasons: [] as DetailedSeason[],
        detailedMovies: [] as DetailedMovie[],
        selectedEntity: null as DetailedEpisode | DetailedMovie | null,
        selectedWatchableEntity: null as WatchableEntity | null,
        detailedPrefetchedSeriesObj: {} as { [key: string]: DetailedSeries },
        watchHistory: [] as WatchHistory[],
    }),
    actions: {
        async loadSeries() {
            this.loading = true;
            // const response = await useAxios().get('/index');
            // const response = await $fetch<Series[]>(CURRENT_EXTERNAL_API + '/index');
            const response = await $fetch<FrontendSeries[]>(useAPIURL() + '/index');
            this.series = response;
            this.loading = false;
        },
        async loadDetailedSeasonInfo(seriesID: string) {
            this.loading = true;
            // console.log(`loadDetailedSeasonInfo for seriesID: ${seriesID}`);
            if (this.detailedPrefetchedSeriesObj[seriesID]) {
                const prefetched = this.detailedPrefetchedSeriesObj[seriesID];
                this.detailedSeasons = prefetched.seasons;
                this.detailedMovies = prefetched.movies;

                this.detailedPrefetchedSeriesObj = {};
                this.loading = false;
                // console.log(`loadDetailedSeasonInfo for seriesID: ${seriesID} from cache`);
                return;
            }
            const response = await $fetch<DetailedSeries>(useAPIURL() + '/index/' + seriesID);
            this.detailedSeasons = response.seasons;
            this.detailedMovies = response.movies;
            this.loading = false;
            // console.log(`loadDetailedSeasonInfo for seriesID: ${seriesID} from network`);

        },
        async prefetchSeries(seriesID: string) {
            if (this.detailedPrefetchedSeriesObj[seriesID]) {
                return;
            }
            const response = await $fetch<DetailedSeries>(useAPIURL() + '/index/' + seriesID);
            const img = new Image();
            const url = new URL('https://cinema-api.jodu555.de' + `/images/${seriesID}/cover.jpg`);
            url.searchParams.append('auth-token', 'SECR-DEV');
            img.src = url.href;
            this.detailedPrefetchedSeriesObj[seriesID] = response;
        },
        async loadWatchHistory(seriesID: string) {
            const response = await $fetch<WatchHistory[]>(`${useAPIURL()}/watch/info/${seriesID}`, {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            });
            this.watchHistory = response;
        },
        async updateWatchList(watchList: WatchHistory[]) {
            this.watchHistory = watchList;
        },
        setSelectedWatchableEntityUUID(entityUUID: string | null) {
            // console.log('setSelectedWatchableEntityUUID', entityUUID);

            const preferredLanguageList = ['GerDub', 'EngDub', 'GerSub', 'EngSub'];
            let entity: DetailedMovie | DetailedEpisode | null = null;
            if (entityUUID?.startsWith('MO-')) {
                entity = this.detailedMovies.find((m) => m.UUID === entityUUID)!;
            }
            if (entityUUID?.startsWith('EP-')) {
                // console.log('Is Episode', this.detailedSeasons);

                entity = this.detailedSeasons.map(s => s.episodes).flat().find((e) => e.UUID === entityUUID)!;
            }

            this.selectedEntity = entity;

            // console.log('selectedEntity', entity);

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