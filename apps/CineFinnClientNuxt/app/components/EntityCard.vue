<template>
	<div class="col" style="content-visibility: auto; contain: content; will-change: transform" :id="entity.UUID" @click="clicked">
		<div class="card" :class="{ 'border-success': highlighted }">
			<!-- <pre>{{ decideSeriesImage(entity, randomNumber) }}</pre> -->
			<div v-if="!props.serverRendered">
				<OptimizedNuxtImg
					style="width: 100%; height: 100%"
					:width="'100%'"
					:height="'100%'"
					:src="decideSeriesImage(entity, randomNumber)"
					root-margin="500px"
					placeholder-height="400px"
					class="entitycard-img"
					:eager="isAboveFold" />
			</div>
			<div v-else>
				<LazyOptimizedNuxtImg
					:src="decideSeriesImage(entity, randomNumber)"
					loading="lazy"
					root-margin="100px"
					style="width: 100%; height: 100%"
					:width="'100%'"
					:height="'100%'"
					:eager="isAboveFold" />
			</div>

			<!-- <LazyOptimizedNuxtImg v-if="entity?.infos?.image" :src="buildCoverURL" loading="lazy" root-margin="100px"
				style="width: 100%; height: 100%" :width="'100%'" :height="'100%'" />
			<LazyOptimizedNuxtImg v-else-if="entity?.infos?.imageURL" :src="entity.infos.imageURL" loading="lazy"
				root-margin="100px" style="width: 100%; height: 100%" :width="'100%'" :height="'100%'" />

			<OptimizedNuxtImg v-else-if="!props.serverRendered" style="width: 100%; height: 100%" :width="'100%'"
				:height="'100%'" :src="`https://picsum.photos/seed/movie${randomNumber}/300/400`" root-margin="500px"
				placeholder-height="400px" class="entitycard-img" />

			<div v-else class="entitycard-img">
				<img :style="imgStyle" :src="`https://picsum.photos/seed/movie${randomNumber}/300/400`">
			</div> -->

			<div class="card-body" v-if="props.showBody" v-auto-animate>
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

				<div class="d-flex justify-content-between">
					<!-- <button @click="goAndWatch" class="btn btn-outline-primary btn-sm">Go & Watch</button> -->
					<nuxt-link class="btn btn-outline-primary btn-sm mt-1 mb-2" :prefetch-on="{ interaction: true }" :to="`/watch/${entity.UUID}`"
						>Go & Watch</nuxt-link
					>

					<!-- <AddToPlaylistDialog :item-u-u-i-d="entity.UUID" :content-title="entity.title" open-button-text=""
						open-button-color="outline-primary" icon-size="sm" /> -->
					<div>
						<button class="btn bg-transparent btn-outline-primary" @click="addToPlaylist()" title="Add To Playlist">
							<font-awesome-icon :icon="['fas', 'plus']" size="sm" />
						</button>
					</div>
				</div>

				<div v-if="authStore.user.role >= 2" class="d-flex">
					<p class="ms-auto text-secondary" style="margin-bottom: 0.1rem">ID: {{ entity.UUID }}</p>
				</div>

				<button v-if="authStore.user.role >= 2" type="button" class="btn btn-outline-info btn-sm" @click="toggleEdit()">
					<font-awesome-icon :icon="['fa-solid', 'fa-pen']" size="lg" />
				</button>

				<div v-if="editing">
					<hr />
					<form @submit.prevent="saveEditObject">
						<h5>References:</h5>
						<div class="mb-3">
							<input type="text" v-model="editObject.refs.aniworld" class="form-control" placeholder="Aniworld" />
						</div>
						<div class="mb-3">
							<input type="text" v-model="editObject.refs.zoro" class="form-control" placeholder="Zoro" />
						</div>
						<div class="mb-3">
							<input type="text" v-model="editObject.refs.sto" class="form-control" placeholder="STO" />
						</div>
						<h5>Infos:</h5>
						<div class="mb-3">
							<label for="title" class="form-label">Title</label>
							<input type="text" v-model="editObject.infos.infos" class="form-control" id="title" placeholder="Title" />
						</div>

						<label for="" class="form-label">Start / End - Date</label>
						<div class="row mb-3">
							<div class="col">
								<input type="text" v-model="editObject.infos.startDate" class="form-control" placeholder="Start" />
							</div>
							<div class="col">
								<input type="text" v-model="editObject.infos.endDate" class="form-control" placeholder="End" />
							</div>
						</div>

						<div v-if="editObject.infos.image != null" class="form-check mb-3">
							<input class="form-check-input" type="checkbox" v-model="editObject.infos.image" />
							<label class="form-check-label" for=""> Has Image </label>
						</div>
						<div v-if="editObject.infos.imageURL != null" class="mb-3">
							<label for="imgurl" class="form-label">Image Url</label>
							<input type="text" v-model="editObject.infos.imageURL" class="form-control" id="imgurl" placeholder="ImageUrl" />
						</div>

						<div class="mb-5">
							<label for="" class="form-label">Description</label>
							<textarea v-model="editObject.infos.description" class="form-control" id="description" rows="3"></textarea>
						</div>

						<div class="mb-3 p-1 border border-warning-subtle rounded">
							<label for="title" class="form-label text-danger">InnerTitle</label>
							<input type="text" v-model="editObject.title" class="form-control" id="innerTitle" placeholder="innerTitle" />
						</div>

						<div class="d-flex">
							<button @click="toggleEdit()" type="button" class="btn btn-outline-danger">Cancel</button>
							<button type="submit" class="ms-auto btn btn-outline-success">Save</button>
						</div>
					</form>
				</div>
			</div>
			<div
				v-if="props.showFooter"
				class="card-footer"
				:class="{ 'text-secondary': !entity.infos.disabled, 'text-danger': entity.infos.disabled }">
				{{ entityInfoString }}
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
const authStore = useAuthStore();
const indexStore = useIndexStore();
const { decideSeriesImage } = useSeriesImage();

