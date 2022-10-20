<template>
	<div class="col">
		<div class="card">
			<img v-if="entity?.infos?.image" :src="entity.infos.image" class="card-img-top" alt="..." />
			<div class="card-body">
				<h4 class="card-title">{{ entity.title }}</h4>
				<p v-if="entity.infos && entity.infos.description" class="card-text">
					{{
						showDescription
							? entity.infos.description
							: entity.infos.description.slice(0, 150) + '...'
					}}
					<small v-if="!showDescription" class="read-more" @click="showDescription = true"
						>More</small
					>
					<br />
					<!-- <pre>{{ entity.infos}}</pre> -->
					<small class="text-muted"
						>{{ entity.infos.startDate }} - {{ entity.infos.endDate }}</small
					>
				</p>
				<p v-else class="card-text">
					Here will later be provided some description an image and the start + end Date
					<br />
					<br />
					<small class="text-mute">- Get Ready for it</small>
				</p>
				<router-link class="btn btn-outline-primary btn-sm" :to="'/watch?id=' + entity.ID"
					>Go & Watch</router-link
				>
			</div>
			<div class="card-footer text-muted">
				{{
					entity.movies.length >= 1
						? entity.movies.length + ' ' + (entity.movies.length > 1 ? 'Movies' : 'Movie')
						: ''
				}}
				{{
					(entity.movies.length >= 1 ? ' | ' : '') +
					entity.seasons.length +
					' ' +
					(entity.seasons.length > 1 ? 'Seasons' : 'Season')
				}}
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: ['entity'],
	data() {
		return {
			showDescription: false,
		};
	},
	created() {},
};
</script>
<style scoped>
.read-more {
	color: var(--bs-link-color);
	text-decoration: underline;
	cursor: pointer;
}
</style>
