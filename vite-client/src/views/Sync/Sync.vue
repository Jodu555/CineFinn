<template>
	<div v-auto-animate>
		<!-- <h1 v-if="!settings.developerMode.value" class="text-center mt-4 text-danger-emphasis">Work in Progress...</h1> -->
		<!-- <router-view v-if="settings.developerMode.value"> </router-view> -->
		<router-view> </router-view>
	</div>
</template>
<script>
import { mapState } from 'vuex';

//TODO: Make here all the socket stuff. cause it will be persistent over all the sync deep routes
export default {
	mounted() {
		this.$socket.on('updateRoomList', (list) => {});
	},
	async unmounted() {
		this.$socket.off('updateRoomList');
	},
	computed: {
		...mapState('auth', ['settings']),
	},
};
</script>
<style lang=""></style>
