<template>
	<div v-if="currentSeason !== -1" class="d-flex justify-content-end">
		<div class="btn-group">
			<button
				class="btn btn-outline-primary dropdown-toggle"
				type="button"
				id="seenmark"
				data-bs-toggle="dropdown"
				aria-haspopup="true"
				aria-expanded="false">
				Staffel schon Gesehen ?
			</button>
			<div class="dropdown-menu" aria-labelledby="seenmark">
				<button type="button" class="dropdown-item" @click="markSeason(true)" :class="{ disabled: currentSeason == -1 }">
					<b>Schon Gesehen</b>
				</button>
				<button type="button" class="dropdown-item" @click="markSeason(false)" :class="{ disabled: currentSeason == -1 }">
					<b>Noch nicht gesehen</b>
				</button>
			</div>
		</div>
	</div>
	<div v-if="currentMovie !== -1" class="d-flex justify-content-end">
		<div class="btn-group">
			<button
				class="btn btn-outline-primary dropdown-toggle"
				type="button"
				id="seenmark"
				data-bs-toggle="dropdown"
				aria-haspopup="true"
				aria-expanded="false">
				Film schon Gesehen ?
			</button>
			<div class="dropdown-menu" aria-labelledby="seenmark">
				<button type="button" class="dropdown-item" @click="markMovie(true)" :class="{ disabled: currentSeason !== -1 }">
					<b>Schon Gesehen</b>
				</button>
				<button type="button" class="dropdown-item" @click="markMovie(false)" :class="{ disabled: currentSeason !== -1 }">
					<b>Noch nicht gesehen</b>
				</button>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { useWatchStore } from '@/stores/watch.store';
import { mapActions, mapWritableState } from 'pinia';

export default {
	computed: {
		...mapWritableState(useWatchStore, ['currentSeason', 'currentMovie']),
	},
	methods: {
		...mapActions(useWatchStore, ['markSeason', 'markMovie']),
	},
};
</script>
<style lang=""></style>
