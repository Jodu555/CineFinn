import type { timestamped, WatchableEntity } from '@cinefinn/types';
import { defineStore } from 'pinia'


export type AdditionalCarouselMeta = {
    showNewRibbon?: boolean;
    showWatchableCount?: boolean;
    wrapAround?: boolean;
    autoplay?: number;
};

export type CarouselMeta = {
    order: number;
    id: string;
    title: string;
    icon: string[];
    description: string;
    userspecific: boolean;
    returnItemsCount: number;
    additionalMeta?: AdditionalCarouselMeta;
};

export type CarouselAddEntity = {
    type: 'entity';
    items: {
        watchTime: number;
        entity: WatchableEntity & timestamped & { additional: AdditionalEntityData };
    }[];
};

export type AdditionalEntityData = {
    imageFile: string;
    season: number;
    episode: number;
};

export type CarouselAddSeries = {
    type: 'series';
    items: {
        UUID: string;
        episodeCount: number;
    }[];
};

export type CarouselResponseItem = CarouselMeta & (CarouselAddEntity | CarouselAddSeries);

type FetchState = 'pending' | 'success' | 'error';

export const useHomeStore = defineStore('home', {
    state: () => ({
        recommendationsFetchState: 'pending' as FetchState,
        recommendations: [] as CarouselResponseItem[],
    }),
    actions: {
        async loadRecommendations() {
            this.recommendationsFetchState = 'pending';
            const { data, error } = await tryCatch<Promise<CarouselResponseItem[]>, Error>(() => $fetch<CarouselResponseItem[]>(`${useAPIURL()}/recommendations`, {
                method: 'GET',
                headers: {
                    'auth-token': useAuthStore().authToken,
                    'socketID': socketUniqueID.value,
                },
            }));
            if (error) {
                this.recommendationsFetchState = 'error';
                console.log('Failed to fetch recommendations:', error);
                this.recommendations = [];
                return;
            }
            this.recommendationsFetchState = 'success';
            this.recommendations = data;
        },
        async addRecommendations(items: CarouselResponseItem[]) {
            this.recommendations = [...this.recommendations, ...items].sort((a, b) => a.order - b.order);
        }
    }
})
