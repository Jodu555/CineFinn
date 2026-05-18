<template>
	<div class="min-vh-100">
		<!-- Header -->
		<header class="sticky-top border-bottom shadow-sm" style="backdrop-filter: blur(10px)">
			<div class="container py-3">
				<div class="d-flex align-items-center justify-content-between">
					<div class="d-flex align-items-center gap-3">
						<NuxtLink class="btn btn-link text-decoration-none p-2" to="/">
							<font-awesome-icon :icon="['fas', 'arrow-left']" size="lg" />
						</NuxtLink>
						<h1 class="h3 mb-0 fw-bold text-primary">My Playlists</h1>
					</div>

					<button class="btn btn-primary" @click="createDialogOpen = true">
						<font-awesome-icon :icon="['fas', 'plus']" class="me-2" />
						Create Playlist
					</button>
				</div>
			</div>
		</header>

		<!-- <AddToPlaylistDialog :content-id="5" content-title="Test"></AddToPlaylistDialog> -->

		<main class="container py-4">
			<!-- Empty State -->
			<div v-if="playlists.length === 0" class="text-center py-5">
				<div
					class="bg-secondary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
					style="width: 96px; height: 96px"
				>
					<font-awesome-icon :icon="['fas', 'plus']" size="3x" class="text-secondary" />
				</div>
				<h2 class="h4 fw-bold mb-2">No Playlists Yet</h2>
				<p class="text-muted mb-4">Create your first playlist to organize your favorite content</p>
				<button class="btn btn-primary" @click="createDialogOpen = true">
					<font-awesome-icon :icon="['fas', 'plus']" class="me-2" />
					Create Your First Playlist
				</button>
			</div>

			<!-- Playlists Grid -->
			<div v-else class="row g-4">
				<!-- Playlists List -->
				<div class="col-lg-4">
					<h2 class="h5 fw-semibold mb-3">All Playlists ({{ playlists.length }})</h2>
					<div class="d-flex flex-column gap-3">
						<div
							v-for="playlist in playlists"
							:key="playlist.UUID"
							class="card cursor-pointer transition-all"
							:class="selectedPlaylistUUID === playlist.UUID ? 'border-primary bg-primary bg-opacity-10' : ''"
							@click="selectedPlaylistUUID = playlist.UUID"
							style="cursor: pointer"
						>
							<div class="card-body">
								<div class="d-flex align-items-start justify-content-between">
									<div class="flex-grow-1 overflow-hidden">
										<h3 class="h6 fw-semibold text-truncate mb-1">{{ playlist.name }}</h3>
										<p class="text-muted small mb-0">{{ playlist.items.length }} items</p>
									</div>
									<div class="d-flex gap-1 ms-2">
										<button class="btn btn-sm btn-link text-secondary p-1" @click.stop="editingPlaylist = { ...playlist }">
											<font-awesome-icon :icon="['fas', 'edit']" />
										</button>
										<button class="btn btn-sm btn-link text-danger p-1" @click.stop="deletePlaylistId = playlist.UUID">
											<font-awesome-icon :icon="['fas', 'trash']" />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Playlist Content -->
				<div class="col-lg-8">
					<div v-if="selectedPlaylist">
						<div class="mb-4">
							<h2 class="h4 fw-bold mb-2">{{ selectedPlaylist.name }}</h2>
							<p v-if="selectedPlaylist.description" class="text-muted">{{ selectedPlaylist.description }}</p>
							<p class="text-muted small mt-2">Created {{ formatDate(selectedPlaylist.created_at) }}</p>
						</div>

						<!-- Empty Playlist -->
						<div v-if="selectedPlaylist.items.length === 0" class="text-center py-5 border border-2 border-dashed rounded">
							<p class="text-muted mb-3">This playlist is empty</p>
							<NuxtLink class="btn btn-outline-primary" to="/">Browse Content</NuxtLink>
						</div>

						<!-- Playlist Items -->
						<div v-else class="row row-cols-2 row-cols-sm-3 row-cols-md-4 gap-4">
							<div v-for="item in selectedPlaylistItems" :key="item.UUID" class="col">
								<LandingSeriesCard
									:seriesItem="item"
									:show-remove-button="true"
									@add-to-list="handleRemoveFromPlaylist(selectedPlaylist.UUID, $event)"
									@show-info="watchItem"
									:fn-navigation="false"
									:to="`/watch/${item.UUID}`"
								/>
							</div>
						</div>
					</div>

					<!-- No Selection -->
					<div v-else class="text-center py-5">
						<p class="text-muted">Select a playlist to view its content</p>
					</div>
				</div>
			</div>
		</main>

		<!-- Create Playlist Modal -->
		<div class="modal fade" :class="{ show: createDialogOpen, 'd-block': createDialogOpen }" tabindex="-1" @click.self="createDialogOpen = false">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<div>
							<h5 class="modal-title">Create New Playlist</h5>
							<p class="text-muted small mb-0">Create a custom playlist to organize your favorite content</p>
						</div>
						<button type="button" class="btn-close" @click="createDialogOpen = false"></button>
					</div>
					<div class="modal-body">
						<div class="mb-3">
							<label for="new-playlist-name" class="form-label">Playlist Name</label>
							<input id="new-playlist-name" v-model="newPlaylistName" type="text" class="form-control" placeholder="My Awesome Playlist" />
						</div>
						<div class="mb-3">
							<label for="new-playlist-description" class="form-label">Description (Optional)</label>
							<textarea
								id="new-playlist-description"
								v-model="newPlaylistDescription"
								class="form-control"
								rows="3"
								placeholder="A collection of my favorite shows..."
							></textarea>
						</div>
						<button class="btn btn-primary w-100" :disabled="!newPlaylistName.trim()" @click="handleCreatePlaylist">Create Playlist</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Edit Playlist Modal -->
		<div class="modal fade" :class="{ show: !!editingPlaylist, 'd-block': !!editingPlaylist }" tabindex="-1" @click.self="editingPlaylist = null">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content" v-if="editingPlaylist">
					<div class="modal-header">
						<div>
							<h5 class="modal-title">Edit Playlist</h5>
							<p class="text-muted small mb-0">Update your playlist details</p>
						</div>
						<button type="button" class="btn-close" @click="editingPlaylist = null"></button>
					</div>
					<div class="modal-body">
						<div class="mb-3">
							<label for="edit-playlist-name" class="form-label">Playlist Name</label>
							<input id="edit-playlist-name" v-model="editingPlaylist.name" type="text" class="form-control" />
						</div>
						<div class="mb-3">
							<label for="edit-playlist-description" class="form-label">Description</label>
							<textarea id="edit-playlist-description" v-model="editingPlaylist.description" class="form-control" rows="3"></textarea>
						</div>
						<button class="btn btn-primary w-100" :disabled="!editingPlaylist.name.trim()" @click="handleUpdatePlaylist">Save Changes</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Delete Confirmation Modal -->
		<div class="modal fade" :class="{ show: !!deletePlaylistId, 'd-block': !!deletePlaylistId }" tabindex="-1" @click.self="deletePlaylistId = null">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Delete Playlist?</h5>
						<button type="button" class="btn-close" @click="deletePlaylistId = null"></button>
					</div>
					<div class="modal-body">
						<p class="text-muted">This action cannot be undone. This will permanently delete your playlist and remove all items from it.</p>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" @click="deletePlaylistId = null">Cancel</button>
						<button type="button" class="btn btn-danger" @click="handleDeletePlaylist">Delete</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal Backdrop -->
		<div v-if="createDialogOpen || editingPlaylist || deletePlaylistId" class="modal-backdrop fade show" @click="closeAllModals"></div>
	</div>
