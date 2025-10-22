<template>
	<p :class="props.class">
		{{ show ? props.text : props.text.slice(0, props.maxLength) + (props.text.length >= props.maxLength ? '...' : '') }}
		<small v-if="!show && props.text.length >= props.maxLength" class="read-more" @click="show = true">More</small>
		<small v-else-if="props.text.length >= props.maxLength" class="read-more" @click="show = false">Less</small>
		<br />
	</p>
</template>

<script lang="ts" setup>
const props = defineProps<{
	text: string;
	maxLength: number;
	class?: string;
}>();

const show = ref(false);
</script>

<style scoped>
.read-more {
	color: var(--bs-primary);
	cursor: pointer;
}
</style>
