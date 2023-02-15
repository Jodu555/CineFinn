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
					:class="{ active: this.currentLanguage == lang }"
					:src="`/flag-langs/${lang.toLowerCase()}.svg`"
					:alt="langDetails[lang.toLowerCase()]?.alt || 'None Alt'"
					:title="langDetails[lang.toLowerCase()]?.title || 'None Title'"
				/>
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
<script>
import { mapGetters, mapState } from 'vuex';

export default {
	props: {
		switchTo: { type: Function },
		changeLanguage: { type: Function },
	},
	data() {
		return {
			showNextPrevTxt: false,
			langDetails: {
				gerdub: {
					title: 'Deutsch/German',
					alt: 'Deutsche Sprache, Flagge',
				},
				gersub: {
					title: 'Mit deutschen Untertiteln',
					alt: 'Deutsche Flagge, Untertitel, Flagge',
				},
				engdub: {
					title: 'Englisch/English',
					alt: 'Englische Flagge, Flagge',
				},
				engsub: {
					title: 'mit englischen Untertiteln',
					alt: 'Englische Flagge, Flagge, Untertitel, Flag',
				},
			},
		};
	},
	computed: {
		...mapState('watch', ['currentSeries', 'currentMovie', 'currentSeason', 'currentEpisode', 'currentLanguage', 'watchList']),
		...mapState('auth', ['authToken', 'settings']),
		...mapGetters('watch', ['videoSrc', 'entityObject']),
	},
};
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
