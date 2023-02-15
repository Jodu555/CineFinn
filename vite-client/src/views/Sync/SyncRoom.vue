<template>
	<div class="mt-3 container">
		<div class="d-flex justify-content-between">
			<button @click="leaveRoom()" type="button" class="btn btn-outline-danger">Leave Room</button>
			<AutoComplete :options="{ placeholder: 'Select a Series...', clearAfterSelect: true }" :data="autoCompleteSeries" :select-fn="selectSeries" />
		</div>
	</div>
</template>
<script>
import AutoComplete from '@/components/Layout/AutoComplete.vue';
import { mapActions, mapState } from 'vuex';

export default {
	components: { AutoComplete },
	computed: {
		...mapState(['series']),
		autoCompleteSeries() {
			return this.series.map((x) => ({ value: x.title, ID: x.ID }));
		},
	},
	methods: {
		...mapActions('sync', ['leaveRoom']),
		selectSeries(ID) {
			this.$socket.emit('sync-selectSeries', { ID });
		},
	},
	mounted() {
		this.$socket.on('sync-videoAction', ({ action, value }) => {
			if (action == 'sync-playback') {
				// value = true = Play
				// Value = false = Pause
			} else if (action == 'sync-skip') {
			} else if (action == 'sync-skipPercent') {
			} else if (action == 'sync-skipTimeline') {
			}
		});
	},
	async unmounted() {
		this.$socket.off('roomVideoAction');
	},
};
</script>
<style lang=""></style>
