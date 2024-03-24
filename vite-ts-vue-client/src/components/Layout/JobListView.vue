<template>
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
			<div class="row" v-else>
				<p v-if="lastRun">Latest Run: {{ new Date(lastRun).toLocaleString() }}</p>
				<p v-if="lastDuration">Latest Duration: {{ new Date(lastDuration).toLocaleString() }}</p>

				<button @click="click(id)" class="btn btn-outline-info">Start</button>
			</div>
		</li>
	</div>
</template>
<script lang="ts">
export default {
	props: {
		id: String,
		title: String,
		callpoint: String,
		running: Boolean,
		lastRun: Number,
		lastDuration: Number,
		click: { type: Function, required: true },
	},
	methods: {},
};
</script>
<style></style>
