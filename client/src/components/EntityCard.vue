<template>
	<div class="col">
		<div class="card h-100">
			<div class="card-body">
				<h4 class="card-title">{{ title }}</h4>
				<p class="card-text">
					With supporting text below as a natural lead-in to additional content.
				</p>
				<a href="#" class="btn btn-outline-primary btn-sm">Go & Watch</a>
			</div>
			<div class="card-footer text-muted">{{ seasons.length }} Seasons</div>
		</div>
	</div>
</template>
<script>
export default {
	props: ['title', 'seasons'],
};
</script>
<style lang=""></style>
