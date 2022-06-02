<template>
	<div class="col">
		<div class="card h-100">
			<div class="card-body">
				<h5 class="card-title">{{ title }}</h5>
				<p class="card-text">This is a short card.</p>
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
