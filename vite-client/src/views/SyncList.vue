<template>
	<div class="container">
		<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
			<RoomCard v-for="i in 10"></RoomCard>
		</div>
	</div>
</template>
<script>
import RoomCard from '../components/Sync/RoomCard.vue';

export default {
	components: { RoomCard },
};
</script>
<style lang=""></style>
