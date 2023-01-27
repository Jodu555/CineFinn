<template>
	<div class="container">
		<h2 class="text-center mb-4">Sync-Room List</h2>
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
			<div class="card text-start">
				<div class="card-body">
					<h3 class="card-title">Open Your Own</h3>
					<p class="card-text text-muted text-center">Open your own Room to watch with friends and have fun!</p>
					<div class="d-grid gap-2">
						<button @click="createRoom()" type="button" class="btn btn-success">Open</button>
					</div>
				</div>
			</div>
			<RoomCard v-for="i in 15"></RoomCard>
		</div>
	</div>
</template>
<script>
import { mapActions, mapMutations } from 'vuex';
import RoomCard from '../components/Sync/RoomCard.vue';

export default {
	components: { RoomCard },
	methods: {
		...mapActions('sync', ['createRoom', 'joinRoom']),
	},
};
</script>
<style lang=""></style>
