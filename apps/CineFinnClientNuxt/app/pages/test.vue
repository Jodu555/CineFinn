<template>
    <div>
        <div v-if="showFranchises" class="container">
            <div id="carouselExampleCaptions" class="carousel slide">
                <div class="carousel-indicators">

                    <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="0" class="active"
                        aria-current="true" aria-label="Slide 1"></button>
                    <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="1"
                        aria-label="Slide 2"></button>
                    <button type="button" data-bs-target="#carouselExampleCaptions" data-bs-slide-to="2"
                        aria-label="Slide 3"></button>
                </div>
                <div class="carousel-inner">
                    <div v-for="franchise in franchises" class="carousel-item" :class="{ active: franchise.id == 1 }"
                        :key="franchise.id">
                        <img :src="franchise.backgroundImage" class="d-block w-100"
                            style="height: 40vh; object-fit: cover;" :alt="franchise.slug"></img>
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
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleCaptions"
                    data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" style="color:white" aria-hidden="true"></span>
                    <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleCaptions"
                    data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Next</span>
                </button>
            </div>
        </div>
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