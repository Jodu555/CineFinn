<template>
	<div class="min-vh-100">
		<!-- Header -->
		<header class="sticky-top border-bottom shadow-sm" style="backdrop-filter: blur(10px)">
			<div class="container py-3">
				<div class="d-flex align-items-center justify-content-between">
					<div class="d-flex align-items-center gap-3">
						<button class="btn btn-link text-decoration-none p-2" @click="goBack">
							<font-awesome-icon :icon="['fas', 'arrow-left']" size="lg" />
						</button>
						<h1 class="h3 mb-0 fw-bold text-primary">My Playlists</h1>
					</div>

					<button class="btn btn-primary" @click="createDialogOpen = true">
						<font-awesome-icon :icon="['fas', 'plus']" class="me-2" />
						Create Playlist
					</button>
				</div>
			</div>
		</header>

		<AddToPlaylistDialog :content-id="5" content-title="Test"></AddToPlaylistDialog>

		<main class="container py-4">
			<!-- Empty State -->
			<div v-if="playlists.length === 0" class="text-center py-5">
				<div
					class="bg-secondary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
					style="width: 96px; height: 96px">
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
							:key="playlist.id"
							class="card cursor-pointer transition-all"
							:class="selectedPlaylist?.id === playlist.id ? 'border-primary bg-primary bg-opacity-10' : ''"
							@click="selectedPlaylist = playlist"
							style="cursor: pointer">
							<div class="card-body">
								<div class="d-flex align-items-start justify-content-between">
									<div class="flex-grow-1 overflow-hidden">
										<h3 class="h6 fw-semibold text-truncate mb-1">{{ playlist.name }}</h3>
										<p class="text-muted small mb-0">{{ playlist.itemIds.length }} items</p>
									</div>
									<div class="d-flex gap-1 ms-2">
										<button class="btn btn-sm btn-link text-secondary p-1" @click.stop="editingPlaylist = { ...playlist }">
											<font-awesome-icon :icon="['fas', 'edit']" />
										</button>
										<button class="btn btn-sm btn-link text-danger p-1" @click.stop="deletePlaylistId = playlist.id">
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
							<p class="text-muted small mt-2">Created {{ formatDate(selectedPlaylist.createdAt) }}</p>
						</div>

						<!-- Empty Playlist -->
						<div v-if="selectedPlaylist.itemIds.length === 0" class="text-center py-5 border border-2 border-dashed rounded">
							<p class="text-muted mb-3">This playlist is empty</p>
							<button class="btn btn-outline-primary" @click="goBack">Browse Content</button>
						</div>

						<!-- Playlist Items -->
						<div v-else class="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-3">
							<div v-for="item in getPlaylistItems(selectedPlaylist)" :key="item.id" class="col">
								<div class="card border-0 shadow-sm position-relative playlist-item-card">
									<div class="position-relative overflow-hidden rounded">
										<img
											:src="item.cover || '/placeholder.svg'"
											:alt="item.title"
											class="card-img-top"
											style="aspect-ratio: 230/346; object-fit: cover" />
										<div
											class="playlist-item-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center">
											<button
												class="btn btn-secondary rounded-circle"
												style="width: 48px; height: 48px"
												@click="watchItem(item.id)">
												<font-awesome-icon :icon="['fas', 'play']" />
											</button>
										</div>
										<div class="position-absolute top-0 end-0 m-2 playlist-item-remove">
											<button
												class="btn btn-secondary btn-sm rounded-circle"
												style="width: 32px; height: 32px"
												@click.stop="handleRemoveFromPlaylist(selectedPlaylist.id, item.id)">
												<font-awesome-icon :icon="['fas', 'trash']" size="sm" />
											</button>
										</div>
										<span class="badge bg-primary position-absolute top-0 start-0 m-2">
											{{ item.type.toUpperCase() }}
										</span>
									</div>
								</div>
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
							<input
								id="new-playlist-name"
								v-model="newPlaylistName"
								type="text"
								class="form-control"
								placeholder="My Awesome Playlist" />
						</div>
						<div class="mb-3">
							<label for="new-playlist-description" class="form-label">Description (Optional)</label>
							<textarea
								id="new-playlist-description"
								v-model="newPlaylistDescription"
								class="form-control"
								rows="3"
								placeholder="A collection of my favorite shows..."></textarea>
						</div>
						<button class="btn btn-primary w-100" :disabled="!newPlaylistName.trim()" @click="handleCreatePlaylist">
							Create Playlist
						</button>
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
						<button class="btn btn-primary w-100" :disabled="!editingPlaylist.name.trim()" @click="handleUpdatePlaylist">
							Save Changes
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Delete Confirmation Modal -->
		<div
			class="modal fade"
			:class="{ show: !!deletePlaylistId, 'd-block': !!deletePlaylistId }"
			tabindex="-1"
			@click.self="deletePlaylistId = null">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Delete Playlist?</h5>
						<button type="button" class="btn-close" @click="deletePlaylistId = null"></button>
					</div>
					<div class="modal-body">
						<p class="text-muted">
							This action cannot be undone. This will permanently delete your playlist and remove all items from it.
						</p>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getPlaylists, savePlaylist, deletePlaylist, removeFromPlaylist } from '@/utils/playlist-manager';
