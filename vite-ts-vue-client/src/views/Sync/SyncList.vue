<template>
	<div v-auto-animate class="container">
		<h2 class="text-center mb-4">Sync-Room List</h2>
		<div v-if="loading" class="d-flex justify-content-center mb-4">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-auto-animate class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
			<!-- Join Room -->
			<div>
				<div class="card text-start">
					<div class="card-body">
						<h3 class="card-title">Join a Room</h3>
						<div class="mb-3">
							<input
								type="text"
								v-model="roomInputID"
								class="form-control"
								name="roomid"
								id="roomid"
								aria-describedby="helpId"
								placeholder="RoomID" />
							<small id="helpId" class="form-text text-muted">The ID of the room you want to join</small>
						</div>
						<div class="d-grid gap-2">
							<button @click="joinRoom(roomInputID)" type="button" class="btn btn-success">Join</button>
						</div>
					</div>
				</div>
			</div>
			<!-- Open Room -->
			<div>
				<div class="card text-start">
					<div class="card-body">
						<h3 class="card-title">Open Your Own</h3>
						<p class="card-text text-muted text-center">Open your own Room to watch with friends and have fun!</p>
						<div class="d-grid gap-2">
							<button @click="createRoom()" type="button" class="btn btn-success">Open</button>
						</div>
					</div>
				</div>
			</div>
			<RoomCard v-for="room in roomList" :room="room"></RoomCard>
		</div>
	</div>
</template>
<script lang="ts">
import { mapActions, mapWritableState } from 'pinia';
import RoomCard from '@/components/Sync/RoomCard.vue';
import { useSyncStore } from '@/stores/sync.store';

export default {
	components: { RoomCard },
	data() {
		return {
			roomInputID: '',
		};
	},
	computed: {
		...mapWritableState(useSyncStore, ['roomList', 'loading']),
	},
	methods: {
		...mapActions(useSyncStore, ['createRoom', 'joinRoom', 'loadRooms']),
	},
	mounted() {
		this.loadRooms();
	},
};
</script>
<style lang=""></style>
