<template>
    <div class="container">
        <div v-auto-animate style="z-index: 100">
            <a v-auto-animate v-if="backToTop" @click="scrollToTop()" id="backToTop"
                class="btn btn-outline-primary btn-lg back-to-top" role="button"><font-awesome-icon
                    icon="fa-solid fa-up-long" size="xl" /></a>
        </div>
        <div v-if="indexStore.loading" class="d-flex justify-content-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <div v-if="showFranchises" id="carouselExampleCaptions" class="carousel slide">
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
                    <img :src="franchise.backgroundImage" class="d-block w-100" style="height: 30vh; object-fit: cover;"
                        :alt="franchise.slug"></img>
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
                        <p class="text-muted mt-2 mb-1">{{ franchise.description }}</p>
                        <p class="text-info mb-2">{{ franchise.contentCount }}</p>
                        <button class="btn btn-outline-info">More Info</button>
                    </div>
                    <!-- <div class="carousel-caption d-none d-md-block color-light">
                    </div> -->
                </div>
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleCaptions"
                data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleCaptions"
                data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
            </button>
        </div>

        <div class="d-none d-md-block">
            <div class="mt-4 d-flex justify-content-center align-items-center">
                <h3>Showing {{ selectedSeries.length }} / {{ indexStore.series.length }} Serie(s)</h3>
            </div>
        </div>
        <div class="mb-4 d-flex justify-content-between">
            <div class="d-flex gap-4">
                <span v-for="cat in categories" @click="selectedCategory = cat" :key="cat"
                    :class="selectedCategory == cat ? 'btn btn-outline-primary' : 'btn btn-outline-secondary'">
                    {{ cat }}
                </span>
            </div>
            <div>
                <button class="btn btn-outline-info z-100" @click="() => sort = !sort">Sort {{ buttonInfo }}</button>
            </div>
        </div>

        <div v-if="showScrollToLastSeries != undefined" class="d-flex justify-content-center">
            <button @click="work" class="btn btn-outline-primary mb-3" href="#" role="button">Scroll to last
                Series</button>
        </div>

        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
            <EntityCard v-for="entity in selectedSeries"
                :highlighted="scrolledToLastSeries && entity.ID == showScrollToLastSeries" class="border-success"
                :entity="entity" :key="entity.ID" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import EntityCard from '@/components/Home/EntityCard.vue';
import { useIndexStore } from '@/stores/index.store';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const showFranchises = ref(false);

const franchises = ref([
    {
        id: 1,
        name: "Star Wars",
        slug: "star-wars", // Added slug for routing
        description: "A galaxy far, far away...",
        backgroundImage: "/test/star-wars-space-battle-scene-with-starships.jpg",
        logo: "/test/star-wars-logo.jpg",
        contentCount: "12 Movies & Series",
    },
    {
        id: 2,
        name: "Barbie",
        slug: "barbie", // Added slug for routing
        description: "Life in plastic, it's fantastic!",
        backgroundImage: "/test/barbie-pink-dreamhouse-fantasy-world.jpg",
        logo: "/test/barbie-logo-pink.jpg",
        contentCount: "8 Movies & Specials",
    },
    {
        id: 3,
        name: "Marvel Cinematic Universe",
        slug: "mcu", // Added slug for routing
        description: "Earth's Mightiest Heroes",
        backgroundImage: "/test/marvel-superheroes-action-scene.jpg",
        logo: "/test/marvel-studios-logo.jpg",
        contentCount: "30+ Movies & Series",
    },
]);


const selectedCategory = ref('Alle');
const indexStore = useIndexStore();

const sort = ref(false);
const buttonInfo = computed(() => { return sort.value ? '↑' : '↓'; });

const selectedSeries = computed(() => {
    let arr = [];
    if (selectedCategory.value == 'Alle') {
        arr = indexStore.series;
    } else {
        arr = indexStore.series.filter((i) => i.categorie == selectedCategory.value);
    }

    if (sort.value) {
        arr = JSON.parse(JSON.stringify(arr)).reverse();
    }
    return arr;
});

const categories = computed(() => {
    const cats = [...new Set(indexStore.series.map((i) => i.categorie))];
    cats.unshift('Alle');
    return cats;
});


const backToTop = ref(false);

const showScrollToLastSeries = ref(undefined);
const scrolledToLastSeries = ref(false);

onMounted(() => {
    document.title = `Cinema | Jodu555`;

    window.addEventListener('scroll', handleScroll, { passive: true });

    if (localStorage.getItem('lastSeriesRow')) {
        const lastSeriesRow = JSON.parse(localStorage.getItem('lastSeriesRow') as string);
        if (lastSeriesRow.ID) {
            showScrollToLastSeries.value = lastSeriesRow.ID;
        }
    }
});

function work() {
    scrolledToLastSeries.value = true;

    const toScrollToSerie = useIndexStore().series.find((i) => i.ID == showScrollToLastSeries.value);

    if (toScrollToSerie == undefined) {
        return;
    }

    // selectedCategory.value = toScrollToSerie.categorie;
    selectedCategory.value = 'Alle';

    const element = document?.getElementById(`${showScrollToLastSeries.value}`);

    if (element) {
        setTimeout(() => {
            actualScrollIntoView(element);
            // showScrollToLastSeries.value = undefined;
            localStorage.removeItem('lastSeriesRow');
        }, 200);
    }
}

function isElementInViewport(element: HTMLElement) {
    const rect = element.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
    );
}

function actualScrollIntoView(element: HTMLElement) {
    if (!element) return;

    addEventListener(
        "scrollend",
        (evt) => {
            if (isElementInViewport(element)) return;
            element.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
            actualScrollIntoView(element);
        },
        { once: true }
    );
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}



onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll);
});

function handleScroll(e: Event) {
    const height = document.documentElement.offsetHeight;

    const mapping = map(
        document.documentElement.scrollTop,
        [0, height],
        [0, window.innerHeight - (document.querySelector('.footer')?.getBoundingClientRect().height || 0) - 25]
    );

    if (document.documentElement.scrollTop > 100) {
        backToTop.value = true;
        const backToTopElem = document.querySelector<HTMLDivElement>('#backToTop');
        if (backToTopElem) backToTopElem.style.top = `${Math.ceil(mapping)}px`;
    } else {
        backToTop.value = false;
    }
}

function map(value: number, oldRange: number[], newRange: number[]) {
    // console.log(value, oldRange, newRange);
    const newValue = ((value - oldRange[0]) * (newRange[1] - newRange[0])) / (oldRange[1] - oldRange[0]) + newRange[0];
    return Math.min(Math.max(newValue, newRange[0]), newRange[1]);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

</script>

<style scoped></style>