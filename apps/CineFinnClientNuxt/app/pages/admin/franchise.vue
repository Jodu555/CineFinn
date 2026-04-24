<template>
	<div class="container py-4">
		<!-- Header -->
		<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
			<h1 class="h3 mb-0">
				<font-awesome-icon :icon="['fas', 'building']" class="me-2 text-info" />
				Franchise Management
			</h1>
			<button class="btn btn-primary" @click="manageFranchise()">
				<font-awesome-icon :icon="['fas', 'plus']" class="me-2" />
				Add Franchise
			</button>
		</div>

		<!-- Loading State -->
		<div v-if="pending" class="text-center py-5">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<!-- Empty State -->
		<div v-else-if="!franchiseList.length" class="text-center py-5 text-secondary">
			<font-awesome-icon :icon="['fas', 'box-open']" size="3x" class="mb-3 opacity-50" />
			<p class="h5">No franchises found</p>
			<button class="btn btn-outline-secondary mt-3" @click="manageFranchise()">Create your first franchise</button>
		</div>

		<!-- Franchise Grid -->
		<div v-else class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
			<div v-for="franchise in franchiseList" :key="franchise.id" class="col">
				<div class="card h-100 border-secondary shadow-sm">
					<div class="card-header border-secondary d-flex align-items-center gap-2">
						<div class="flex-shrink-0">
							<img v-if="franchise.logo" :src="franchise.logo" alt="" class="rounded" width="32" height="32" style="object-fit: cover" />
							<font-awesome-icon v-else :icon="['fas', 'image']" class="text-secondary" />
						</div>
						<span class="fw-semibold text-truncate">{{ franchise.name }}</span>
					</div>
					<div class="card-body">
						<p class="card-text text-secondary small mb-3" style="min-height: 3em">
							{{ franchise.description || 'No description provided.' }}
						</p>
						<div class="d-flex flex-wrap gap-2">
							<span class="badge bg-info text-dark">
								<font-awesome-icon :icon="['fas', 'film']" class="me-1" />
								{{ getTotalContent(franchise) }} items
							</span>
							<span class="badge bg-secondary">
								<font-awesome-icon :icon="['fas', 'sitemap']" class="me-1" />
								{{ franchise.subFranchises.length }} sub-franchises
							</span>
						</div>
					</div>
					<div class="card-footer border-secondary d-flex justify-content-end gap-2">
						<button class="btn btn-sm btn-outline-primary" title="Manage Franchise" @click="manageFranchise(franchise)">
							<font-awesome-icon :icon="['fas', 'pen-ruler']" class="me-1" />
							Manage
						</button>
						<button
							class="btn btn-sm btn-outline-danger"
							title="Delete Franchise"
							:disabled="deleting === franchise.id"
							@click="confirmDelete(franchise)"
						>
							<span v-if="deleting === franchise.id" class="spinner-border spinner-border-sm"></span>
							<template v-else>
								<font-awesome-icon :icon="['fas', 'trash']" class="me-1" />
								Delete
							</template>
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Manage Franchise Modal -->
		<div v-if="managingFranchise" class="modal d-block" style="background-color: rgba(0, 0, 0, 0.9); z-index: 1050" tabindex="-1">
			<div class="modal-dialog modal-fullscreen-lg-down modal-xl modal-dialog-scrollable">
				<div class="modal-content border-secondary">
					<div class="modal-header border-secondary flex-wrap gap-2">
						<h5 class="modal-title text-truncate">
							{{ isNewFranchise ? 'Create Franchise' : workingCopy.name }}
						</h5>
						<ul class="nav nav-pills ms-auto">
							<li class="nav-item">
								<button class="nav-link py-1 px-2" :class="{ active: manageTab === 'details' }" @click="manageTab = 'details'">Details</button>
							</li>
							<li class="nav-item">
								<button class="nav-link py-1 px-2" :class="{ active: manageTab === 'content' }" @click="manageTab = 'content'">
									Main Content
									<span class="badge bg-secondary ms-1">{{ workingCopy.mainContent.length }}</span>
								</button>
							</li>
							<li class="nav-item">
								<button class="nav-link py-1 px-2" :class="{ active: manageTab === 'subs' }" @click="manageTab = 'subs'">
									Sub Franchises
									<span class="badge bg-secondary ms-1">{{ workingCopy.subFranchises.length }}</span>
								</button>
							</li>
						</ul>
						<button type="button" class="btn-close" @click="closeManage"></button>
					</div>

					<div class="modal-body">
						<!-- Details Tab -->
						<div v-if="manageTab === 'details'">
							<form @submit.prevent>
								<div class="row g-3">
									<div class="col-md-6">
										<label class="form-label">ID</label>
										<input
											v-model="workingCopy.id"
											type="text"
											class="form-control border-secondary"
											:disabled="!isNewFranchise"
											required
											placeholder="franchise-id"
										/>
										<div class="form-text text-secondary">Unique identifier. Cannot be changed later.</div>
									</div>
									<div class="col-md-6">
										<label class="form-label">Name</label>
										<input v-model="workingCopy.name" type="text" class="form-control border-secondary" required placeholder="Franchise Name" />
									</div>
									<div class="col-12">
										<label class="form-label">Description</label>
										<textarea
											v-model="workingCopy.description"
											class="form-control border-secondary"
											rows="3"
											placeholder="Brief description..."
										></textarea>
									</div>
									<div class="col-md-6">
										<label class="form-label">Logo URL</label>
										<input v-model="workingCopy.logo" type="url" class="form-control border-secondary" placeholder="https://..." />
									</div>
									<div class="col-md-6">
										<label class="form-label">Background Image URL</label>
										<input v-model="workingCopy.backgroundImage" type="url" class="form-control border-secondary" placeholder="https://..." />
									</div>
								</div>
							</form>
						</div>

						<!-- Main Content Tab -->
						<div v-if="manageTab === 'content'">
							<div class="d-flex justify-content-between align-items-center mb-3">
								<h6 class="mb-0">Main Content Items</h6>
								<button class="btn btn-sm btn-primary" @click="openContentModal()">
									<font-awesome-icon :icon="['fas', 'plus']" class="me-1" />
									Add Content
								</button>
							</div>
							<div v-if="!workingCopy.mainContent.length" class="text-secondary fst-italic">No content items.</div>
							<div class="row row-cols-1 row-cols-md-2 g-3">
								<div v-for="(content, idx) in workingCopy.mainContent" :key="content.id + idx" class="col">
									<div class="card border-secondary h-100">
										<div class="row g-0">
											<div class="col-3">
												<img
													v-if="resolveContent(content).image"
													:src="resolveContent(content).image"
													class="img-fluid rounded-start h-100 w-100"
													style="object-fit: cover"
													alt=""
												/>
												<div v-else class="h-100 w-100 bg-secondary bg-opacity-10 d-flex align-items-center justify-content-center rounded-start">
													<font-awesome-icon :icon="['fas', 'image']" class="text-secondary" />
												</div>
											</div>
											<div class="col-9">
												<div class="card-body py-2 px-3">
													<div class="d-flex justify-content-between align-items-start">
														<h6 class="card-title text-truncate mb-1">
															{{ resolveContent(content).title }}
														</h6>
														<span class="badge bg-secondary ms-2">{{ content.type }}</span>
													</div>
													<p class="card-text small text-secondary text-truncate mb-2">
														{{ resolveContent(content).description || 'No description' }}
													</p>
													<div class="d-flex gap-2">
														<button class="btn btn-outline-primary btn-sm" @click="openContentModal(content, idx, 'main')">
															<font-awesome-icon :icon="['fas', 'pen']" />
														</button>
														<button class="btn btn-outline-danger btn-sm" @click="removeMainContent(idx)">
															<font-awesome-icon :icon="['fas', 'trash']" />
														</button>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Sub Franchises Tab -->
						<div v-if="manageTab === 'subs'">
							<div class="d-flex justify-content-between align-items-center mb-3">
								<h6 class="mb-0">Sub Franchises</h6>
								<button class="btn btn-sm btn-primary" @click="openSubFranchiseModal()">
									<font-awesome-icon :icon="['fas', 'plus']" class="me-1" />
									Add Sub Franchise
								</button>
							</div>
							<div v-if="!workingCopy.subFranchises.length" class="text-secondary fst-italic">No sub-franchises.</div>
							<div class="accordion accordion-flush" id="subAccordion">
								<div v-for="(sub, idx) in workingCopy.subFranchises" :key="sub.id" class="accordion-item border-secondary">
									<h2 class="accordion-header">
										<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="`#subCollapse${idx}`">
											<img
												v-if="sub.logo"
												:src="sub.logo"
												width="24"
												height="24"
												class="me-2 rounded flex-shrink-0"
												style="object-fit: cover"
												alt=""
											/>
											<span class="text-truncate">{{ sub.name }}</span>
											<span class="badge bg-secondary ms-2">{{ sub.content.length }}</span>
										</button>
									</h2>
									<div :id="`subCollapse${idx}`" class="accordion-collapse collapse" data-bs-parent="#subAccordion">
										<div class="accordion-body">
											<p class="small text-secondary mb-3">
												{{ sub.description || 'No description.' }}
											</p>
											<div class="d-flex gap-2 mb-3">
												<button class="btn btn-sm btn-outline-primary" @click="openSubFranchiseModal(sub, idx)">
													<font-awesome-icon :icon="['fas', 'pen']" class="me-1" />
													Edit
												</button>
												<button class="btn btn-sm btn-outline-danger" @click="removeSubFranchise(idx)">
													<font-awesome-icon :icon="['fas', 'trash']" class="me-1" />
													Delete
												</button>
												<button class="btn btn-sm btn-primary ms-auto" @click="openContentModal(undefined, -1, 'sub', idx)">
													<font-awesome-icon :icon="['fas', 'plus']" class="me-1" />
													Add Content
												</button>
											</div>

											<div v-if="!sub.content.length" class="text-secondary fst-italic small">No content in this sub-franchise.</div>
											<div class="table-responsive">
												<table class="table table-sm table-hover align-middle">
													<thead>
														<tr>
															<th style="width: 40px"></th>
															<th>Title</th>
															<th>Type</th>
															<th style="width: 80px"></th>
														</tr>
													</thead>
													<tbody>
														<tr v-for="(c, cIdx) in sub.content" :key="c.id">
															<td>
																<img
																	v-if="resolveContent(c).image"
																	:src="resolveContent(c).image"
																	width="30"
																	height="40"
																	class="rounded"
																	style="object-fit: cover"
																	alt=""
																/>
																<div
																	v-else
																	class="bg-secondary bg-opacity-10 rounded d-flex align-items-center justify-content-center"
																	style="width: 30px; height: 40px"
																>
																	<font-awesome-icon :icon="['fas', 'image']" size="xs" />
																</div>
															</td>
															<td class="text-truncate" style="max-width: 200px">
																{{ resolveContent(c).title }}
															</td>
															<td>
																<span class="badge bg-secondary">{{ c.type }}</span>
															</td>
															<td>
																<div class="d-flex gap-1">
																	<button class="btn btn-outline-primary btn-sm" @click="openContentModal(c, cIdx, 'sub', idx)">
																		<font-awesome-icon :icon="['fas', 'pen']" />
																	</button>
																	<button class="btn btn-outline-danger btn-sm" @click="removeSubContent(idx, cIdx)">
																		<font-awesome-icon :icon="['fas', 'trash']" />
																	</button>
																</div>
															</td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="modal-footer border-secondary">
						<button type="button" class="btn btn-secondary" @click="closeManage">Cancel</button>
						<button type="button" class="btn btn-primary" :disabled="saving" @click="saveFranchise">
							<span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
							{{ isNewFranchise ? 'Create Franchise' : 'Save Changes' }}
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Content Modal -->
		<div v-if="showContentModal" class="modal d-block" style="background-color: rgba(0, 0, 0, 0.85); z-index: 1060" tabindex="-1">
			<div class="modal-dialog modal-dialog-centered modal-lg">
				<div class="modal-content border-secondary">
					<div class="modal-header border-secondary">
						<h5 class="modal-title">
							{{ editingContentIndex >= 0 ? 'Edit Content' : 'Add Content' }}
						</h5>
						<button type="button" class="btn-close" @click="closeContentModal"></button>
					</div>
					<div class="modal-body">
						<form id="contentForm" @submit.prevent="saveContent">
							<div class="row g-3">
								<div class="col-md-6">
									<label class="form-label">Content Type</label>
									<select v-model="contentForm.type" class="form-select border-secondary" required>
										<option value="movie">Movie</option>
										<option value="series">Series</option>
									</select>
								</div>
								<div class="col-md-6">
									<label class="form-label">ID</label>
									<input v-model="contentForm.id" type="text" class="form-control border-secondary" required placeholder="content-uuid" />
								</div>

								<!-- Movie Fields -->
								<template v-if="contentForm.type === 'movie'">
									<div class="col-12">
										<label class="form-label">Movie ID Verification</label>
										<div class="input-group">
											<input
												v-model="contentForm.id"
												type="text"
												class="form-control border-secondary"
												required
												placeholder="Enter movie UUID"
												@blur="validateMovieId"
											/>
											<button class="btn btn-outline-secondary" type="button" :disabled="movieQueryLoading" @click="validateMovieId">
												<span v-if="movieQueryLoading" class="spinner-border spinner-border-sm"></span>
												<template v-else>Verify</template>
											</button>
										</div>
										<div v-if="movieQueryResult" class="form-text text-success">
											<font-awesome-icon :icon="['fas', 'check']" class="me-1" />
											{{ movieQueryResult.item.primaryName }}
										</div>
										<div v-if="movieQueryError" class="form-text text-danger">
											{{ movieQueryError }}
										</div>
									</div>
									<div class="col-md-4">
										<label class="form-label">Year</label>
										<input v-model.number="contentForm.year" type="number" class="form-control border-secondary" />
									</div>
									<div class="col-md-8">
										<label class="form-label">Poster URL</label>
										<input v-model="contentForm.poster" type="url" class="form-control border-secondary" />
									</div>
									<div class="col-12">
										<label class="form-label">Description</label>
										<textarea v-model="contentForm.description" class="form-control border-secondary" rows="2"></textarea>
									</div>
								</template>

								<!-- Series Preview -->
								<div v-if="contentForm.type === 'series'" class="col-12">
									<label class="form-label">Series ID</label>
									<input v-model="contentForm.id" type="text" class="form-control border-secondary" required placeholder="series-uuid" />
									<div v-if="resolvedSeriesPreview" class="card border-info mt-3">
										<div class="card-body">
											<div class="d-flex gap-3">
												<img
													v-if="resolvedSeriesPreview.infos?.imageURL"
													:src="resolvedSeriesPreview.infos.imageURL"
													class="rounded flex-shrink-0"
													style="width: 120px; height: 160px; object-fit: cover"
													alt=""
												/>
												<div>
													<h6 class="card-title">
														{{ resolvedSeriesPreview.title || resolvedSeriesPreview.infos?.title || 'Untitled Series' }}
													</h6>
													<div class="d-flex flex-wrap gap-1 mb-2">
														<span v-for="tag in resolvedSeriesPreview.tags.slice(0, 5)" :key="tag" class="badge bg-secondary">{{ tag }}</span>
													</div>
													<p class="card-text small text-secondary mb-0">
														{{ resolvedSeriesPreview.infos?.description || 'No description available.' }}
													</p>
												</div>
											</div>
										</div>
									</div>
									<div v-else class="alert alert-secondary py-2 small mb-0 mt-3">
										<font-awesome-icon :icon="['fas', 'circle-info']" class="me-2" />
										Enter a valid series ID to preview data from the index store.
									</div>
								</div>
							</div>
						</form>
					</div>
					<div class="modal-footer border-secondary">
						<button type="button" class="btn btn-secondary" @click="closeContentModal">Cancel</button>
						<button type="submit" form="contentForm" class="btn btn-primary" :disabled="savingContent">
							<span v-if="savingContent" class="spinner-border spinner-border-sm me-2"></span>
							Save Content
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Sub Franchise Modal -->
		<div v-if="showSubFranchiseModal" class="modal d-block" style="background-color: rgba(0, 0, 0, 0.85); z-index: 1060" tabindex="-1">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content border-secondary">
					<div class="modal-header border-secondary">
						<h5 class="modal-title">
							{{ editingSubFranchiseIndex >= 0 ? 'Edit Sub Franchise' : 'Add Sub Franchise' }}
						</h5>
						<button type="button" class="btn-close" @click="closeSubFranchiseModal"></button>
					</div>
					<div class="modal-body">
						<form id="subForm" @submit.prevent="saveSubFranchise">
							<div class="mb-3">
								<label class="form-label">ID</label>
								<input
									v-model="subFranchiseForm.id"
									type="text"
									class="form-control border-secondary"
									required
									:disabled="editingSubFranchiseIndex >= 0"
								/>
							</div>
							<div class="mb-3">
								<label class="form-label">Name</label>
								<input v-model="subFranchiseForm.name" type="text" class="form-control border-secondary" required />
							</div>
							<div class="mb-3">
								<label class="form-label">Description</label>
								<textarea v-model="subFranchiseForm.description" class="form-control border-secondary" rows="2"></textarea>
							</div>
							<div class="mb-3">
								<label class="form-label">Logo URL</label>
								<input v-model="subFranchiseForm.logo" type="url" class="form-control border-secondary" />
							</div>
						</form>
					</div>
					<div class="modal-footer border-secondary">
						<button type="button" class="btn btn-secondary" @click="closeSubFranchiseModal">Cancel</button>
						<button type="submit" form="subForm" class="btn btn-primary">Save</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { FrontendSeries } from '@cinefinn/types';
