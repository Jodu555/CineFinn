<template>
	<div v-if="loading" class="text-center justtify-content-center mt-3">
		<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
			<span class="visually-hidden">Loading...</span>
		</div>
	</div>
	<img v-else ref="image" :alt="props.alt" />
</template>
<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps(['src', 'alt']);

const loading = ref(true);

const image = ref(null);

function loadImage() {
	image.value.src = props.src;
}

function createObserver() {
	const options = {
		root: null,
		threshold: '0',
	};
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				loadImage();
				observer.unobserve(image.value);
			}
		});
	}, options);
	observer.observe(image.value);
}

onMounted(() => {
	if (window['IntersectionObserver']) {
		console.log('Observer Created');
		createObserver();
	} else {
		console.log('Loaded Image onMount');
		loadImage();
	}
});
</script>
<style lang=""></style>
