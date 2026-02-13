<template>
	<div class="container-fluid py-4">
		<div class="row">
			<!-- Sidebar: List of Caches -->
			<div class="col-md-3">
				<div class="card bg-dark border-secondary mb-3">
					<div class="card-header d-flex justify-content-between align-items-center">
						<span>
							<font-awesome-icon :icon="['fas', 'database']" class="me-2 text-info" />
							Caches
						</span>
						<span class="badge bg-secondary">{{ cacheNames.length }}</span>
					</div>
					<div class="list-group list-group-flush">
						<button
							v-for="name in cacheNames"
							:key="name"
							:class="['list-group-item', 'list-group-item-action', selectedCache === name ? 'active' : 'bg-dark text-light border-secondary']"
							@click="selectCache(name)"
						>
							<font-awesome-icon :icon="['fas', 'folder']" class="me-2" />
							{{ name }}
						</button>
						<div v-if="pendingCaches" class="text-center p-3">
							<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Middle: Keys List -->
			<div class="col-md-4">
				<div class="card bg-dark border-secondary" v-if="selectedCache">
					<div class="card-header d-flex justify-content-between align-items-center">
						<span>
							<font-awesome-icon :icon="['fas', 'key']" class="me-2 text-warning" />
							Keys
						</span>
						<div>
							<button class="btn btn-sm btn-outline-info me-2" @click="loadKeys" :disabled="pendingKeys">
								<font-awesome-icon :icon="['fas', 'rotate']" />
							</button>
							<button class="btn btn-sm btn-outline-danger" @click="clearCurrentCache" :disabled="!authStore.user || authStore.user.role < 2">
								<font-awesome-icon :icon="['fas', 'bomb']" />
							</button>
						</div>
					</div>
					<div class="card-body p-0" style="max-height: 70vh; overflow-y: auto">
						<ul class="list-group list-group-flush">
							<li
								v-for="key in keys"
								:key="key"
								:class="[
									'list-group-item',
									'd-flex',
									'justify-content-between',
									'align-items-center',
									selectedKey === key ? 'active' : 'bg-dark text-light border-secondary',
								]"
								style="cursor: pointer"
								@click="selectKey(key)"
							>
								<span class="text-truncate" style="max-width: 80%">{{ key }}</span>
								<button
									class="btn btn-sm btn-outline-danger border-0"
									@click.stop="deleteKey(key)"
									:disabled="!authStore.user || authStore.user.role < 2"
								>
									<font-awesome-icon :icon="['fas', 'trash']" />
								</button>
							</li>
						</ul>
						<div v-if="pendingKeys" class="text-center p-3">
							<div class="spinner-border text-secondary" role="status"></div>
						</div>
						<div v-if="!pendingKeys && keys.length === 0" class="text-center text-muted p-3">No keys found.</div>
					</div>
					<div class="card-footer bg-dark border-secondary">
						<div class="input-group">
							<input
								type="text"
								class="form-control form-control-sm bg-dark text-light border-secondary"
								v-model="newKeyInput"
								placeholder="New key name..."
							/>
							<button class="btn btn-sm btn-success" @click="createNewKey" :disabled="!newKeyInput || !authStore.user || authStore.user.role < 2">
								<font-awesome-icon :icon="['fas', 'plus']" />
							</button>
						</div>
					</div>
				</div>
				<div v-else class="text-center text-muted mt-5">
					<font-awesome-icon :icon="['fas', 'hand-point-left']" size="2x" class="mb-2" />
					<p>Select a cache to view keys</p>
				</div>
			</div>

			<!-- Right: Content Editor -->
			<div class="col-md-5">
				<div class="card bg-dark border-secondary" v-if="selectedKey">
					<div class="card-header">
						<font-awesome-icon :icon="['fas', 'code']" class="me-2 text-success" />
						Content: <code>{{ selectedKey }}</code>
					</div>
					<div class="card-body">
						<textarea
							v-model="contentData"
							class="form-control bg-dark text-light border-secondary font-monospace"
							rows="15"
							:disabled="pendingContent"
						></textarea>
						<div v-if="parseError" class="alert alert-danger mt-2 py-1 px-2 small">
							<font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="me-1" />
							{{ parseError }}
						</div>
					</div>
					<div class="card-footer d-flex justify-content-between align-items-center bg-dark border-secondary">
						<small class="text-muted">
							<font-awesome-icon :icon="['fas', 'info-circle']" class="me-1" />
							Edit JSON value above
						</small>
						<button
							class="btn btn-primary"
							@click="saveItem"
							:disabled="!isJsonValid || pendingContent || !authStore.user || authStore.user.role < 2"
						>
							<font-awesome-icon :icon="['fas', 'save']" class="me-1" />
							Save Changes
						</button>
					</div>
				</div>
				<div v-else class="text-center text-muted mt-5">
					<font-awesome-icon :icon="['fas', 'file-code']" size="2x" class="mb-2" />
					<p>Select a key to view content</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import useAPIURL from '~/hooks/useAPIURL';

