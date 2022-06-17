<template lang="">
	<div>
		<li class="list-group-item">
			<h5>{{ title }}</h5>
			<div v-if="running" class="progress">
				<div
					class="progress-bar progress-bar-striped progress-bar-animated bg-info"
					role="progressbar"
					aria-valuenow="75"
					aria-valuemin="0"
					aria-valuemax="100"
					style="width: 75%"
				></div>
			</div>
			<div class="row" v-else>
				<p>Latest: {{ lastRun }}</p>
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
		lastRun: String,
	},
};
</script>
<style lang=""></style>
