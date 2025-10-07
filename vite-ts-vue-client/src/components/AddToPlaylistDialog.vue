<template>
	<div>
		<!-- Trigger Button or Custom Trigger -->
		<div>
			<slot name="trigger">
				<button class="btn btn-outline-secondary bg-transparent" @click="open = true">
					<font-awesome-icon :icon="['fas', 'plus']" class="me-2" />
					Add to Playlist
				</button>
			</slot>
		</div>

		<!-- Modal -->
		<div class="modal fade" :class="{ show: open, 'd-block': open }" tabindex="-1" @click.self="closeModal">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
					<div class="modal-header">
						<div>
							<h5 class="modal-title">Add to Playlist</h5>
							<p class="text-muted small mb-0">Add "{{ contentTitle }}" to your playlists</p>
						</div>
						<button type="button" class="btn-close" @click="closeModal"></button>
					</div>
					<div class="modal-body">
						<!-- Playlist Selection View -->
						<div v-if="!showCreateForm">
							<div class="playlist-scroll-area mb-3" style="max-height: 320px; overflow-y: auto">
								<!-- Empty State -->
								<div v-if="playlists.length === 0" class="text-center py-5">
									<p class="text-muted small">No playlists yet. Create your first one!</p>
								</div>

								<!-- Playlist List -->
								<div v-else class="d-flex flex-column gap-2">
									<div
										v-for="playlist in playlists"
										:key="playlist.id"
										class="d-flex align-items-center justify-content-between p-3 rounded border playlist-item">
										<div class="flex-grow-1 overflow-hidden me-2">
											<h6 class="fw-medium small mb-1 text-truncate">{{ playlist.name }}</h6>
											<p class="text-muted mb-0" style="font-size: 0.75rem">{{ playlist.itemIds.length }} items</p>
										</div>
										<button
											class="btn btn-sm"
											:class="isInPlaylist(playlist.id, contentId) ? 'btn-primary' : 'btn-outline-primary'"
											@click="handleTogglePlaylist(playlist.id)">
											<font-awesome-icon
												:icon="['fas', isInPlaylist(playlist.id, contentId) ? 'check' : 'plus']"
												class="me-1"
												size="sm" />
											{{ isInPlaylist(playlist.id, contentId) ? 'Added' : 'Add' }}
										</button>
									</div>
								</div>
							</div>

							<button class="btn btn-outline-primary w-100" @click="showCreateForm = true">
								<font-awesome-icon :icon="['fas', 'plus']" class="me-2" />
								Create New Playlist
							</button>
						</div>

						<!-- Create Playlist Form -->
						<div v-else>
							<div class="mb-3">
								<label for="playlist-name" class="form-label">Playlist Name</label>
								<input
									id="playlist-name"
									v-model="newPlaylistName"
									type="text"
									class="form-control"
									placeholder="My Awesome Playlist" />
							</div>

							<div class="mb-3">
								<label for="playlist-description" class="form-label">Description (Optional)</label>
								<textarea
									id="playlist-description"
									v-model="newPlaylistDescription"
									class="form-control"
									rows="3"
									placeholder="A collection of my favorite shows..."></textarea>
							</div>

							<div class="d-flex gap-2">
								<button class="btn btn-primary flex-grow-1" :disabled="!newPlaylistName.trim()" @click="handleCreatePlaylist">
									Create & Add
								</button>
								<button class="btn btn-outline-secondary" @click="showCreateForm = false">Cancel</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Modal Backdrop -->
		<div v-if="open" class="modal-backdrop fade show" @click="closeModal"></div>
	</div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { getPlaylists, savePlaylist, addToPlaylist, removeFromPlaylist, isInPlaylist } from '@/utils/playlist-manager';
import type { Playlist } from '@/utils/playlist-manager';

interface Props {
	contentId: number;
	contentTitle: string;
}

const props = defineProps<Props>();

const open = ref(false);
const playlists = ref<Playlist[]>([]);
const showCreateForm = ref(false);
const newPlaylistName = ref('');
const newPlaylistDescription = ref('');

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
		itemIds: [props.contentId],
	};

	savePlaylist(newPlaylist);
	newPlaylistName.value = '';
	newPlaylistDescription.value = '';
	showCreateForm.value = false;
	loadPlaylists();
};

const handleTogglePlaylist = (playlistId: string) => {
	if (isInPlaylist(playlistId, props.contentId)) {
		removeFromPlaylist(playlistId, props.contentId);
	} else {
		addToPlaylist(playlistId, props.contentId);
	}
	loadPlaylists();
};

const closeModal = () => {
	open.value = false;
};

// Watch for modal open/close
watch(open, (isOpen) => {
	if (isOpen) {
		loadPlaylists();
		showCreateForm.value = false;
	}
});
</script>

<style scoped>
.modal.show {
	display: block;
}

.modal-backdrop {
	background-color: rgba(0, 0, 0, 0.5);
}

.playlist-item {
	transition: background-color 0.2s ease;
}

.playlist-item:hover {
	background-color: rgba(0, 0, 0, 0.02);
}

.playlist-scroll-area::-webkit-scrollbar {
	width: 8px;
}

.playlist-scroll-area::-webkit-scrollbar-track {
	background: #f1f1f1;
	border-radius: 4px;
}

.playlist-scroll-area::-webkit-scrollbar-thumb {
	background: #888;
	border-radius: 4px;
}

.playlist-scroll-area::-webkit-scrollbar-thumb:hover {
	background: #555;
}
</style>
