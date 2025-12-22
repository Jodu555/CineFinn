<template>
    <div>
        <h2 class="text-center">SubSystems</h2>
        <div v-if="loading" class="d-flex justify-content-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
        <div v-if="error" class="alert alert-danger" role="alert">
            <strong>Error:</strong> {{ error }}
        </div>
        <div class="row row-cols-2 row-cols-lg-5 g-2 g-lg-3 d-flex justify-content-between gap-3">
            <div v-for="subsystem in subsystems" :key="subsystem.id" class="card mb-3" style="max-width: 540px">
                <div class="card-body">
                    <h5 class="card-title"
                        :class="{ 'text-danger': subsystem.status == 'offline', 'text-success': subsystem.status == 'online' }">
                        {{ subsystem.id }}
                    </h5>
                    <div class="card-text">
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item">
                                PToken: {{ subsystem.status == 'offline' ? 'Offline' :
                                    subsystem.ptoken }}
                            </li>
                            <li class="list-group-item">
                                Endpoint:
                                {{
                                    subsystem.status == 'offline'
                                        ? 'Offline'
                                        : subsystem.endpoint
                                            ? subsystem.endpoint
                                            : '*Socket Transmit*'
                                }}
                            </li>
                            <li v-if="subsystem.status == 'online'" class="list-group-item">
                                Readrate: {{ subsystem.readrate }}
                            </li>
                            <li class="list-group-item">
                                Series: {{ subsystem.status == 'offline' ? 'Offline' :
                                    subsystem.series.length }}
                            </li>
                        </ul>
                        <div v-if="subsystem.status == 'online'" class="d-grid gap-2">
                            <button type="button" disabled @click="
                                toggleShowSeries = true;
                            selectedSubSystem = subsystem.id;
                            " class="btn btn-outline-primary mt-2">
                                List
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import useAPIURL from '~/hooks/useAPIURL';

const toggleShowSeries = ref(false);
const selectedSubSystem = ref('');


definePageMeta({
    middleware: 'auth',
});

const adminStore = useAdminStore();

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);
const subsystems = computed(() => adminStore.subsystems);

// await callOnce('loadSubsystems', () => adminStore.loadSubsystems(), { mode: 'navigation' });

</script>

<style></style>