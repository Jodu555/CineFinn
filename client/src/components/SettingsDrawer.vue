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
					<li class="list-group-item">
						Checking for the generated images
						<!-- <div class="progress">
							<div
								class="progress-bar progress-bar-striped progress-bar-animated"
								role="progressbar"
								aria-valuenow="75"
								aria-valuemin="0"
								aria-valuemax="100"
								style="width: 75%"
							></div>
						</div> -->
					</li>
					<li class="list-group-item">Generating Images</li>
					<li class="list-group-item">Rescraping the archive</li>
				</ul>
			</div>
		</div>
	</div>
</template>
<script>
export default {
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
