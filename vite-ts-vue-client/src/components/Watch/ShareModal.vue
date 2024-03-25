<template>
	<div class="modal fade" aria-modal="true" id="shareModal" tabindex="-1" aria-labelledby="shareModal" aria-hidden="true">
		<div class="modal-dialog modal-lg modal-dialog-centered">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="shareModalLabel">Share</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body" v-auto-animate>
					<pre v-if="settings.developerMode.value">{{ { entityObject, shareInclTime, shareInclLang, shareLink, currentMovie } }}</pre>
					<div class="row g-3 align-items-center">
						<div class="col-auto">
							<label for="sharelink" class="col-form-label">Link</label>
						</div>
						<div class="col-9">
							<input type="text" :value="shareLink" id="sharelink" readonly class="form-control" />
						</div>
						<div class="col-auto">
							<button @click="copyURL(shareLink)" type="button" class="btn btn-outline-primary">Copy</button>
						</div>
					</div>
					<hr />
					<div class="form-check d-flex gap-3 justify-content-center">
						<input class="form-check-input" v-model="shareInclTime" id="inclTime" type="checkbox" />
						<label class="form-check-label" for="inclTime"> Zeit Inkludieren </label>
					</div>
					<div class="form-check d-flex gap-3 justify-content-center">
						<input class="form-check-input" v-model="shareInclLang" id="inclLang" type="checkbox" />
						<label class="form-check-label" for="inclLang"> Sprache Inkludieren </label>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { mapState, mapWritableState } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { useWatchStore } from '@/stores/watch.store';
import type { SerieEpisode } from '@/types';

export default {
	data() {
		return {
			shareInclTime: false,
			shareInclLang: false,
		};
	},
	computed: {
		...mapWritableState(useAuthStore, ['settings']),
		...mapWritableState(useWatchStore, ['currentSeries', 'currentMovie', 'currentLanguage']),
		...mapState(useWatchStore, ['entityObject']),
		shareLink() {
			const video = document.querySelector('video');
			const time = this.shareInclTime ? '&time=' + video!.currentTime : '';
			const language = this.shareInclLang ? '&lang=' + this.currentLanguage : '';
			if (this.currentMovie == -1) {
				return `${location.origin}/watch?id=${this.currentSeries?.ID}&idx=${(this.entityObject as SerieEpisode)?.season}x${
					(this.entityObject as SerieEpisode)?.episode
				}${time}${language}`;
			} else {
				return `${location.origin}/watch?id=${this.currentSeries?.ID}&idx=${this.currentMovie}${time}${language}`;
			}
		},
	},

	methods: {
		async copyURL(url: string) {
			try {
				await navigator.clipboard.writeText(url);
				this.$swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 2500,
					icon: 'success',
					title: `Url Copied Successful`,
					timerProgressBar: true,
				});
			} catch ($e) {
				this.$swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 2500,
					icon: 'error',
					title: `Url Copied Error`,
					timerProgressBar: true,
				});
			}
		},
	},
};
</script>
<style lang=""></style>