import type { FranchiseContent, FranchiseData, SubFranchise } from '@cinefinn/types/models/franchise';
import { useIndexStore } from '~/stores/index.store';

const authStore = useAuthStore();
const indexStore = useIndexStore();
const { $swal } = useNuxtApp();
const apiUrl = useAPIURL();

definePageMeta({
	middleware: 'auth',
});

/* ─── API Types ─── */
interface MovieQueryResponse {
	item: {
		UUID: string;
		primaryName: string;
		serie_UUID: string;
		movie_IDX: number;
	};
	watchableEntitys: {
		UUID: string;
		serie_UUID: string;
		watchable_UUID: string;
		lang: string;
		subID: string;
		filePath: string;
		runtime: number;
	};
}

/* ─── Helpers ─── */
const defaultFormData = (): FranchiseData => ({
	id: '',
	name: '',
	description: '',
	backgroundImage: '',
	logo: '',
	subFranchises: [],
	mainContent: [],
});

function getTotalContent(franchise: FranchiseData): number {
	return franchise.mainContent.length + franchise.subFranchises.reduce((acc, sub) => acc + sub.content.length, 0);
}

/* ─── Fetch franchises ─── */
const {
	data: franchises,
	pending,
	refresh,
} = useFetch<Record<string, FranchiseData>>(`${apiUrl}/franchise`, {
	key: 'franchise',
	server: true,
	headers: {
		'auth-token': authStore.authToken,
	},
});

