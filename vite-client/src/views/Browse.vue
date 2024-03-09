<template>
	<div style="overflow-x: hidden">
		<div v-for="item of list">
			<!-- {{ item.title }}
			{{ item.data.length }}
			{{ item.data.length > 1 }} -->
			<VideoCarousel v-if="item.data.length > 2" class="pb-4 pt-10" :category="item.title" :wrapAround="true" :list="item.data" />
		</div>
	</div>
</template>
<script setup>
import { onMounted, reactive } from 'vue';
import { useStore } from 'vuex';

import VideoCarousel from '@/components/Home/VideoCarousel.vue';

const store = useStore();

const list = reactive({});

onMounted(async () => {
	const series = store.state.series;

	const response = await fetch(`http://localhost:3100/recommendation?auth-token=SECR-DEV`);
	const json = await response.json();
	Object.keys(json).forEach((k) => {
		list[k] = {
			title: json[k].title,
			data: json[k].data.map((ID) => {
				const f = series.find((z) => z.ID == ID);
				if (f.image == true) {
					f.url = `http://cinema-api.jodu555.de/images/${f.ID}/cover.jpg?auth-token=${'SECR-DEV'}`;
				} else {
					f.url = f.infos.imageURL;
				}
				return f;
			}),
		};
	});
});
</script>
<style lang=""></style>
