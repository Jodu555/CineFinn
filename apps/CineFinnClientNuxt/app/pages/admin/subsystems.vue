<template>
    <div>
        <div class="row row-cols-2 row-cols-lg-5 g-2 g-lg-3 d-flex justify-content-between gap-3">
            <div v-for="subsystem in data" :key="subsystem.id" class="card mb-3" style="max-width: 540px">
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


const { data, status } = await useFetch<SubSystem[]>(useAPIURL() + '/admin/subsystems', {
    key: 'admin-subsystems',
    method: 'GET',
    headers: {
        'auth-token': useAuthStore().authToken,
    },
});



export type SubSystem = OfflineSubSystem | OnlineSubSystem;

export interface OfflineSubSystem {
    status: 'offline';
    type: string;
    id: string;
}

export interface OnlineSubSystem {
    status: 'online';
    type: string;
    id: string;
    token: string;
    ptoken: string;
    readrate: number;
    endpoint?: string;
    series: string[];
}


</script>

<style></style>