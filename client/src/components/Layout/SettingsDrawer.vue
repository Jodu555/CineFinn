<template lang="">
	<div>
		<div
			class="offcanvas offcanvas-end"
			tabindex="-1"
			id="offcanvasSettings"
			aria-labelledby="offcanvasSettingsLabel"
		>
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Settings</h5>
				<button
					type="button"
					class="btn-close"
					data-bs-dismiss="offcanvas"
					aria-label="Close"
				></button>
			</div>
			<div class="offcanvas-body">
				<div class="d-grid gap-2">
					<button type="button" @click="rescrapeVideos()" class="btn btn-outline-info">
						Re-Scrape The Videos
					</button>
					<hr />
					<button type="button" @click="rescrapeVideos()" class="btn btn-outline-info">
						Generate the preview imgs
					</button>
				</div>
				<hr />
				<h2>Current Active Jobs:</h2>
				<ul class="list-group list-group-flush">
					<JobListView title="Generated Images Validation" :running="true" lastRun="null" />
					<JobListView title="Generating Images" :running="false" lastRun="10.06.2022 10 Uhr" />
					<JobListView
						title="Rescraping the archive"
						:running="false"
						lastRun="01.01.2021 20 Uhr"
					/>
				</ul>
			</div>
		</div>
	</div>
</template>
<script>
import JobListView from '@/components/JobListView';
export default {
	components: { JobListView },
	methods: {
		rescrapeVideos() {
			//TODO: Logic
			this.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 1500,
				icon: 'success',
				title: 'Re-Scraped all the videos!',
				timerProgressBar: true,
			});
		},
	},
};
</script>
<style lang=""></style>
