<template>
	<div v-if="entityObject" class="d-flex justify-content-between">
		<div v-auto-animate>
			<button @click="switchTo(-1)" title="Previous Episode" class="btn btn-outline-warning">
				<font-awesome-icon icon="fa-solid fa-backward-step" size="lg" />
				{{ showNextPrevTxt ? 'Previous' : '' }}
			</button>
		</div>
		<h3 v-auto-animate class="text-muted text-truncate" style="margin-bottom: 0">
			<p class="text-center text-wrap" style="margin-bottom: 0.6rem">
				{{ entityObject.primaryName }}
			</p>
			<div v-auto-animate class="text-center">
				<img
					v-for="lang in entityObject.langs"
					:key="lang"
					@click="changeLanguage(lang)"
					class="flag shadow mb-4 bg-body"
					:class="{ active: currentLanguage == lang }"
					:src="`/flag-langs/${lang.toLowerCase()}.svg`"
					:alt="langDetails[lang.toLowerCase()]?.alt || 'None Alt'"
					:title="langDetails[lang.toLowerCase()]?.title || 'None Title'" />
			</div>
		</h3>
		<div v-auto-animate>
			<button @click="switchTo(1)" title="Next Episode" class="btn btn-outline-success">
				{{ showNextPrevTxt ? 'Next' : '' }}
				<font-awesome-icon icon="fa-solid fa-forward-step" size="lg" />
			</button>
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { mapWritableState, mapState } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { useWatchStore } from '@/stores/watch.store';
import { langDetails } from '@/utils/constants';
import type { Langs } from '@Types/classes';

export default defineComponent({
	props: {
		switchTo: { type: Function as PropType<(vel: number) => void>, required: true },
		changeLanguage: { type: Function as PropType<(lang: Langs) => void>, required: true },
	},
	data() {
		return {
			showNextPrevTxt: false,
			langDetails: langDetails,
		};
	},
	computed: {
		...mapWritableState(useWatchStore, ['currentSeries', 'currentMovie', 'currentSeason', 'currentEpisode', 'currentLanguage', 'watchList']),
		...mapWritableState(useAuthStore, ['authToken', 'settings']),
		...mapState(useWatchStore, ['videoSrc', 'entityObject']),
	},
});
</script>
<style scoped>
.flag {
	margin-left: 16px;
	width: 50px;
	cursor: pointer;
}
.flag.active {
	-webkit-box-shadow: 0 8px 10px 0 #65abf3 !important;
	box-shadow: 0 8px 10px 0 #65abf3 !important;
}
</style>
