<template>
	<div class="col">
		<div class="card">
			<LazyImage v-if="entity?.infos?.image" :src="buildCoverURL(entity)" class="card-img-top" alt="..." />
			<LazyImage v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" class="card-img-top" alt="..." />
			<!-- <img v-if="entity?.infos?.image" :src="buildCoverURL(entity)" class="card-img-top" alt="..." />
			<img v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" class="card-img-top" alt="..." /> -->
			<div class="card-body">
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
				<div class="d-flex">
					<p class="ms-auto text-muted" style="margin-bottom: 0.1rem">ID: {{ entity.ID }}</p>
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
