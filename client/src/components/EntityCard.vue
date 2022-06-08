<template>
	<div class="col">
		<div class="card h-100">
			<div class="card-body">
				<h4 class="card-title">{{ entity.title }}</h4>
				<p class="card-text">
					With supporting text below as a natural lead-in to additional content.
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
	created() {},
};
</script>
<style lang=""></style>
