<template>
	<div>
		<div v-if="loading" class="text-center justify-content-center mt-3">
			<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>

		<!-- Ensure src present both SSR and client initial render -->
		<img ref="image" :class="props.childclass" :alt="props.alt ?? ''" :src="props.src" loading="lazy" @load="onLoad" @error="onError" />
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	src: string;
	alt?: string;
	childclass?: string;
}>();

const loading = ref(true);
const image = ref<HTMLImageElement | null>(null);
let loadTimeout: ReturnType<typeof setTimeout> | null = null;
let observer: IntersectionObserver | null = null;

function onLoad() {
	loading.value = false;
}
function onError() {
	console.warn('Error on Loading Image', props.src);
}

onMounted(() => {
	// IntersectionObserver can still be used for behavior (analytics, class toggles),
	// but DO NOT remove src that exists on SSR — otherwise you'll trigger mismatch.
	if (typeof window !== 'undefined' && window.IntersectionObserver && image.value) {
		const options: IntersectionObserverInit = { root: null, threshold: 0, rootMargin: '1000px' };
		observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					// optional behaviour (e.g. only then set some class or trigger lazy logic)
				}
			});
		}, options);
		observer.observe(image.value);
	}
});

onBeforeUnmount(() => {
	if (loadTimeout) clearTimeout(loadTimeout);
	if (observer && image.value) observer.unobserve(image.value);
});
</script>
