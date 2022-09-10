<template>
	<div class="col">
		<div class="card h-100">
			<!-- <img
				src="https://aniworld.to/public/img/cover/akashic-records-of-bastard-magical-instructor-stream-cover-VyCC27ePiixKPIVArGWdlGZZ7hCu23iD_150x225.jpg"
				class="card-img-top"
				alt="..."
			/> -->
			<img
				src="https://aniworld.to/public/img/cover/akashic-records-of-bastard-magical-instructor-stream-cover-VyCC27ePiixKPIVArGWdlGZZ7hCu23iD_220x330.jpg"
				class="card-img-top"
				alt="..."
			/>
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
