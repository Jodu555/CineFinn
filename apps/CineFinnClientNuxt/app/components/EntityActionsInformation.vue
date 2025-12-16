<template>
    <div v-if="indexStore.selectedEntity != null && indexStore.selectedWatchableEntity != null"
        class="d-flex justify-content-between mt-3">
        <div>
            <button @click="switchTo(-1)" title="Previous Episode" class="btn btn-outline-warning">
                <font-awesome-icon icon="fa-solid fa-backward-step" size="lg" />
                {{ showNextPrevTxt ? 'Previous' : '' }}
            </button>
        </div>
        <h3 class="text-secondary text-truncate" style="margin-bottom: 0">
            <!-- <p class="text-center text-wrap" style="margin-bottom: 0.6rem">
				{{ entityObject.primaryName }}
			</p> -->
            <div class="text-center">
                <img v-for="lang in availableLanguages" :key="lang" @click="changeLanguage(lang)"
                    class="flag shadow mb-4 bg-body" :class="{ active: currentLanguage == lang }"
                    :src="`/flag-langs/${lang.toLowerCase()}.svg`"
                    :alt="langDetails[lang.toLowerCase()]?.alt || 'None Alt'"
                    :title="langDetails[lang.toLowerCase()]?.title || 'None Title'" />
            </div>
        </h3>
        <div>
            <button @click="switchTo(1)" title="Next Episode" class="btn btn-outline-success">
                {{ showNextPrevTxt ? 'Next' : '' }}
                <font-awesome-icon icon="fa-solid fa-forward-step" size="lg" />
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
const indexStore = useIndexStore();
const showNextPrevTxt = ref(false);

const props = defineProps<{
    switchTo: (vel: number) => void;
    changeLanguage: (lang: string) => void;
}>();

const availableLanguages = computed(() => {
    return indexStore.selectedEntity?.watchableEntitys.map((we) => we.lang);
});

const currentLanguage = computed(() => {
    return indexStore.selectedWatchableEntity?.lang
});
</script>

<style scoped>
.flag {
    margin-left: 16px;
    width: 69px;
    cursor: pointer;
}

.flag.active {
    -webkit-box-shadow: 0 8px 10px 0 #65abf3 !important;
    box-shadow: 0 8px 10px 0 #65abf3 !important;
}
</style>
