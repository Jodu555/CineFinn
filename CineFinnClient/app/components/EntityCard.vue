<template>
	<div class="col" style="content-visibility: auto" :id="entity.UUID">
		<div class="card" :class="{ 'border-success': highlighted }" v-auto-animate>
			<!-- <pre v-if="settings.developerMode.value">
				{{ { editing: editing, title: entity.title, categorie: entity.categorie, infos: entity.infos, references: entity.references } }}
			</pre> -->
			<!-- <LazilyImage v-if="entity?.infos?.image" :src="buildCoverURL" :childclass="'card-img-top'" alt="..." />
			<LazilyImage v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" :childclass="'card-img-top'" alt="..." /> -->
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
						<small
							v-if="!showDescription && entity.infos.description.length >= descriptionLength"
							class="read-more"
							@click="showDescription = true"
							>More</small
						>
						<small v-else-if="entity.infos.description.length >= descriptionLength" class="read-more" @click="showDescription = false"
							>Less</small
						>
						<br />
					</template>
					<!-- <template v-else>
						Here will later be provided some description an image and the start + end Date
						<br />
						<br />
					</template> -->

					<small v-if="entity.infos.startDate || entity.infos.endDate" class="text-secondary"
						>{{ entity.infos.startDate }} - {{ entity.infos.endDate }}</small
					>
					<!-- <small v-else class="text-mute">- Get Ready for it</small> -->
				</p>
				<button @click="goAndWatch" class="btn btn-outline-primary btn-sm">Go & Watch</button>
				<!-- <router-link class="btn btn-outline-primary btn-sm" :to="'/watch?id=' + entity.ID">Go &
					Watch</router-link> -->

				<div v-if="authStore.user.role >= 2" class="d-flex">
					<p class="ms-auto text-secondary" style="margin-bottom: 0.1rem">ID: {{ entity.UUID }}</p>
				</div>
			</div>
			<div class="card-footer" :class="{ 'text-secondary': !entity.infos.disabled, 'text-danger': entity.infos.disabled }">
				{{ entityInfoString }}
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';

const props = defineProps({
	entity: { type: Object as PropType<Series>, required: true },
	highlighted: { type: Boolean, default: false },
});

const authStore = useAuthStore();
const indexStore = useIndexStore();

const showDescription = ref(false);

const descriptionLength = 125;

const buildCoverURL = computed(() => {
	const CURRENT_EXTERNAL_API = 'http://localhost:3000';
	const url = new URL(CURRENT_EXTERNAL_API + `/images/${props.entity.UUID}/cover.jpg`);

	url.searchParams.append('auth-token', authStore.authToken);

	return url.href;
});

const entityInfoString = computed(() => {
	if (props.entity.infos.disabled) {
		return 'Series Disabled';
	}
	return 'Needs to be implemented';
	// const moviePart = props.entity.movies.length >= 1 ? props.entity.movies.length + ' ' + (props.entity.movies.length > 1 ? 'Movies' : 'Movie') : '';
	// const seasonPart =
	// 	props.entity.seasons.length >= 1 ? props.entity.seasons.length + ' ' + (props.entity.seasons.length > 1 ? 'Seasons' : 'Season') : '';
	// return props.entity.movies.length >= 1 && props.entity.seasons.length >= 1 ? moviePart + ' | ' + seasonPart : moviePart + seasonPart;
});

const goAndWatch = () => {
	// $router.push({ path: '/watch', query: { id: props.entity.ID } });
	localStorage.setItem('lastSeriesRow', JSON.stringify({ ID: props.entity.UUID }));
};
</script>
<style scoped>
.read-more {
	color: var(--bs-link-color);
	text-decoration: underline;
	cursor: pointer;
}
</style>
