<template>
	<div class="container">
		<button @click="leaveRoom()" type="button" class="btn btn-outline-danger">Leave Room</button>
		<h1>Came</h1>
	</div>
</template>
<script>
import { mapActions } from 'vuex';

export default {
	methods: {
		...mapActions('sync', ['leaveRoom']),
	},
	mounted() {
		this.$socket.on('roomVideoAction', ({ action, value }) => {
			if (action == 'playback') {
			} else if (action == 'skip') {
			} else if (action == 'skipPercent') {
			}
		});
	},
	async unmounted() {
		this.$socket.off('roomVideoAction');
	},
};
</script>
<style lang=""></style>