</template>

<script setup lang="ts">
import type { FrontendPlaylist, FrontendSeries } from '@cinefinn/types';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import LandingSeriesCard from '~/components/LandingSeriesCard.vue';

definePageMeta({
	middleware: 'auth',
});

useSeoMeta({
	title: 'Cinema | Playlists',
});

const playlistStore = usePlaylistStore();
const indexStore = useIndexStore();
await callOnce('loadPlaylists', async () => await playlistStore.loadPlaylists(), { mode: 'navigation' });

const router = useRouter();

const playlists = computed(() => playlistStore.playlists);
const selectedPlaylistUUID = ref<string>('');
const editingPlaylist = ref<FrontendPlaylist | null>(null);
const deletePlaylistId = ref<string | null>(null);
const createDialogOpen = ref(false);
const newPlaylistName = ref('');
const newPlaylistDescription = ref('');

const handleCreatePlaylist = async () => {
	if (!newPlaylistName.value.trim()) return;
	await playlistStore.createPlaylist(newPlaylistName.value, newPlaylistDescription.value);
	newPlaylistName.value = '';
	newPlaylistDescription.value = '';
	createDialogOpen.value = false;
};

const handleUpdatePlaylist = async () => {
	if (!editingPlaylist.value || !editingPlaylist.value.name.trim()) return;
	await playlistStore.updatePlaylist(editingPlaylist.value.UUID, {
		name: editingPlaylist.value.name,
		description: editingPlaylist.value.description,
	});
	editingPlaylist.value = null;
};

