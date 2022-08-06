<template lang="">
	<div>
		<li class="list-group-item">
			<h5>{{ title }}</h5>
			<div v-if="running">
				<span class="text-muted">Loading...</span>
				<div class="d-flex justify-content-center">
					<div class="spinner-grow text-info" style="width: 3rem; height: 3rem" role="status">
						<span class="visually-hidden">Loading...</span>
					</div>
				</div>
			</div>

			<!-- <div v-if="running" class="progress">
				<div
					class="progress-bar progress-bar-striped bg-info"
					role="progressbar"
					:aria-valuenow="value"
					aria-valuemin="0"
					aria-valuemax="100"
					:style="{ width: value + '%' }"
				></div>
			</div> -->
			<div class="row" v-else>
				<p v-if="lastRun">Latest Run: {{ new Date(lastRun).toLocaleString() }}</p>
				<p v-if="lastDuration">Latest Duration: {{ new Date(lastDuration).toLocaleString() }}</p>

				<button class="btn btn-outline-info">Start</button>
			</div>
		</li>
	</div>
</template>
<script>
export default {
	props: {
		title: String,
		running: Boolean,
		lastRun: Number,
		lastDuration: Number,
	},
};
</script>
<style lang=""></style>
