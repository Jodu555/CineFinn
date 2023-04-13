<template>
	<div class="col">
		<div class="card">
			<LazyImage v-if="entity?.infos?.image" :src="buildCoverURL(entity)" :childclass="'card-img-top'" alt="..." />
			<LazyImage v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" :childclass="'card-img-top'" alt="..." />
			<!-- <img v-if="entity?.infos?.image" :src="buildCoverURL(entity)" class="card-img-top" alt="..." />
			<img v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" class="card-img-top" alt="..." /> -->
			<div v-auto-animate class="card-body">
				<h4 class="card-title">{{ entity.infos?.title || entity.title }}</h4>
				<p class="card-text">
					<template v-if="entity.infos.description">
						{{
							showDescription
								? entity.infos.description
								: entity.infos.description.slice(0, descriptionLength) + (entity.infos.description.length >= descriptionLength ? '...' : '')
						}}
						<small v-if="!showDescription && entity.infos.description.length >= descriptionLength" class="read-more" @click="showDescription = true"
							>More</small
						>
						<small v-else-if="entity.infos.description.length >= descriptionLength" class="read-more" @click="showDescription = false">Less</small>
						<br />
					</template>
					<template v-else>
						Here will later be provided some description an image and the start + end Date
						<br />
						<br />
					</template>
					<!-- <pre>{{ entity.infos}}</pre> -->

					<small v-if="entity.infos.startDate || entity.infos.endDate" class="text-muted"
						>{{ entity.infos.startDate }} - {{ entity.infos.endDate }}</small
					>
					<small v-else class="text-mute">- Get Ready for it</small>
				</p>
				<!-- <p v-else class="card-text">
				</p> -->
				<router-link class="btn btn-outline-primary btn-sm" :to="'/watch?id=' + entity.ID">Go & Watch</router-link>
				<button type="button" class="btn btn-outline-info btn-sm ms-3" @click="editing = !editing">Edit</button>

				<div class="d-flex">
					<p class="ms-auto text-muted" style="margin-bottom: 0.1rem">ID: {{ entity.ID }}</p>
				</div>

				<div v-if="editing">
					<hr />
					<pre>{{ editObject }}</pre>
					<h5>References:</h5>
					<div class="mb-3">
						<input type="text" @v-model="editObject.references.aniworld" class="form-control" placeholder="Aniworld" />
					</div>
					<div class="mb-3">
						<input type="text" @v-model="editObject.references.zoro" class="form-control" placeholder="Zoro" />
					</div>

					<div class="mb-3">
						<label for="" class="form-label">Title</label>
						<input type="text" @v-model="editObject.infos" class="form-control" id="title" placeholder="Title" />
					</div>

					<label for="" class="form-label">Start / End - Date</label>
					<div class="row">
						<div class="col">
							<input type="text" @v-model="editObject.startDate" class="form-control" placeholder="Start" />
						</div>
						<div class="col">
							<input type="text" @v-model="editObject.endDate" class="form-control" placeholder="End" />
						</div>
					</div>

					<div class="mb-3 mt-3">
						<label for="" class="form-label">Description</label>
						<textarea @v-model="editObject.description" class="form-control" id="description" rows="3">{{ entity.infos.description }}</textarea>
					</div>
					<div class="d-flex">
						<button type="button" class="ms-auto btn btn-outline-success">Save</button>
					</div>
				</div>
			</div>
			<div class="card-footer text-muted">
				{{ entityInfoString }}
			</div>
		</div>
	</div>
</template>
<script>
import LazyImage from '../LazyImage.vue';

export default {
	props: ['entity'],
	data() {
		return {
			descriptionLength: 125,
			showDescription: false,
			editing: false,
			editObject: {
				references: {
					aniworld: '',
					zoro: '',
				},
				infos: '',
				startDate: '',
				endDate: '',
				description: '',
			},
		};
	},
	created() {},
	computed: {
		entityInfoString() {
			const moviePart = this.entity.movies.length >= 1 ? this.entity.movies.length + ' ' + (this.entity.movies.length > 1 ? 'Movies' : 'Movie') : '';
			const seasonPart =
				this.entity.seasons.length >= 1 ? this.entity.seasons.length + ' ' + (this.entity.seasons.length > 1 ? 'Seasons' : 'Season') : '';
			return this.entity.movies.length >= 1 && this.entity.seasons.length >= 1 ? moviePart + ' | ' + seasonPart : moviePart + seasonPart;
		},
	},
	methods: {
		buildCoverURL(entity) {
			const url = new URL(this.$networking.API_URL + `/images/${entity.ID}/cover.jpg`);
			url.searchParams.append('auth-token', this.$networking.auth_token);
			return url.href;
		},
	},
	components: { LazyImage },
};
</script>
<style scoped>
.read-more {
	color: var(--bs-link-color);
	text-decoration: underline;
	cursor: pointer;
}
</style>
