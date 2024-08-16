<template>
	<svg
		class="animprogress"
		:width="size"
		:height="size"
		:viewBox="`-${size * 0.125} -${size * 0.125} ${size * 1.25} ${size * 1.25}`"
		version="1.1"
		xmlns="http://www.w3.org/2000/svg"
		style="transform: rotate(-90deg)">
		<circle
			:r="size / 2 - 10"
			:cx="size / 2"
			:cy="size / 2"
			fill="transparent"
			stroke="#999999"
			:stroke-width="circleWidth + 'px'"
			:stroke-dasharray="circumference"
			stroke-dashoffset="0"></circle>
		<circle
			:r="size / 2 - 10"
			:cx="size / 2"
			:cy="size / 2"
			stroke="#76e5b1"
			:stroke-width="progressWidth + 'px'"
			stroke-linecap="round"
			:stroke-dashoffset="svgPercentage"
			fill="transparent"
			:stroke-dasharray="circumference"></circle>
		<text :x="textX + 'px'" y="85px" fill="#6bdba7" font-size="30px" font-weight="bold" style="transform: rotate(90deg) translate(0px, -146px)">
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

const size = 150;
const circleWidth = 7;
const progressWidth = 10;

const radius = size / 2 - 10;
const circumference = 3.14 * radius * 2;

const textX = computed(() => {
	const isInt = Number.isInteger(props.percentage);

	let len = props.percentage.toString().length;
	if (!isInt) len--;

	if (len == 1) {
		return 55;
	} else if (len == 2) {
		return 47;
	} else if (len == 3) {
		return 40;
	} else if (len == 4) {
		return 25;
	} else if (len == 5) {
		return 14;
	}
	return;
});

const svgPercentage = computed(() => {
	return Math.round(circumference * ((100 - props.percentage) / 100)) + 'px';
});
</script>

<style scoped>
.animprogress circle {
	transition: stroke-dashoffset 500ms ease-in-out;
}
</style>
