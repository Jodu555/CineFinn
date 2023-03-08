<template lang="">
	<div>
		<h1 class="text-center mt-4 text-danger-emphasis">Work in Progress...</h1>
		<!-- <router-view> </router-view> -->
	</div>
</template>
<script>
//TODO: Make here all the socket stuff. cause it will be persistent over all the sync deep routes
export default {
	mounted() {
		this.$socket.on('updateRoomList', (list) => {});
	},
	async unmounted() {
		this.$socket.off('updateRoomList');
	},
};
</script>
<style lang=""></style>