const handleDeletePlaylist = async () => {
	if (!deletePlaylistId.value) return;

	if (selectedPlaylist.value?.UUID === deletePlaylistId.value) {
		selectedPlaylistUUID.value = '';
	}
	await playlistStore.deletePlaylist(deletePlaylistId.value);
	deletePlaylistId.value = null;
};

const handleRemoveFromPlaylist = async (playlistId: string, itemUUID: string) => {
	await playlistStore.removeFromPlaylist(playlistId, itemUUID);
	if (selectedPlaylist.value?.UUID === playlistId) {
		// const updated = getPlaylists().find((p) => p.id === playlistId);
		// selectedPlaylist.value = updated || null;
	}
};

const selectedPlaylist = computed(() => {
	return playlists.value.find((p) => p.UUID === selectedPlaylistUUID.value);
});

const selectedPlaylistItems = computed(() => {
	return selectedPlaylist.value?.items
		.map((id) => {
			const series = indexStore.seriesById.get(id);
			return series;
		})
		.filter((item): item is FrontendSeries => item !== undefined);
});

const formatDate = (stamp: string | number): string => {
	const timestamp = typeof stamp === 'string' ? Number(stamp) : stamp;

	return new Date(timestamp).toLocaleString();
};

const watchItem = (itemUUID: string) => {
	router.push({
		path: `/watch/${itemUUID}`,
		query: {
			playlist: selectedPlaylistUUID.value,
		},
	});
};

const closeAllModals = () => {
	createDialogOpen.value = false;
	editingPlaylist.value = null;
	deletePlaylistId.value = null;
};
</script>

<style scoped>
.sticky-top {
	position: sticky;
	top: 0;
	z-index: 1010;
}

.cursor-pointer {
	cursor: pointer;
}

.transition-all {
	transition: all 0.3s ease;
}

.card:hover {
	background-color: rgba(0, 0, 0, 0.02);
}

.playlist-item-card {
	transition: all 0.3s ease;
}

.playlist-item-card:hover {
	transform: scale(1.05);
	box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}

.playlist-item-overlay {
	background-color: rgba(0, 0, 0, 0.6);
	opacity: 0;
	transition: opacity 0.3s ease;
}

.playlist-item-card:hover .playlist-item-overlay {
	opacity: 1;
}

.playlist-item-remove {
	opacity: 0;
	transition: opacity 0.3s ease;
}

.playlist-item-card:hover .playlist-item-remove {
	opacity: 1;
}

.modal.show {
	display: block;
}

.modal-backdrop {
	background-color: rgba(0, 0, 0, 0.5);
}
</style>
