<template>
	<div class="container-xxl py-4">
		<!-- Header -->
		<div class="d-flex justify-content-between align-items-center mb-4">
			<h1 class="h3 mb-0">
				<font-awesome-icon :icon="['fas', 'tasks']" class="me-2 text-primary" />
				Job Management
			</h1>
			<button class="btn btn-outline-primary" @click="managmentStore.loadJobs()" :disabled="loading">
				<font-awesome-icon :icon="['fas', 'sync-alt']" :class="{ 'fa-spin': loading }" />
				<span class="ms-2">Refresh</span>
			</button>
		</div>

		<!-- Loading State -->
		<div v-if="loading && jobs.length === 0" class="text-center py-5">
			<font-awesome-icon :icon="['fas', 'spinner']" spin size="3x" class="text-secondary mb-3" />
			<p class="text-muted">Loading jobs...</p>
		</div>

		<!-- Error State -->
		<div v-if="error" class="alert alert-danger d-flex align-items-center" role="alert">
			<font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="me-2" />
			<div>{{ error }}</div>
		</div>

		<!-- Content -->
		<div v-if="!loading || jobs.length > 0">
			<!-- Section: Running Jobs -->
			<section class="mb-5">
				<h5 class="text-uppercase text-muted mb-3 small">
					<font-awesome-icon :icon="['fas', 'hourglass-half']" class="me-2" />
					Running Jobs ({{ runningJobs.length }})
				</h5>

				<div v-if="runningJobs.length === 0" class="text-muted text-center py-4 border border-dashed rounded">No active jobs running.</div>

				<div class="row g-4">
					<div v-for="job in runningJobs" :key="job.UUID" class="col-md-6 col-xl-4">
						<div class="card border-0 shadow-sm h-100 border-start border-4 border-info">
							<div class="card-body">
								<div class="d-flex justify-content-between align-items-start mb-3">
									<div>
										<span class="badge bg-info-subtle text-info mb-2">{{ job.type }}</span>
										<h6 class="card-title mb-0 text-truncate" style="max-width: 200px">
											{{ job.UUID }}
										</h6>
									</div>
									<div class="pulse-dot bg-info"></div>
								</div>

								<div class="progress" style="height: 4px">
									<div class="progress-bar progress-bar-striped progress-bar-animated bg-info" role="progressbar" style="width: 100%"></div>
								</div>

								<div class="mt-3">
									<button
										class="btn btn-sm btn-outline-secondary w-100"
										type="button"
										data-bs-toggle="collapse"
										:data-bs-target="`#logs-${job.UUID}`"
									>
										<font-awesome-icon :icon="['fas', 'terminal']" class="me-1" /> View Logs
									</button>
									<div class="collapse mt-2" :id="`logs-${job.UUID}`">
										<div class="code-block small">
											<pre class="mb-0">{{ job.logs.join('\n') || 'No logs available yet...' }}</pre>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- Section: Finished Jobs -->
			<section>
				<h5 class="text-uppercase text-muted mb-3 small">
					<font-awesome-icon :icon="['fas', 'history']" class="me-2" />
					Completed Jobs ({{ finishedJobs.length }})
				</h5>

				<div v-if="finishedJobs.length === 0" class="text-muted text-center py-4 border border-dashed rounded">No finished jobs found.</div>

				<div class="card bg-body-tertiary border-0">
					<div class="table-responsive">
						<table class="table table-hover align-middle mb-0">
							<thead class="border-bottom border-secondary">
								<tr>
									<th style="width: 50px"></th>
									<th>Status</th>
									<th>Type</th>
									<th>UUID</th>
									<th>Finished At</th>
									<th style="width: 120px">Actions</th>
								</tr>
							</thead>
							<tbody>
								<template v-for="job in finishedJobs.sort((a, b) => b.finished_at - a.finished_at)" :key="job.UUID">
									<tr>
										<td>
											<font-awesome-icon
												:icon="job.failed_at ? ['fas', 'times-circle'] : ['fas', 'check-circle']"
												:class="job.failed_at ? 'text-danger' : 'text-success'"
												size="lg"
											/>
										</td>
										<td>
											<span :class="['badge', job.failed_at ? 'bg-danger' : 'bg-success']">
												{{ job.failed_at ? 'Failed' : 'Success' }}
											</span>
										</td>
										<td>
											<span class="badge bg-body-tertiary text-secondary border">{{ job.type }}</span>
										</td>
										<td>
											<code class="user-select-all">{{ job.UUID }}</code>
										</td>
										<td>
											{{ formatDate(job.failed_at || job.finished_at) }}
										</td>
										<td>
											<div class="btn-group w-100" role="group">
												<button class="btn btn-sm btn-outline-info" @click="toggleDetails(job.UUID)" title="View Details">
													<font-awesome-icon :icon="['fas', openedJobs.includes(job.UUID) ? 'chevron-up' : 'chevron-down']" />
												</button>
												<button class="btn btn-sm btn-outline-danger" @click="deleteJob(job.UUID)" title="Delete Job">
													<font-awesome-icon :icon="['fas', 'trash']" />
												</button>
											</div>
										</td>
									</tr>
									<!-- Expandable Details Row -->
									<tr v-if="openedJobs.includes(job.UUID)" class="table-active">
										<td colspan="6" class="p-3">
											<div class="row">
												<div class="col-md-6 mb-3">
													<h6 class="text-muted mb-2"><font-awesome-icon :icon="['far', 'clock']" class="me-1" />Started At</h6>
													<pre class="mb-0">{{ formatDate(job.created_at) }}</pre>
												</div>
												<div class="col-md-6 mb-3">
													<h6 class="text-muted mb-2"><font-awesome-icon :icon="['far', 'clock']" class="me-1" />Running Time</h6>
													<pre class="mb-0">{{ msToReadable(job.finished_at - job.created_at) }}</pre>
												</div>
												<!-- Data Input -->
												<div class="col-md-6 mb-3">
													<h6 class="text-muted mb-2"><font-awesome-icon :icon="['fas', 'database']" class="me-1" /> Data Input</h6>
													<div class="code-block small">
														<pre class="mb-0">{{ JSON.stringify(job.data, null, 2) }}</pre>
													</div>
												</div>
												<!-- Result -->
												<div class="col-md-6 mb-3">
													<h6 class="text-muted mb-2"><font-awesome-icon :icon="['fas', 'file-export']" class="me-1" /> Result</h6>
													<div class="code-block small">
														<pre class="mb-0 text-wrap">{{ JSON.stringify(job.result, null, 2) }}</pre>
													</div>
												</div>

												<!-- NEW: Logs Section (Full Width) -->
												<div class="col-12">
													<h6 class="text-muted mb-2"><font-awesome-icon :icon="['fas', 'terminal']" class="me-1" /> Execution Logs</h6>
													<div class="code-block small" style="max-height: 250px">
														<!-- Check if logs exist, otherwise show placeholder -->
														<pre v-if="job.logs && job.logs.length" class="mb-0">{{ job.logs.join('\n') }}</pre>
														<span v-else class="text-muted fst-italic">No logs available for this job.</span>
													</div>
												</div>
											</div>
										</td>
									</tr>
								</template>
							</tbody>
						</table>
					</div>
				</div>
			</section>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Job } from '@cinefinn/types/database';
