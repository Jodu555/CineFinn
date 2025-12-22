<template>
    <div>
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-6 gap-3">
            <div class="col-auto text-center">
                <h2 class="text-center">Accounts</h2>
                <h4 class="text-center">{{ overview.accounts }}</h4>
            </div>
            <div class="col-auto text-center" style="position: relative;">
                <h2 class="text-center">Series</h2>
                <!-- <h4 class="text-center">{{ overview.series }}</h4> -->
                <h4 class="text-center">{{ indexStore.series.length }}</h4>
                <span v-if="indexStore.series.filter((x) => x.infos.disabled).length !== 0"
                    @click="toggleDisabledSeriesModal = true"
                    style="left: 70% !important; top: -2% !important; cursor: pointer"
                    class="position-absolute translate-middle badge rounded-pill bg-danger-subtle text-danger-emphasis">{{
                        indexStore.series.filter((x) => x.infos.disabled).length}}</span>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">Movies</h2>
                <h4 class="text-center">{{ overview.movies }}</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">Seasons</h2>
                <h4 class="text-center">{{ overview.seasons }}</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">Episodes</h2>
                <h4 class="text-center">{{ overview.episodes }}</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">WatchableEntitys</h2>
                <h4 class="text-center">{{ overview.watchableEntitys }}</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">SubSystems</h2>
                <h4 class="text-center">{{ overview.subsystems.all - overview.subsystems.offline }} ({{
                    overview.subsystems.all }})</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">Sockets</h2>
                <h4 class="text-center">{{ overview.sockets || '0' }}</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">Watched Entitys</h2>
                <h4 class="text-center">{{ overview.watchHistoryEntrys }}</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">Playlists</h2>
                <h4 class="text-center">{{ overview.playlists }}</h4>
            </div>
            <div class="col-auto text-center">
                <h2 class="text-center">Scraper</h2>
                <h4 class="text-center">{{ overview.scraper ? 'Ja' : 'Nein' }}</h4>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>

definePageMeta({
    middleware: 'auth',
});

const toggleDisabledSeriesModal = ref(false);

const adminStore = useAdminStore();
const indexStore = useIndexStore();

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);

const overview = computed(() => adminStore.overview);

</script>

<style></style>