<template>
    <div>
        <div v-if="showFranchises" class="container mt-3 shadow-lg p-2 mb-3 mt-1 rounded">
            <Carousel v-bind="franchiseCarouselConfig">
                <Slide v-for="franchise in franchises" :key="franchise.id">
                    <div class="carusel__item entity-hover" style="height: 100%; width: 100%;">
                        <div :key="franchise.id">
                            <img :src="franchise.backgroundImage" class="d-block w-100"
                                style="height: 45vh; object-fit: cover;" :alt="franchise.slug"></img>
                            <div
                                style="position: absolute; inset: 0; background-image: linear-gradient(45deg, #000000c7, transparent);">
                            </div>
                            <div
                                style="position: absolute; inset: 0; background-image: linear-gradient(273deg, #000000c7, transparent);">
                            </div>
                            <div style="
                        position: absolute;
                        bottom: 1.25rem;
                        left: 10%;
                        padding-top: 1.25rem;
                        padding-bottom: 1.25rem;
                    ">

                                <img :src="franchise.logo" :alt="franchise.slug"
                                    style="height: 5rem; width: 5rem; object-fit: contain;"></img>
                                <!-- <h3>{{ franchise.name }}</h3> -->
                                <p class="text-secondary mt-2 mb-1">{{ franchise.description }}</p>
                                <p class="text-info mb-2">{{ franchise.contentCount }}</p>
                                <button class="btn btn-outline-info">More Info</button>
                            </div>
                            <!-- <div class="carousel-caption d-none d-md-block color-light">
                    </div> -->
                        </div>
                    </div>
                </Slide>

                <template #addons>
                    <Navigation>
                        <template #prev>
                            <font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="xl"
                                style="color:white; margin-left: 1.5rem" />
                        </template>
                        <template #next>
                            <font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="xl"
                                style="color:white; margin-right: 1.5rem;" />
                        </template>
                    </Navigation>
                    <!-- <Pagination /> -->
                </template>
            </Carousel>
        </div>
        <div class="container-fluid">
            <div class="shadow-lg p-1 mb-3 mt-1 rounded">
                <h4 class="ms-3 mb-3">Neu hinzugefügt</h4>
                <Carousel v-bind="carouselConfig">
                    <Slide v-for="series in [...indexStore.series]" :key="series.UUID">
                        <div class="carusel__item entity-hover" style="height: 100%; width: 100%;">
                            <EntityCard :server-rendered="true" :seriesID="series.UUID" :show-body="false"
                                :show-footer="false" :be-clickable="true" class="entity-card" />
                        </div>
                    </Slide>

                    <template #addons>
                        <Navigation>
                            <template #prev>
                                <font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl"
                                    style="color:white; margin-left: 1.5rem" />
                            </template>
                            <template #next>
                                <font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl"
                                    style="color:white; margin-right: 1.5rem;" beat />
                            </template>
                        </Navigation>
                        <!-- <Pagination /> -->
                    </template>
                </Carousel>
            </div>
            <div class="shadow-lg p-1 mb-3 mt-1 rounded">
                <h4 class="ms-3 mb-3">Weiterschauen</h4>
                <Carousel v-bind="carouselConfig">
                    <Slide v-for="series in [...indexStore.series]" :key="series.UUID">
                        <div class="carusel__item entity-hover" style="height: 100%; width: 100%;">
                            <EntityCard :server-rendered="true" :seriesID="series.UUID" :show-body="false"
                                :show-footer="false" :be-clickable="true" class="entity-card" />
                        </div>
                    </Slide>

                    <template #addons>
                        <Navigation>
                            <template #prev>
                                <font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-left" size="2xl"
                                    style="color:white; margin-left: 1.5rem" />
                            </template>
                            <template #next>
                                <font-awesome-icon v-show="ready" icon="fa-solid fa-chevron-right" size="2xl"
                                    style="color:white; margin-right: 1.5rem;" beat />
                            </template>
                        </Navigation>
                        <!-- <Pagination /> -->
                    </template>
                </Carousel>
            </div>
        </div>
    </div>
</template>

<script setup>

definePageMeta({
    middleware: 'auth',
});

const showFranchises = ref(true);

const franchises = ref([
    {
        id: 1,
        name: "Star Wars",
        slug: "star-wars", // Added slug for routing
        description: "A galaxy far, far away...",
        backgroundImage: "https://cinema.jodu555.de/test/star-wars-space-battle-scene-with-starships.jpg",
        logo: "https://cinema.jodu555.de/test/star-wars-logo.jpg",
        contentCount: "12 Movies & Series",
    },
    {
        id: 2,
        name: "Barbie",
        slug: "barbie", // Added slug for routing
        description: "Life in plastic, it's fantastic!",
        // https://cinema.jodu555.de/test/barbie-pink-dreamhouse-fantasy-world.jpg
        backgroundImage: "https://cinema.jodu555.de/test/barbie-pink-dreamhouse-fantasy-world.jpg",
        logo: "https://cinema.jodu555.de/test/barbie-logo-pink.jpg",
        contentCount: "8 Movies & Specials",
    },
    {
        id: 3,
        name: "Marvel Cinematic Universe",
        slug: "mcu", // Added slug for routing
        description: "Earth's Mightiest Heroes",
        backgroundImage: "https://cinema.jodu555.de/test/marvel-superheroes-action-scene.jpg",
        logo: "https://cinema.jodu555.de/test/marvel-studios-logo.jpg",
        contentCount: "30+ Movies & Series",
    },
]);

const indexStore = useIndexStore();
// If you are using PurgeCSS, make sure to whitelist the carousel CSS classes
import 'vue3-carousel/carousel.css'
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel'
import EntityCard from '~/components/EntityCard.vue';

const ready = ref(false);

onMounted(() => {
    ready.value = true;
});

const franchiseCarouselConfig = {
    itemsToShow: 1,
    snapAlign: 'center',
    pauseAutoplayOnHover: true,
    autoplay: 1000 * 2,
    // autoplay: 0,
    transition: 600,
    wrapAround: true,
    gap: 15,
}

const carouselConfig = {
    itemsToShow: 1,
    snapAlign: 'center',
    pauseAutoplayOnHover: true,
    autoplay: 1000 * 1,
    transition: 400,
    wrapAround: true,
    gap: 15,
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

<style lang="scss">
.entity-hover {
    transition: transform .2s ease-in-out;
    cursor: pointer;

    &:hover {
        transform: scale(1.05);
        transition: all .1s ease-in-out;
        box-shadow: 0px 0px 20px 20px rgb(0 0 0 / 81%);
    }
}
</style>