import { msToReadable } from '@cinefinn/utilities/time';
import { computed, ref } from 'vue';

definePageMeta({
	middleware: 'auth',
});

const managmentStore = useManagmentStore();

const loading = computed(() => managmentStore.loading);
const error = computed(() => managmentStore.error);
const jobs = computed(() => managmentStore.jobs);

const runningJobs = computed(() => {
	return jobs.value.filter((job: Job) => !job.finished_at && !job.failed_at);
});

const finishedJobs = computed(() => {
	return jobs.value.filter((job: Job) => job.finished_at > 0 || job.failed_at > 0).sort((a, b) => b.finished_at - a.finished_at);
});

// UI State for expanding rows
const openedJobs = ref<string[]>([]);

function toggleDetails(uuid: string) {
	const index = openedJobs.value.indexOf(uuid);
	if (index > -1) {
		openedJobs.value.splice(index, 1);
	} else {
		openedJobs.value.push(uuid);
	}
}

function formatDate(timestamp: number) {
	if (!timestamp) return 'N/A';
	return new Date(+timestamp).toLocaleString();
}

const { $swal } = useNuxtApp();

async function deleteJob(jobUUID: string) {
	const { isConfirmed: confirmed } = await $swal.fire({
		title: 'Delete Job?',
		text: 'Are you sure you want to delete this job?',
		icon: 'warning',
		showCancelButton: true,
		cancelButtonText: 'No',
		confirmButtonText: 'Yes, delete it!',
	});
	if (confirmed) {
		await managmentStore.deleteJob(jobUUID);
	}
}
</script>

<style scoped>
.code-block {
	background-color: rgba(0, 0, 0, 0.2);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 0.375rem;
	padding: 0.75rem;
	max-height: 200px;
	overflow-y: auto;
	overflow-x: auto;
	max-width: 79rem;
}

.code-block pre {
	color: #e9ecef;
	font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
	white-space: pre-wrap;
}

.pulse-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	animation: pulse-animation 1.5s infinite;
}

@keyframes pulse-animation {
	0% {
		box-shadow: 0 0 0 0 rgba(23, 162, 184, 0.7);
	}
	70% {
		box-shadow: 0 0 0 10px rgba(23, 162, 184, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(23, 162, 184, 0);
	}
}

.border-dashed {
	border-style: dashed !important;
}
</style>
