<!-- <template>
	<div>
		<div v-if="loading" class="text-center justtify-content-center mt-3">
			<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<img ref="image" :class="props.childclass" :alt="props.alt" />
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps(['src', 'alt', 'childclass']);

const loading = ref(true);

const image = ref<HTMLImageElement | null>(null);

function loadImage() {
	if (!image.value) return;
	image.value.addEventListener('load', () => {
		loading.value = false;
	});
	image.value.addEventListener('error', () => console.log('Error on Loading Image', props.src));
	image.value.src = props.src;
}

function createObserver() {
	if (!image.value) return;
	const options = {
		root: null,
		threshold: 0,
	};
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				loadImage();
				observer.unobserve(image.value as Element);
			}
		});
	}, options);
	observer.observe(image.value);
}

onMounted(() => {
	if (window['IntersectionObserver']) {
		createObserver();
	} else {
		loadImage();
	}
});
</script> -->
<template>
	<div>
		<div v-if="loading" class="text-center justify-content-center mt-3">
			<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<img ref="image" :class="props.childclass" :alt="props.alt" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps(['src', 'alt', 'childclass']);
const loading = ref(true);
const image = ref<HTMLImageElement | null>(null);
let loadTimeout: ReturnType<typeof setTimeout> | null = null;

function loadImage() {
	if (!image.value || loading.value == false) return;
	image.value.addEventListener('load', () => {
		loading.value = false;
	});
	image.value.addEventListener('error', () => console.log('Error on Loading Image', props.src));
	image.value.src = props.src;
}

function createObserver() {
	if (!image.value) return;

	const options = {
		root: null,
		threshold: 0,
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				loadTimeout = setTimeout(() => {
					if (entry.isIntersecting) {
						loadImage();
					}
				}, 50);
			} else {
				if (loadTimeout) {
					clearTimeout(loadTimeout);
					loadTimeout = null;
				}
			}
		});
	}, options);

	observer.observe(image.value);
}

onMounted(() => {
	if (window['IntersectionObserver']) {
		createObserver();
	} else {
		loadImage();
	}
});
</script>
