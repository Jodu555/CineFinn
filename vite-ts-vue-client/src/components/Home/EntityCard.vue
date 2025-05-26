<template>
	<div class="col" :id="entity.ID">
		<div class="card" :class="{ 'border-success': highlighted }" v-auto-animate>
			<pre v-if="settings.developerMode.value">
				{{ { editing: editing, title: entity.title, categorie: entity.categorie, infos: entity.infos, references: entity.references } }}
			</pre>
			<LazyImage v-if="entity?.infos?.image" :src="buildCoverURL(entity)" :childclass="'card-img-top'"
				alt="..." />
			<LazyImage v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" :childclass="'card-img-top'"
				alt="..." />
			<!-- <img v-if="entity?.infos?.image" :src="buildCoverURL(entity)" class="card-img-top" alt="..." />
			<img v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" class="card-img-top" alt="..." /> -->
			<div v-auto-animate class="card-body">
				<h4 class="card-title">{{ entity.infos?.title || entity.infos?.infos || entity.title }}</h4>
				<p class="card-text">
					<template v-if="entity.infos.description">
						{{
							showDescription
								? entity.infos.description
								: entity.infos.description.slice(0, descriptionLength) +
								(entity.infos.description.length >= descriptionLength ? '...' : '')
						}}
						<small v-if="!showDescription && entity.infos.description.length >= descriptionLength"
							class="read-more" @click="showDescription = true">More</small>
						<small v-else-if="entity.infos.description.length >= descriptionLength" class="read-more"
							@click="showDescription = false">Less</small>
						<br />
					</template>
					<template v-else>
						Here will later be provided some description an image and the start + end Date
						<br />
						<br />
					</template>

					<small v-if="entity.infos.startDate || entity.infos.endDate" class="text-muted">{{
						entity.infos.startDate }} - {{
							entity.infos.endDate }}</small>
					<small v-else class="text-mute">- Get Ready for it</small>
				</p>
				<button @click="goAndWatch" class="btn btn-outline-primary btn-sm">
					Go & Watch
				</button>
				<!-- <router-link class="btn btn-outline-primary btn-sm" :to="'/watch?id=' + entity.ID">Go &
					Watch</router-link> -->

				<div class="d-flex">
					<p class="ms-auto text-muted" style="margin-bottom: 0.1rem">ID: {{ entity.ID }}</p>
				</div>
				<button v-if="settings.showNewsAddForm.value && userInfo.role >= 2" type="button"
					class="btn btn-outline-info btn-sm" @click="editing = !editing">
					<font-awesome-icon :icon="['fa-solid', 'fa-pen']" size="lg" />
				</button>

				<div v-if="editing">
					<hr />
					<form @submit.prevent="saveEditObject">
						<h5>References:</h5>
						<div class="mb-3">
							<input type="text" v-model="editObject.references.aniworld" class="form-control"
								placeholder="Aniworld" />
						</div>
						<div class="mb-3">
							<input type="text" v-model="editObject.references.zoro" class="form-control"
								placeholder="Zoro" />
						</div>
						<div class="mb-3">
							<input type="text" v-model="editObject.references.sto" class="form-control"
								placeholder="STO" />
						</div>
						<h5>Infos:</h5>
						<div class="mb-3">
							<label for="title" class="form-label">Title</label>
							<input type="text" v-model="editObject.infos.infos" class="form-control" id="title"
								placeholder="Title" />
						</div>

						<label for="" class="form-label">Start / End - Date</label>
						<div class="row mb-3">
							<div class="col">
								<input type="text" v-model="editObject.infos.startDate" class="form-control"
									placeholder="Start" />
							</div>
							<div class="col">
								<input type="text" v-model="editObject.infos.endDate" class="form-control"
									placeholder="End" />
							</div>
						</div>

						<div v-if="editObject.infos.image != null" class="form-check mb-3">
							<input class="form-check-input" type="checkbox" v-model="editObject.infos.image" />
							<label class="form-check-label" for=""> Has Image </label>
						</div>
						<div v-if="editObject.infos.imageURL != null" class="mb-3">
							<label for="imgurl" class="form-label">Image Url</label>
							<input type="text" v-model="editObject.infos.imageURL" class="form-control" id="imgurl"
								placeholder="ImageUrl" />
						</div>

						<div class="mb-5">
							<label for="" class="form-label">Description</label>
							<textarea v-model="editObject.infos.description" class="form-control" id="description"
								rows="3"></textarea>
						</div>
						<div class="d-flex">
							<button @click="editing = false" type="button"
								class="btn btn-outline-danger">Cancel</button>
							<button type="submit" class="ms-auto btn btn-outline-success">Save</button>
						</div>
					</form>
				</div>
			</div>
			<div class="card-footer"
				:class="{ 'text-muted': !entity.infos.disabled, 'text-danger': entity.infos.disabled }">
				{{ entityInfoString }}
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { mapActions, mapWritableState } from 'pinia';
import { defineComponent, type PropType } from 'vue';
import LazyImage from '@/components/LazyImage.vue';
import { useAxios } from '@/utils';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';
import type { Serie, SerieInfo, SerieReference } from '@Types/classes';