const props = withDefaults(
	defineProps<{
		seriesID: string;
		highlighted?: boolean;
		showBody?: boolean;
		showFooter?: boolean;
		beClickable?: boolean;
		serverRendered?: boolean;
		index?: number;
	}>(),
	{
		highlighted: false,
		showBody: true,
		showFooter: true,
		beClickable: false,
		serverRendered: false,
		index: 0,
	},
);

const isAboveFold = computed(() => props.index < 10);

const emit = defineEmits(['addToPlaylist']);

const addToPlaylist = () => {
	emit('addToPlaylist', props.seriesID);
};

const entity = computed(() => {
	return indexStore.seriesById.get(props.seriesID)!;
});

const editing = ref(false);
const editObject = ref({
	infos: {
		infos: '',
		startDate: '',
		endDate: '',
		image: false,
		imageURL: '',
		description: '',
	},
	refs: {
		aniworld: '',
		zoro: '',
		sto: '',
	},
	tags: [] as string[],
	title: '',
});

const toggleEdit = () => {
	if (editing.value === false) {
		if (entity.value) {
			editObject.value = {
				infos: {
					infos: entity.value.infos.infos || '',
					startDate: entity.value.infos.startDate || '',
					endDate: entity.value.infos.endDate || '',
					image: entity.value.infos.image || false,
					imageURL: entity.value.infos.imageURL || '',
					description: entity.value.infos.description || '',
				},
				refs: {
					aniworld: entity.value.refs.aniworld || '',
					zoro: entity.value.refs.zoro || '',
					sto: entity.value.refs.sto || '',
				},
				tags: entity.value.tags,
				title: entity.value.title,
			};
		}
	}

	editing.value = !editing.value;
};

const saveEditObject = async () => {
	await indexStore.updateSeries(entity.value.UUID, editObject.value);
	toggleEdit();
};

const imgStyle = computed(
	() =>
		isHydrated.value
			? { width: '100%', height: '100%' } // client after hydration
			: { width: '300px', height: '400px' }, // server / initial
);

const isHydrated = ref(false);
onMounted(() => {
	isHydrated.value = true;
});

const randomNumber = useState('randomNumber' + props.seriesID, () => Math.floor(Math.random() * 1000));

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

function clicked() {
	if (props.beClickable) {
		goAndWatch();
	}
}

const goAndWatch = () => {
	console.log('Go and watch', entity.value);

	useRouter().push({ path: '/watch/' + entity.value.UUID });
	localStorage.setItem('lastSeriesRow', JSON.stringify({ ID: entity.value.UUID }));

	// $router.push({ path: '/watch', query: { id: props.entity.ID } });
};
</script>

<style scoped>
.entity-card-img {
	width: 100%;
	aspect-ratio: 16 / 9;
	/* or compute from props width/height */
	object-fit: cover;
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
}
</style>