const franchiseList = computed<FranchiseData[]>(() => {
	if (!franchises.value) return [];
	return Object.values(franchises.value);
});

/* ─── Manage Franchise State ─── */
const managingFranchise = ref(false);
const isNewFranchise = ref(false);
const manageTab = ref<'details' | 'content' | 'subs'>('details');
const workingCopy = reactive<FranchiseData>(defaultFormData());
const saving = ref(false);

function manageFranchise(franchise?: FranchiseData): void {
	if (franchise) {
		isNewFranchise.value = false;
		Object.assign(workingCopy, JSON.parse(JSON.stringify(franchise)));
	} else {
		isNewFranchise.value = true;
		Object.assign(workingCopy, defaultFormData());
	}
	managingFranchise.value = true;
	manageTab.value = 'details';
	prefetchMovieNames();
}

function closeManage(): void {
	managingFranchise.value = false;
	Object.assign(workingCopy, defaultFormData());
}

async function saveFranchise(): Promise<void> {
	saving.value = true;
	try {
		const url = isNewFranchise.value ? `${apiUrl}/franchise` : `${apiUrl}/franchise/${workingCopy.id}`;
		const method = isNewFranchise.value ? 'POST' : 'PUT';

		await $fetch(url, {
			method,
			body: JSON.stringify({ ...workingCopy }),
			headers: {
				'auth-token': authStore.authToken,
				'Content-Type': 'application/json',
			},
		});

		await refresh();

		$swal.fire({
			icon: 'success',
			title: isNewFranchise.value ? 'Created!' : 'Saved!',
			text: `Franchise successfully ${isNewFranchise.value ? 'created' : 'updated'}.`,
			timer: 2000,
			showConfirmButton: false,
		});

		closeManage();
	} catch (err: any) {
		$swal.fire({
			icon: 'error',
			title: 'Save Failed',
			text: err?.data?.message || err?.message || 'Unable to save franchise. Please try again.',
		});
	} finally {
		saving.value = false;
	}
}

