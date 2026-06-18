<template>
	<div class="container py-4">
		<h1 class="mb-4">
			<font-awesome-icon :icon="['fas', 'wrench']" class="me-2" />
			Tooling
		</h1>

		<div class="row g-3">
			<!-- filenameParser Tool Card -->
			<div class="col-12 col-md-6 col-lg-4">
				<div class="card border-secondary h-100">
					<div class="card-header d-flex align-items-center justify-content-between">
						<span class="fw-semibold">
							<font-awesome-icon :icon="['fas', 'file-code']" class="me-2 text-info" />
							filenameParser
						</span>
						<span class="badge bg-secondary">Parser</span>
					</div>
					<div class="card-body">
						<p class="card-text text-muted small mb-3">Parse filepath + filename to extract movie/episode metadata.</p>

						<div class="mb-3">
							<label class="form-label small fw-semibold">Filepath</label>
							<div class="input-group input-group-sm">
								<span class="input-group-text">
									<font-awesome-icon :icon="['fas', 'folder']" />
								</span>
								<input v-model="filepath" type="text" class="form-control" placeholder="/path/to/file/" @keyup.enter="runParser" />
							</div>
						</div>

						<div class="mb-3">
							<label class="form-label small fw-semibold">Filename</label>
							<div class="input-group input-group-sm">
								<span class="input-group-text">
									<font-awesome-icon :icon="['fas', 'file']" />
								</span>
								<input v-model="filename" type="text" class="form-control" placeholder="Movie.2024.1080p.mkv" @keyup.enter="runParser" />
							</div>
						</div>

						<button class="btn btn-sm btn-primary w-100" :disabled="loading || !filepath || !filename" @click="runParser">
							<font-awesome-icon :icon="loading ? ['fas', 'spinner'] : ['fas', 'play']" :spin="loading" class="me-1" />
							{{ loading ? 'Parsing...' : 'Run Parser' }}
						</button>
					</div>

					<!-- Result Section -->
					<div v-if="result || error" class="card-footer">
						<!-- Success Result -->
						<div v-if="result && !error" class="parsed-result">
							<div class="d-flex align-items-center mb-2">
								<span class="badge me-2" :class="result.movie ? 'bg-warning text-dark' : 'bg-success'">
									{{ result.movie ? 'Movie' : 'Episode' }}
								</span>
								<span class="badge bg-info">{{ result.language }}</span>
							</div>

							<div class="bg-dark rounded p-2 small font-monospace">
								<div><strong>Title:</strong> {{ result.title }}</div>
								<div v-if="result.movie"><strong>MovieTitle:</strong> {{ result.movieTitle }}</div>
								<div v-else><strong>Season:</strong> {{ result.season }} | <strong>Episode:</strong> {{ result.episode }}</div>
							</div>
						</div>

						<!-- Error Result -->
						<div v-if="error" class="alert alert-danger mb-0 py-2 small">
							<font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="me-1" />
							{{ error }}
						</div>
					</div>
				</div>
			</div>

			<!-- Placeholder for future tools -->
			<div class="col-12 col-md-6 col-lg-4">
				<div class="card border-secondary h-100 opacity-50">
					<div class="card-header d-flex align-items-center justify-content-between">
						<span class="fw-semibold text-muted">
							<font-awesome-icon :icon="['fas', 'clock']" class="me-2" />
							Coming Soon
						</span>
						<span class="badge bg-secondary">TBD</span>
					</div>
					<div class="card-body d-flex align-items-center justify-content-center">
						<p class="text-muted small mb-0">More tooling functions will appear here.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const adminStore = useAdminStore();

// Reactive state
const filepath = ref('');
const filename = ref('');
const loading = ref(false);
const result = ref<ParsedInformation | null>(null);
const error = ref<string | null>(null);

// Run the parser
async function runParser() {
	if (!filepath.value || !filename.value) return;

	loading.value = true;
	error.value = null;
	result.value = null;

	try {
		const data = await adminStore.invokeToolingFilenameParser(filepath.value, filename.value);
		result.value = data!;
	} catch (err: any) {
		error.value = err?.message || 'Unknown error occurred';
	} finally {
		loading.value = false;
	}
}
</script>

<style scoped>
/* Minimal scoped styles - rely on Bootstrap 5 dark mode */
.parsed-result {
	animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
