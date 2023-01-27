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
};
</script>
<style lang=""></style>