/* ─── Content Modal State ─── */
const showContentModal = ref(false);
const editingContentIndex = ref(-1);
const contentParent = ref<'main' | 'sub'>('main');
const contentSubIndex = ref(-1);
const savingContent = ref(false);

type ContentFormData = {
	type: 'movie' | 'series';
	id: string;
	poster: string;
	year: number;
	description: string;
};

const contentForm = reactive<ContentFormData>({
	type: 'movie',
	id: '',
	poster: '',
	year: 0,
	description: '',
});

const movieQueryLoading = ref(false);
const movieQueryResult = ref<MovieQueryResponse | null>(null);
const movieQueryError = ref('');

const resolvedSeriesPreview = computed<FrontendSeries | undefined>(() => {
	if (contentForm.type === 'series' && contentForm.id) {
		return indexStore.seriesById.get(contentForm.id);
	}
	return undefined;
});

async function validateMovieId(): Promise<void> {
	if (contentForm.type !== 'movie' || !contentForm.id) return;
	movieQueryLoading.value = true;
	movieQueryError.value = '';
	try {
		const res = await $fetch<MovieQueryResponse>(`${apiUrl}/franchise/query/${contentForm.id}`, {
			headers: {
				'auth-token': authStore.authToken,
			},
		});
		movieQueryResult.value = res;
	} catch (err: any) {
		movieQueryError.value = err?.data?.message || 'Invalid movie ID';
		movieQueryResult.value = null;
	} finally {
		movieQueryLoading.value = false;
	}
}

