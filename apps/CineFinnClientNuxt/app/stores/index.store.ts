import type { DetailedSeason, DetailedEpisode, WatchableEntity, DetailedSeries, DetailedMovie, FrontendSeries, WatchHistory } from '@cinefinn/types/database';
import useAPIURL from '~/hooks/useAPIURL';

export const useIndexStore = defineStore('index', {
    state: () => ({
        loading: false,
        series: [] as FrontendSeries[],
        detailedSerie: null as DetailedSeries | null,
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
            const { data, error } = await tryCatch<Promise<FrontendSeries[]>, Error>(() => $fetch<FrontendSeries[]>(`${useAPIURL()}/index`, {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                this.loading = false;
            } else {
                this.series = data!;
                this.loading = false;
            }
            // const { data, status } = await useFetch<FrontendSeries[]>(`${useAPIURL()}/index`, {
            //     key: 'index',
            //     method: 'GET',
            //     headers: {
            //         'auth-token': useAuthStore().authToken,
            //     },
            // });
            // if (status.value == 'success') {
            //     this.series = data.value!;
            //     this.loading = false;
            // } else {
            //     // alert('Error loading Series ' + status.value);

            // }
        },
        async loadDetailedSeasonInfo(seriesID: string) {
            this.loading = true;
            // console.log(`loadDetailedSeasonInfo for seriesID: ${seriesID}`);
            if (this.detailedPrefetchedSeriesObj[seriesID]) {
                const prefetched = this.detailedPrefetchedSeriesObj[seriesID];
                this.detailedSeasons = prefetched.seasons;
                this.detailedMovies = prefetched.movies;
                this.detailedSerie = prefetched;

                this.detailedPrefetchedSeriesObj = {};
                this.loading = false;
                // console.log(`loadDetailedSeasonInfo for seriesID: ${seriesID} from cache`);
                return;
            }
            const { data, status } = await useFetch<DetailedSeries>(`${useAPIURL()}/index/${seriesID}`, {
                key: 'index/' + seriesID,
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            });

            if (status.value == 'success') {
                this.detailedSeasons = data.value!.seasons;
                this.detailedMovies = data.value!.movies;
                this.detailedSerie = data.value!;
                this.loading = false;
            } else {
                // alert('Error loading Detailed Series ' + status.value);
                this.loading = false;
            }
            // console.log(`loadDetailedSeasonInfo for seriesID: ${seriesID} from network`);

        },
        async prefetchSeries(seriesID: string) {
            if (this.detailedPrefetchedSeriesObj[seriesID]) {
                return;
            }
            const response = await $fetch<DetailedSeries>(useAPIURL() + '/index/' + seriesID, {
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            });
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
        setSelectedWatchableEntityUUID(entityUUID: string | null, language?: string) {
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

            let preferredLanguage = preferredLanguageList.find(l => entity.watchableEntitys.find(we => we.lang === l));
            if (language) {
                if (entity.watchableEntitys.find(we => we.lang === language)) {
                    preferredLanguage = language;
                }
            }

            this.selectedWatchableEntity = entity.watchableEntitys.find(we => we.lang === preferredLanguage)!;
        },
        setSelectedWatchableEntity(entity: WatchableEntity | null) {
            this.selectedWatchableEntity = entity;
        },
        async reloadSeries(series: FrontendSeries[]) {
            this.series = series;
            this.detailedPrefetchedSeriesObj = {};
            if (this.detailedSerie != null) {
                await this.loadDetailedSeasonInfo(this.detailedSerie.UUID);
            }
        },
        async markSeasonWatched(seasonUUID: string, watched: boolean) {
            const { $swal } = useNuxtApp();
            const { data, error } = await tryCatch<Promise<DetailedSeason[]>, Error>(() => $fetch<DetailedSeason[]>(`${useAPIURL()}/watch/markSeason/${seasonUUID}/${watched}`, {
                method: 'POST',
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                console.log(error);

                $swal.fire({
                    title: 'Error',
                    text: 'An error occurred while marking the season as ' + (watched ? 'watched' : 'unwatched'),
                    icon: 'error',
                    confirmButtonText: 'Ok',
                });
                return;
            }
            // $swal.fire({
            //     title: 'Success',
            //     text: 'Season marked as ' + (watched ? 'watched' : 'unwatched'),
            //     icon: 'success',
            //     confirmButtonText: 'Ok',
            // });

        },
        async updateSeries(seriesID: string, series: any) {
            const { $swal } = useNuxtApp();
            const { data, error } = await tryCatch<Promise<void>, Error>(() => $fetch<void>(`${useAPIURL()}/index/${seriesID}`, {
                method: 'PATCH',
                body: JSON.stringify(series),
                headers: {
                    'auth-token': useAuthStore().authToken,
                },
            }));
            if (error) {
                console.log(error);

                $swal.fire({
                    toast: true,
                    position: 'top-end',
                    title: 'Error',
                    text: 'An error occurred while updating the series',
                    icon: 'error',
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                });
                return;
            }
            $swal.fire({
                toast: true,
                position: 'top-end',
                title: 'Success',
                text: 'Series updated',
                icon: 'success',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false,
            });
        },
    }
});