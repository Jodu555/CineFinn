<template>
	<svg
		class="animprogress"
		width="200"
		height="200"
		viewBox="-25 -25 250 250"
		version="1.1"
		xmlns="http://www.w3.org/2000/svg"
		style="transform: rotate(-90deg)">
		<circle
			r="90"
			cx="100"
			cy="100"
			fill="transparent"
			stroke="#e0e0e0"
			stroke-width="16px"
			:stroke-dasharray="circumference"
			:stroke-dashoffset="svgPercentage"></circle>
		<circle
			r="90"
			cx="100"
			cy="100"
			stroke="#76e5b1"
			stroke-width="16px"
			stroke-linecap="round"
			:stroke-dashoffset="svgPercentage"
			fill="transparent"
			:stroke-dasharray="circumference"></circle>
		<text x="52px" y="117px" fill="#6bdba7" font-size="52px" font-weight="bold" style="transform: rotate(90deg) translate(0px, -196px)">
			{{ percentage }}%
		</text>
	</svg>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
	percentage: number;
}>();

// const percentage = ref(8);

const strokeColor = false ? '#F56565' : '#48BB78';

const radius = 200 / 2 - 10;
const circumference = 3.14 * radius * 2;

const svgPercentage = computed(() => {
	return Math.round(circumference * ((100 - props.percentage) / 100)) + 'px';
});
</script>

<style scoped>
.animprogress circle {
	transition: stroke-dashoffset 500ms ease-in-out;
}
</style>