import type { Playlist } from '@/utils/playlist-manager';
import AddToPlaylistDialog from '@/components/AddToPlaylistDialog.vue';

const router = useRouter();

interface StreamingContent {
	id: number;
	title: string;
	year: number;
	type: string;
	cover: string;
	rating: number;
}

const streamingContent: StreamingContent[] = [
	{
		id: 1,
		title: 'Irregular at Magic High School',
		year: 5555,
		type: 'anime',
		cover: 'https://cinema-api.jodu555.de/images/814f331c/cover.jpg?auth-token=f59e638d-8927-46ab-9759-81d6fc98dfa5',
		rating: 10,
	},
	{
		id: 2,
		title: 'The Honor at Magic High School',
		year: 5555,
		type: 'anime',
		cover: 'https://cinema-api.jodu555.de/images/325ec6e5/cover.jpg?auth-token=f59e638d-8927-46ab-9759-81d6fc98dfa5',
		rating: 10,
	},
];

const playlists = ref<Playlist[]>([]);
const selectedPlaylist = ref<Playlist | null>(null);
const editingPlaylist = ref<Playlist | null>(null);
const deletePlaylistId = ref<string | null>(null);
const createDialogOpen = ref(false);
const newPlaylistName = ref('');
const newPlaylistDescription = ref('');

onMounted(() => {
	loadPlaylists();
});

const loadPlaylists = () => {
	playlists.value = getPlaylists();
};

const handleCreatePlaylist = () => {
	if (!newPlaylistName.value.trim()) return;

	const newPlaylist: Playlist = {
		id: `playlist-${Date.now()}`,
		name: newPlaylistName.value,
		description: newPlaylistDescription.value,
		createdAt: new Date().toISOString(),
		itemIds: [1, 2],
	};

	savePlaylist(newPlaylist);
	newPlaylistName.value = '';
	newPlaylistDescription.value = '';
	createDialogOpen.value = false;
	loadPlaylists();
};

const handleUpdatePlaylist = () => {
	if (!editingPlaylist.value || !editingPlaylist.value.name.trim()) return;

	savePlaylist(editingPlaylist.value);
	if (selectedPlaylist.value?.id === editingPlaylist.value.id) {
		selectedPlaylist.value = editingPlaylist.value;
	}
	editingPlaylist.value = null;
	loadPlaylists();
};

const handleDeletePlaylist = () => {
	if (!deletePlaylistId.value) return;

	deletePlaylist(deletePlaylistId.value);
	if (selectedPlaylist.value?.id === deletePlaylistId.value) {
		selectedPlaylist.value = null;
	}
	deletePlaylistId.value = null;
	loadPlaylists();
};

const handleRemoveFromPlaylist = (playlistId: string, itemId: number) => {
	removeFromPlaylist(playlistId, itemId);
	loadPlaylists();
	if (selectedPlaylist.value?.id === playlistId) {
		const updated = getPlaylists().find((p) => p.id === playlistId);
		selectedPlaylist.value = updated || null;
	}
};

const getPlaylistItems = (playlist: Playlist): StreamingContent[] => {
	return playlist.itemIds
		.map((id) => streamingContent.find((item) => item.id === id))
		.filter((item): item is StreamingContent => item !== undefined);
};

const formatDate = (dateString: string): string => {
	return new Date(dateString).toLocaleDateString();
};

const goBack = () => {
	router.push('/');
};

const watchItem = (itemId: number) => {
	router.push(`/watch/${itemId}`);
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
