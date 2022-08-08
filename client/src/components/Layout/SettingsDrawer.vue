<template lang="">
	<div>
		<div
			class="offcanvas offcanvas-end"
			tabindex="-1"
			id="offcanvasSettings"
			aria-labelledby="offcanvasSettingsLabel"
		>
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Infos - Settings</h5>
				<button
					type="button"
					class="btn-close"
					data-bs-dismiss="offcanvas"
					aria-label="Close"
				></button>
			</div>
			<div class="offcanvas-body">
				<h2>User Infos:</h2>
				<hr />
				<ul class="list-group list-group-flush">
					<li class="list-group-item">
						<h5>
							<b>Username:</b> <span class="text-muted">{{ userInfo.username }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>E-Mail:</b> <span class="text-muted">{{ userInfo.email }}</span>
						</h5>
					</li>
				</ul>
				<!-- <hr /> -->
				<h2>Current available Jobs:</h2>
				<hr />
				<ul class="list-group list-group-flush">
					<JobListView
						v-for="job in jobs"
						:id="job.id"
						:title="job.name"
						:callpoint="job.callpoint"
						:key="job.id"
						:running="job.running"
						:lastRun="job.lastRun"
						:click="start"
					/>

					<!-- <JobListView title="TEST" callpoint="/test/asd" :running="false" :lastRun="Date.now()" /> -->

					<!-- <JobListView title="Generated Images Validation" :running="true" lastRun="null" />
					<JobListView title="Generating Images" :running="false" lastRun="10.06.2022 10 Uhr" />
					<JobListView
						title="Rescraping the archive"
						:running="false"
						lastRun="01.01.2021 20 Uhr"
					/> -->
				</ul>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState } from 'vuex';
import { io } from 'socket.io-client';
import JobListView from '@/components/JobListView';

export default {
	components: { JobListView },
	data() {
		return {
			jobs: [],
		};
	},
	computed: {
		...mapState('auth', ['userInfo', 'authToken']),
	},
	mounted() {
		this.load();
	},
	async unmounted() {
		this.jobs.forEach((job) => {
			const socketEvent = `${job.callpoint.replace('/', '').replaceAll('/', '_')}-end`;
			this.$socket.off(socketEvent);
		});
	},
	methods: {
		async load() {
			const response = await this.$networking.get('/managment/jobs/info');
			if (!response.success) return;
			this.jobs = response.json;
			this.jobs.forEach((job) => {
				const socketEvent = `${job.callpoint.replace('/', '').replaceAll('/', '_')}-end`;
				this.$socket.on(socketEvent, () => {
					job.running = false;
					this.$swal({
						toast: true,
						position: 'top-end',
						showConfirmButton: false,
						timer: 2500,
						icon: 'success',
						title: `${job.name} - Finished`,
						timerProgressBar: true,
					});
				});
			});
		},
		start(id) {
			const job = this.jobs.find((j) => j.id == id);
			job.running = true;
			job.lastRun = Date.now();
			this.$networking.get(`/managment${job.callpoint}`);
			this.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 2500,
				icon: 'warning',
				title: `${job.name} - Started!`,
				timerProgressBar: true,
			});
		},
	},
};
</script>
<style lang=""></style>