function openContentModal(content?: FranchiseContent, index?: number, parent: 'main' | 'sub' = 'main', subIdx?: number): void {
	contentParent.value = parent;
	contentSubIndex.value = subIdx ?? -1;
	editingContentIndex.value = index ?? -1;
	movieQueryResult.value = null;
	movieQueryError.value = '';

	if (content) {
		if (content.type === 'movie') {
			Object.assign(contentForm, {
				type: 'movie' as const,
				id: content.id,
				poster: content.poster,
				year: content.year,
				description: content.description,
			});
			validateMovieId();
		} else {
			Object.assign(contentForm, {
				type: 'series' as const,
				id: content.id,
				poster: '',
				year: 0,
				description: '',
			});
		}
	} else {
		Object.assign(contentForm, {
			type: 'movie' as const,
			id: '',
			poster: '',
			year: 0,
			description: '',
		});
	}
	showContentModal.value = true;
}

function closeContentModal(): void {
	showContentModal.value = false;
}

function saveContent(): void {
	let item: FranchiseContent;

	if (contentForm.type === 'movie') {
		item = {
			type: 'movie',
			id: contentForm.id,
			poster: contentForm.poster,
			year: contentForm.year,
			description: contentForm.description,
		};
	} else {
		item = {
			type: 'series',
			id: contentForm.id,
		};
	}

	if (contentParent.value === 'main') {
		if (editingContentIndex.value >= 0) {
			workingCopy.mainContent[editingContentIndex.value] = item;
		} else {
			workingCopy.mainContent.push(item);
		}
	} else if (contentSubIndex.value >= 0) {
		const sub = workingCopy.subFranchises[contentSubIndex.value];
		if (editingContentIndex.value >= 0) {
			sub!.content[editingContentIndex.value] = item;
		} else {
			sub!.content.push(item);
		}
	}
	closeContentModal();
}

