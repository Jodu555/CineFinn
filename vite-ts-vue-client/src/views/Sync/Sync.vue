<template>
	<div v-auto-animate>
		<h1 v-if="!settings.enableBetaFeatures?.value" class="text-center mt-4 text-danger-emphasis">Work in Progress...</h1>
		<router-view v-if="settings.enableBetaFeatures?.value"> </router-view>
	</div>
</template>
<script lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useSyncStore } from '@/stores/sync.store';
import { mapWritableState, mapActions } from 'pinia';

//TODO: Make here all the socket stuff. cause it will be persistent over all the sync deep routes
export default {
	mounted() {
		this.$socket.on('sync-update-rooms', () => {
			this.loadRooms();
		});
		this.$socket.on('sync-message', ({ type, message }) => {
			//TODO: Perform SWAL
			this.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 3000,
				icon: type,
				title: `${message}`,
				timerProgressBar: true,
			});
			console.log('Message from sync-message type:', type, 'message:', message);
		});
	},
	async unmounted() {
		this.$socket.off('sync-update-rooms');
		this.$socket.off('sync-message');
	},
	computed: {
		...mapWritableState(useAuthStore, ['settings']),
	},
	methods: {
		...mapActions(useSyncStore, ['createRoom', 'joinRoom', 'loadRooms']),
	},
};
</script>
<style lang=""></style>
