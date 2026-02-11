<template>
	<div class="row g-4 mb-4">
		<div class="col-sm-12 col-md-auto">
			<div class="d-flex justify-content-center">
				<img :src="coverURL" :alt="series.title" class="img-fluid rounded" style="width: 128px; height: 192px; object-fit: cover" />
			</div>
		</div>
		<!-- Right Column: Content -->
		<div class="col">
			<!-- VIEW MODE -->
			<div v-if="!isEditing">
				<h1 class="display-5 fw-bold mb-3 text-center text-sm-center text-md-start">
					{{ displayTitle }}
				</h1>

				<div class="d-flex flex-wrap align-items-center justify-content-center justify-content-sm-center justify-content-md-start gap-3 mb-3">
					<div>
						<span class="badge bg-secondary">{{ series.infos.startDate }}</span>
						<span v-if="series.infos.startDate?.length! > 0 && series.infos.endDate?.length! > 0" class="ms-1 me-1 h5">&rarr;</span>
						<span class="badge bg-secondary">{{ series.infos.endDate }}</span>
					</div>

					<div v-if="series.tags && series.tags.length > 0">
						<span class="badge bg-primary me-2" v-for="(tag, idx) in series.tags.slice(0, 5)" :key="idx">
							{{ idx == 0 ? tag.toUpperCase() : tag }}
						</span>
					</div>
				</div>

				<ElongatedText
					class="text-muted mb-4 text-center text-xs-center text-md-start"
					:text="series.infos.description || 'No Description available yet...'"
					:max-length="200"
				></ElongatedText>

				<div class="d-flex gap-3">
					<!-- Existing Button -->
					<AddToPlaylistDialog
						:item-u-u-i-d="series.UUID"
						:content-title="series.title"
						open-button-text="Add to Playlist"
						open-button-color="outline-primary"
					/>

					<!-- New Edit Button -->
					<button @click="enterEditMode" v-if="authStore.user.role >= Role.Mod" class="btn btn-outline-secondary">
						<font-awesome-icon :icon="['fas', 'pen-to-square']" class="me-2" />
						Edit
					</button>
				</div>
			</div>

			<!-- EDIT MODE -->
			<div v-else>
				<!-- Title Input -->
				<div class="mb-3">
					<label class="form-label text-muted small">Title</label>
					<input type="text" class="form-control form-control-lg fw-bold" v-model="editForm.title" />
				</div>

				<!-- Dates Row -->
				<div class="row g-2 mb-3">
					<div class="col-md-6">
						<label class="form-label text-muted small">Start Date</label>
						<input type="text" class="form-control" v-model="editForm.startDate" />
					</div>
					<div class="col-md-6">
						<label class="form-label text-muted small">End Date</label>
						<input type="text" class="form-control" v-model="editForm.endDate" />
					</div>
				</div>

				<!-- Tags Input -->
				<div class="mb-3">
					<label class="form-label text-muted small">Tags (comma separated)</label>
					<input type="text" class="form-control" placeholder="Action, Drama, 2024" v-model="editForm.tags" />
				</div>

				<!-- Description Textarea -->
				<div class="mb-3">
					<label class="form-label text-muted small">Description</label>
					<textarea class="form-control" rows="4" v-model="editForm.description"></textarea>
				</div>

				<h5>References</h5>
				<div class="mb-3" v-for="ref in ['aniworld', 'zoro', 'sto']">
					<input type="text" class="form-control" :placeholder="ref" v-model="editForm.refs[ref as 'aniworld' | 'zoro' | 'sto']" />
				</div>

				<!-- Action Buttons -->
				<div class="d-flex gap-3">
					<!-- Save Button -->
					<button @click="saveChanges" class="btn btn-outline-primary">
						<font-awesome-icon :icon="['fas', 'check']" class="me-2" />
						Save Changes
					</button>

					<!-- Cancel Button -->
					<button @click="cancelEdit" class="btn btn-outline-secondary">
						<font-awesome-icon :icon="['fas', 'xmark']" class="me-2" />
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { Role, type DetailedSeries, type FrontendSeries, type Series } from '@cinefinn/types/database';

const props = defineProps<{
	series: DetailedSeries | FrontendSeries;
	coverURL: string;
}>();

const authStore = useAuthStore();
const indexStore = useIndexStore();

const displayTitle = computed(() => props.series.infos.title || props.series.title);

const isEditing = ref(false);

// Temporary form data to avoid modifying the original series until "Save" is clicked
const editForm = ref({
	title: '',
	startDate: '',
	endDate: '',
	tags: '',
	description: '',
	refs: {
		aniworld: '',
		zoro: '',
		sto: '',
	},
});

// --- Methods ---

const enterEditMode = () => {
	// Populate form with current data
	editForm.value = {
		title: displayTitle.value!,
		startDate: props.series.infos.startDate || '',
		endDate: props.series.infos.endDate || '', // Added end date support
		// Convert tags array to comma-separated string for editing
		tags: props.series.tags ? props.series.tags.join(', ') : '',
		description: props.series.infos.description || '',
		refs: {
			aniworld: props.series.refs.aniworld || '',
			zoro: props.series.refs.zoro || '',
			sto: props.series.refs.sto || '',
		},
	};
	isEditing.value = true;
};

const cancelEdit = () => {
	isEditing.value = false;
};

const saveChanges = async () => {
	await indexStore.updateSeries(props.series.UUID, {
		tags: editForm.value.tags
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0),
		infos: {
			title: editForm.value.title,
			startDate: editForm.value.startDate,
			endDate: editForm.value.endDate,
			description: editForm.value.description,
		},
		refs: { ...props.series.refs, ...editForm.value.refs },
	});

	isEditing.value = false;
};
</script>

<style></style>
