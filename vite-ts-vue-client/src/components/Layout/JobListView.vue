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

				<template v-if="id === 'checkForUpdates'">
					<div class="btn-group" role="group" aria-label="Button group name">
						<button type="button" @click="click(id + '-smart')" class="btn btn-outline-info">
							Smart
						</button>
						<button type="button" @click="click(id + '-old')" class="btn btn-outline-warning">
							Old
						</button>
					</div>

				</template>
				<button v-else @click="click(id)" class="btn btn-outline-info">Start</button>
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
