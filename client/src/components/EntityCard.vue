<template>
	<div class="col">
		<div class="card h-100">
			<div class="card-body">
				<h5 class="card-title">{{ title }}</h5>
				<p class="card-text">This is a short card.</p>
			</div>
			<div class="card-footer text-muted">201 Episodes</div>
		</div>
	</div>
</template>
<script>
export default {
	props: ['title'],
};
</script>
<style lang=""></style>
