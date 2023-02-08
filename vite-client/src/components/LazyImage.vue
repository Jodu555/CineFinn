<template>
	<img :src="props.src" :alt="props.alt" />
</template>
<script setup>
import { onMounted, ref } from 'vue';

const props = defineProps(['src', 'alt']);

const recommendations = ref([]);

const id = ref(Math.ceil(Math.random() * 100000));
</script>
<style lang=""></style>