function removeMainContent(index: number): void {
	workingCopy.mainContent.splice(index, 1);
}

function removeSubContent(subIndex: number, contentIndex: number): void {
	workingCopy.subFranchises[subIndex]!.content.splice(contentIndex, 1);
}

/* ─── Sub Franchise Modal State ─── */
const showSubFranchiseModal = ref(false);
const editingSubFranchiseIndex = ref(-1);
const subFranchiseForm = reactive<SubFranchise>({
	id: '',
	name: '',
	description: '',
	logo: '',
	content: [],
});

function openSubFranchiseModal(sub?: SubFranchise, index?: number): void {
	editingSubFranchiseIndex.value = index ?? -1;
	if (sub) {
		Object.assign(subFranchiseForm, JSON.parse(JSON.stringify(sub)));
	} else {
		Object.assign(subFranchiseForm, {
			id: '',
			name: '',
			description: '',
			logo: '',
			content: [],
		});
	}
	showSubFranchiseModal.value = true;
}

function closeSubFranchiseModal(): void {
	showSubFranchiseModal.value = false;
}

function saveSubFranchise(): void {
	const item: SubFranchise = {
		...subFranchiseForm,
		content: editingSubFranchiseIndex.value >= 0 ? subFranchiseForm.content : [],
	};
	if (editingSubFranchiseIndex.value >= 0) {
		workingCopy.subFranchises[editingSubFranchiseIndex.value] = item;
	} else {
		workingCopy.subFranchises.push(item);
	}
	closeSubFranchiseModal();
}

