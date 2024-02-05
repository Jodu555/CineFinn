<template>
	<div v-auto-animate>
		<!-- <h1 v-if="!settings.developerMode.value" class="text-center mt-4 text-danger-emphasis">Work in Progress...</h1> -->
		<!-- <router-view v-if="settings.developerMode.value"> </router-view> -->
		<router-view> </router-view>
	</div>
</template>
<script>
import { mapState, mapActions } from 'vuex';

//TODO: Make here all the socket stuff. cause it will be persistent over all the sync deep routes
export default {
	mounted() {
		this.$socket.on('sync-update-rooms', () => {
			this.loadRooms();
		});
		this.$socket.on('sync-message', ({ type, message }) => {
			//TODO: Perform SWAL
			console.log('Message from sync-message type:', type, 'message:', message);
		});
	},
	async unmounted() {
		this.$socket.off('sync-update-rooms');
		this.$socket.off('sync-message');
	},
	computed: {
		...mapState('auth', ['settings']),
	},
	methods: {
		...mapActions('sync', ['createRoom', 'joinRoom', 'loadRooms']),
	},
};
</script>
<style lang=""></style>
