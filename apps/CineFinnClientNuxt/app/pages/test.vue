<template>
    <Carousel v-bind="carouselConfig">
        <Slide v-for="series in [...indexStore.series, ...indexStore.series, ...indexStore.series]" :key="series.UUID">
            <div class="carusel__item" style="height: 100%; width: 100%">
                <EntityCard :seriesID="series.UUID" />
                <!-- <div class="row">
                    <div class="col">
                    </div>
                </div> -->
            </div>
        </Slide>

        <template #addons>
            <Navigation>
                <template #prev>
                    <font-awesome-icon icon="fa-solid fa-chevron-left" size="2xl"
                        style="color:white; margin-left: 2.5rem" />
                </template>
                <template #next>
                    <font-awesome-icon icon="fa-solid fa-chevron-right" size="2xl"
                        style="color:white; margin-right: 2.5rem;" beat />
                </template>
            </Navigation>
            <!-- <Pagination /> -->
        </template>
    </Carousel>
</template>

<script setup>

definePageMeta({
    middleware: 'auth',
});

const indexStore = useIndexStore();
// If you are using PurgeCSS, make sure to whitelist the carousel CSS classes
import 'vue3-carousel/carousel.css'
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'
import EntityCard from '~/components/EntityCard.vue';

const carouselConfig = {
    itemsToShow: 4,
    snapAlign: 'center',
    pauseAutoplayOnHover: true,
    autoplay: 1000 * 1,
    transition: 400,
    gap: 10,
    breakpoints: {
        //This Works by taking the default from settings and then for example 450 works until somehting other is specified so 450 up to in this case 600
        450: {
            itemsToShow: 1.4,
            snapAlign: 'center',
        },
        600: {
            itemsToShow: 1.8,
            snapAlign: 'center',
        },
        900: {
            itemsToShow: 3,
            snapAlign: 'center',
        },
        1224: {
            itemsToShow: 4.4,
            snapAlign: 'start',
        },
        1600: {
            itemsToShow: 5.5,
            snapAlign: 'start',
        },
        1800: {
            itemsToShow: 6.5,
            snapAlign: 'start',
        },
        2000: {
            itemsToShow: 6.5,
            snapAlign: 'start',
        },
        2500: {
            itemsToShow: 8.5,
            snapAlign: 'start',
        },
        3150: {
            itemsToShow: 9.5,
            snapAlign: 'start',
        },
        3550: {
            itemsToShow: 10.5,
            snapAlign: 'start',
        },
    }
}
</script>