definePageMeta({
	middleware: 'auth',
});

const authStore = useAuthStore();
// Access $swal from Nuxt context
const { $swal } = useNuxtApp();

// --- State ---
const selectedCache = ref<string | null>(null);
const selectedKey = ref<string | null>(null);
const keys = ref<string[]>([]);
const contentData = ref<string>('');
const newKeyInput = ref('');
const parseError = ref<string | null>(null);

// --- Dark Mode Swal Config Helper ---
// This ensures swal popups match your bootstrap dark theme
const swalDarkConfig = {
	background: '#212529',
	color: '#f8f9fa',
	confirmButtonColor: '#0d6efd',
	cancelButtonColor: '#6c757d',
};

// --- API Fetching ---

// 1. Fetch all cache names
const { data: cacheNames, pending: pendingCaches } = await useFetch<string[]>(`${useAPIURL()}/admin/cache/caches`, {
	headers: {
		'auth-token': authStore.authToken,
	},
	default: () => [],
});

// async function apiFetch<T>(url: string, options: RequestInit = {}) {
// 	const res = await $fetch(url, {

// 		...options,
// 		headers: {
// 			'Content-Type': 'application/json',
// 			'auth-token': authStore.authToken,
// 			...options.headers,
// 		},
// 	});
// 	if (!res.ok) {
// 		const errData = await res.json().catch(() => ({}));
// 		throw new Error(errData.message || 'Request failed');
// 	}
// 	return res.json();
// }

const pendingKeys = ref(false);

async function selectCache(name: string) {
	selectedCache.value = name;
	selectedKey.value = null;
	contentData.value = '';
	await loadKeys();
}

async function loadKeys() {
	if (!selectedCache.value) return;
	pendingKeys.value = true;
	try {
		const res = await $fetch<{ status: string; data: string[] }>(`${useAPIURL()}/admin/cache/caches/${selectedCache.value}/keys`, {
			headers: {
				'auth-token': authStore.authToken,
			},
		});
		keys.value = res.data || [];
	} catch (e: any) {
		$swal.fire({
			title: 'Error',
			text: 'Failed to load keys: ' + e.message,
			icon: 'error',
			...swalDarkConfig,
		});
		keys.value = [];
	} finally {
		pendingKeys.value = false;
	}
}

const pendingContent = ref(false);

async function selectKey(key: string) {
	selectedKey.value = key;
	pendingContent.value = true;
	parseError.value = null;
	try {
		const res = await $fetch<{ status: string; data: any }>(
			`${useAPIURL()}/admin/cache/caches/${selectedCache.value}/items/${encodeURIComponent(key)}`,
			{
				headers: {
					'auth-token': authStore.authToken,
				},
			},
		);
		contentData.value = JSON.stringify(res.data, null, 2);
	} catch (e: any) {
		$swal.fire({
			title: 'Error',
			text: 'Failed to load item: ' + e.message,
			icon: 'error',
			...swalDarkConfig,
		});
		contentData.value = '';
	} finally {
		pendingContent.value = false;
	}
}

