<template>
	<div class="col" style="content-visibility: auto" :id="entity.UUID">
		<div class="card" :class="{ 'border-success': highlighted }">
			<NuxtImg v-if="entity?.infos?.image" :placeholder="[238, 357]" :src="buildCoverURL" loading="lazy" />
			<NuxtImg v-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" loading="lazy" />
			<div class="card-body">
				<h4 class="card-title">{{ entity.infos?.title || entity.infos?.infos || entity.title }}</h4>
				<div class="card-text">
					<ElongatedText
						v-if="entity.infos.description"
						:text="entity.infos.description || 'No Description available yet...'"
						:max-length="125" />

					<small v-if="entity.infos.startDate || entity.infos.endDate" class="text-secondary"
						>{{ entity.infos.startDate }} - {{ entity.infos.endDate }}</small
					>
				</div>
				<button @click="goAndWatch" class="btn btn-outline-primary btn-sm">Go & Watch</button>

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

<script lang="ts" setup>
const authStore = useAuthStore();
const indexStore = useIndexStore();

const props = defineProps<{
	seriesID: string;
	highlighted?: boolean;
}>();

const entity = computed(() => {
	return indexStore.series.find((i) => i.UUID == props.seriesID)!;
});

const buildCoverURL = computed(() => {
	// const CURRENT_EXTERNAL_API = 'http://localhost:3000';
	const url = new URL('https://cinema-api.jodu555.de' + `/images/${props.seriesID}/cover.jpg`);

	url.searchParams.append('auth-token', 'SECR-DEV');

	return url.href;
});

const entityInfoString = computed(() => {
	if (entity.value.infos.disabled) {
		return 'Series Disabled';
	}
	const moviePart = entity.value.movies.length >= 1 ? entity.value.movies.length + ' ' + (entity.value.movies.length > 1 ? 'Movies' : 'Movie') : '';
	const seasonPart =
		entity.value.seasons.length >= 1 ? entity.value.seasons.length + ' ' + (entity.value.seasons.length > 1 ? 'Seasons' : 'Season') : '';
	return entity.value.movies.length >= 1 && entity.value.seasons.length >= 1 ? moviePart + ' | ' + seasonPart : moviePart + seasonPart;
});

const goAndWatch = () => {
	console.log('Go and watch', entity.value);

	useRouter().push({ path: '/watch/' + entity.value.UUID });
	localStorage.setItem('lastSeriesRow', JSON.stringify({ ID: entity.value.UUID }));

	// $router.push({ path: '/watch', query: { id: props.entity.ID } });
};
</script>

<style scoped></style>
