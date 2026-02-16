<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();
</script>

<template>
	<div class="d-flex align-items-center justify-content-center min-vh-100 px-2">
		<div class="text-center">
			<h1 class="display-1 fw-bold">{{ error.statusCode }}</h1>
			<p class="fs-2 fw-medium mt-4">Oops! {{ error.message }}</p>
			<p v-if="error.statusCode === 404" class="mt-4 mb-5">The page you're looking for doesn't exist or has been moved.</p>
			<NuxtLink to="/" class="btn btn-light fw-semibold rounded-pill px-4 py-2 custom-btn"> Go Home </NuxtLink>
		</div>
		<!-- <pre>
			{{ error.stack }}
		</pre
		> -->
	</div>
</template>