export default defineComponent({
	props: {
		entity: { type: Object as PropType<Serie>, required: true },
		highlighted: { type: Boolean, default: false },
	},
	data() {
		return {
			descriptionLength: 125,
			showDescription: false,
			editing: false,
			editObject: {
				references: {
					aniworld: '',
					zoro: '',
					sto: '',
				} as SerieReference,
				infos: {
					infos: '',
					image: false,
					imageURL: '',
					startDate: '',
					endDate: '',
					description: '',
				} as SerieInfo,
			},
		};
	},
	created() {
		this.editObject.infos = { ...this.editObject.infos, ...this.entity.infos };

		this.editObject.references.aniworld = this.entity.references?.aniworld || '';
		this.editObject.references.zoro = this.entity.references?.zoro || '';
		this.editObject.references.sto = this.entity.references?.sto || '';
	},
	computed: {
		...mapWritableState(useAuthStore, ['settings', 'userInfo']),
		entityInfoString() {
			if (this.entity.infos.disabled) {
				return 'Series Disabled';
			}
			const moviePart =
				this.entity.movies.length >= 1 ? this.entity.movies.length + ' ' + (this.entity.movies.length > 1 ? 'Movies' : 'Movie') : '';
			const seasonPart =
				this.entity.seasons.length >= 1 ? this.entity.seasons.length + ' ' + (this.entity.seasons.length > 1 ? 'Seasons' : 'Season') : '';
			return this.entity.movies.length >= 1 && this.entity.seasons.length >= 1 ? moviePart + ' | ' + seasonPart : moviePart + seasonPart;
		},
	},
	methods: {
		...mapActions(useIndexStore, ['loadSeries']),
		goAndWatch() {
			this.$router.push({ path: '/watch', query: { id: this.entity.ID } });
			localStorage.setItem('lastSeriesRow', JSON.stringify({ ID: this.entity.ID }));
		},
		buildCoverURL(entity: Serie) {
			const axios = useAxios();
			const url = new URL(axios.defaults.baseURL + `/images/${entity.ID}/cover.jpg`);

			if (typeof axios.defaults.headers.common['auth-token'] == 'string') {
				url.searchParams.append('auth-token', axios.defaults.headers.common['auth-token']);
			}
			return url.href;
		},
		async saveEditObject() {
			const response = await useAxios().patch('/index/' + this.entity.ID, this.editObject);
			try {
				this.editing = false;
				// this.loadSeries();
				this.$swal({
					toast: true,
					position: 'top-end',
					showConfirmButton: false,
					timer: 3000,
					icon: 'success',
					title: `Series ${this.entity.ID} Updated Successfully`,
					timerProgressBar: true,
				});
			} catch (error) {
				if (error instanceof AxiosError) {
					console.log(`response`, response);
					this.$swal({
						toast: true,
						position: 'top-end',
						showConfirmButton: false,
						timer: 3000,
						icon: 'error',
						title: `${error.response?.data?.message || error.message}`,
						timerProgressBar: true,
					});
				}
			}
		},
	},
	components: { LazyImage },
});
</script>
<style scoped>
.read-more {
	color: var(--bs-link-color);
	text-decoration: underline;
	cursor: pointer;
}
</style>
