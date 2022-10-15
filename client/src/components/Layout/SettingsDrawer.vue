<template>
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
				</ul>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState } from 'vuex';
import JobListView from '@/components/Layout/JobListView';

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