async function saveItem() {
	if (!selectedCache.value || !selectedKey.value || !isJsonValid.value) return;

	try {
		await $fetch(`${useAPIURL()}/admin/cache/caches/${selectedCache.value}/items/${encodeURIComponent(selectedKey.value)}`, {
			method: 'POST',
			body: JSON.stringify(contentData.value),
			headers: {
				'auth-token': authStore.authToken,
			},
		});

		$swal.fire({
			title: 'Saved!',
			text: 'Item has been updated successfully.',
			icon: 'success',
			timer: 1500,
			showConfirmButton: false,
			...swalDarkConfig,
		});
	} catch (e: any) {
		$swal.fire({
			title: 'Save Failed',
			text: e.message,
			icon: 'error',
			...swalDarkConfig,
		});
	}
}

async function deleteKey(key: string) {
	// Using the requested Swal syntax
	const { isConfirmed: confirmed } = await $swal.fire({
		title: 'Delete Key?',
		text: `Are you sure you want to delete key "${key}"?`,
		icon: 'warning',
		showCancelButton: true,
		cancelButtonText: 'No',
		confirmButtonText: 'Yes, delete it!',
		...swalDarkConfig,
	});

	if (confirmed) {
		try {
			await $fetch(`${useAPIURL()}/admin/cache/caches/${selectedCache.value}/items/${encodeURIComponent(key)}`, {
				method: 'DELETE',
				headers: {
					'auth-token': authStore.authToken,
				},
			});

			keys.value = keys.value.filter((k) => k !== key);
			if (selectedKey.value === key) {
				selectedKey.value = null;
				contentData.value = '';
			}

			$swal.fire({
				title: 'Deleted',
				text: 'Key has been removed.',
				icon: 'success',
				timer: 1500,
				showConfirmButton: false,
				...swalDarkConfig,
			});
		} catch (e: any) {
			$swal.fire({
				title: 'Error',
				text: 'Failed to delete: ' + e.message,
				icon: 'error',
				...swalDarkConfig,
			});
		}
	}
}

async function createNewKey() {
	if (!newKeyInput.value) return;
	await loadKeys();
	selectKey(newKeyInput.value);
	newKeyInput.value = '';
}

async function clearCurrentCache() {
	if (!selectedCache.value) return;

	const { isConfirmed: confirmed } = await $swal.fire({
		title: 'Clear Cache?',
		text: `This will delete ALL keys in "${selectedCache.value}". This cannot be undone.`,
		icon: 'error',
		showCancelButton: true,
		cancelButtonText: 'Cancel',
		confirmButtonText: 'Yes, clear cache!',
		...swalDarkConfig,
	});

	if (confirmed) {
		try {
			await $fetch(`${useAPIURL()}/admin/cache/caches/${selectedCache.value}`, {
				method: 'DELETE',
				headers: {
					'auth-token': authStore.authToken,
				},
			});

			keys.value = [];
			selectedKey.value = null;
			contentData.value = '';

			$swal.fire({
				title: 'Cleared',
				text: 'Cache has been emptied.',
				icon: 'success',
				timer: 1500,
				showConfirmButton: false,
				...swalDarkConfig,
			});
		} catch (e: any) {
			$swal.fire({
				title: 'Error',
				text: 'Failed to clear cache: ' + e.message,
				icon: 'error',
				...swalDarkConfig,
			});
		}
	}
}

// --- Computed ---
const isJsonValid = computed(() => {
	if (!contentData.value) return true;
	try {
		JSON.parse(contentData.value);
		parseError.value = null;
		return true;
	} catch (e: any) {
		parseError.value = e.message;
		return false;
	}
});
</script>

<style>
/* Ensuring scrollbars fit dark theme */
::-webkit-scrollbar {
	width: 8px;
}
::-webkit-scrollbar-track {
	background: #212529;
}
::-webkit-scrollbar-thumb {
	background: #495057;
	border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
	background: #6c757d;
}

.card-header,
.card-footer {
	background-color: rgba(0, 0, 0, 0.2);
}

.list-group-item-action.active {
	background-color: #0d6efd;
	border-color: #0d6efd;
	color: white;
}
</style>
