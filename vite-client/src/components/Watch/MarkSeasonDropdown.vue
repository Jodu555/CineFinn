<template>
	<div v-if="currentSeason !== -1" class="d-flex justify-content-end">
		<div class="btn-group">
			<button
				class="btn btn-outline-primary dropdown-toggle"
				type="button"
				id="seenmark"
				data-bs-toggle="dropdown"
				aria-haspopup="true"
				aria-expanded="false"
			>
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
</template>
<script>
import { mapActions, mapState } from 'vuex';

export default {
	computed: {
		...mapState('watch', ['currentSeason']),
	},
	methods: {
		...mapActions('watch', ['markSeason']),
	},
};
</script>
<style lang=""></style>