function removeSubFranchise(index: number): void {
	workingCopy.subFranchises.splice(index, 1);
}

/* ─── Content Resolution Helper ─── */
interface ResolvedContent {
	title: string;
	image?: string;
	description?: string;
}

const movieNameCache = reactive<Record<string, string>>({});

async function fetchMovieName(id: string): Promise<void> {
	if (movieNameCache[id] || !id) return;
	try {
		const res = await $fetch<MovieQueryResponse>(`${apiUrl}/franchise/query/${id}`, {
			headers: {
				'auth-token': authStore.authToken,
			},
		});
		movieNameCache[id] = res.item.primaryName;
	} catch {
		movieNameCache[id] = id;
	}
}

async function prefetchMovieNames(): Promise<void> {
	const ids = new Set<string>();
	workingCopy.mainContent.forEach((c) => {
		if (c.type === 'movie') ids.add(c.id);
	});
	workingCopy.subFranchises.forEach((sub) => {
		sub.content.forEach((c) => {
			if (c.type === 'movie') ids.add(c.id);
		});
	});
	for (const id of ids) {
		await fetchMovieName(id);
	}
}

watch(
	() => workingCopy.mainContent,
	() => prefetchMovieNames(),
	{ deep: true },
);
watch(
	() => workingCopy.subFranchises,
	() => prefetchMovieNames(),
	{ deep: true },
);

const { decideSeriesImage } = useSeriesImage();

function resolveContent(content: FranchiseContent): ResolvedContent {
	if (content.type === 'series') {
		const series = indexStore.seriesById.get(content.id);
		if (series) {
			return {
				title: series.title || series.infos?.title || content.id,
				image: decideSeriesImage(series),
				description: series.infos?.description,
			};
		}
		return { title: content.id };
	}

	return {
		title: movieNameCache[content.id] || content.id,
		image: content.poster,
		description: content.description,
	};
}

/* ─── Top Level Delete ─── */
const deleting = ref<string | null>(null);

async function confirmDelete(franchise: FranchiseData): Promise<void> {
	const result = await $swal.fire({
		title: 'Delete Franchise?',
		text: `Are you sure you want to permanently delete "${franchise.name}"?`,
		icon: 'warning',
		showCancelButton: true,
		confirmButtonColor: '#dc3545',
		cancelButtonColor: '#6c757d',
		confirmButtonText: 'Yes, delete it!',
		cancelButtonText: 'Cancel',
	});

	if (!result.isConfirmed) return;

	deleting.value = franchise.id;

	try {
		await $fetch(`${apiUrl}/franchise/${franchise.id}`, {
			method: 'DELETE',
			headers: {
				'auth-token': authStore.authToken,
			},
		});

		await refresh();

		$swal.fire({
			icon: 'success',
			title: 'Deleted!',
			text: `"${franchise.name}" has been removed.`,
			timer: 2000,
			showConfirmButton: false,
		});
	} catch (err: any) {
		$swal.fire({
			icon: 'error',
			title: 'Delete Failed',
			text: err?.data?.message || err?.message || 'Unable to delete franchise.',
		});
	} finally {
		deleting.value = null;
	}
}
</script>

<style scoped>
/* Strictly minimal scoped styles */
.line-clamp-2 {
	display: -webkit-box;
	line-clamp: 2;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
</style>
