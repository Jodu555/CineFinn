<template>
	<div v-auto-animate>
		<div v-if="auth.settings.enableBetaFeatures?.value == false">
			<h1 class="text-danger text-center">Work in Progress</h1>
		</div>
		<div v-else style="overflow-x: hidden">
			<div v-for="item of list">
				<pre v-if="auth.settings.developerMode?.value == true">
					{{ item.title }}
					{{ item.data.length }}
				</pre
				>
				<VideoCarousel v-if="item.data.length > 2" class="pb-4 pt-10" :category="item.title" :wrapAround="true" :list="item.data" />
			</div>
		</div>
	</div>
</template>
<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';
import { useAxios, useBaseURL } from '@/utils';
import type { BrowseSerie, Serie } from '@/types';

import VideoCarousel from '@/components/Home/VideoCarousel.vue';

const auth = useAuthStore();
const index = useIndexStore();

const list: Record<string, { title: string; data: BrowseSerie[] }> = reactive({});

onMounted(async () => {
	const response = await useAxios().get('/recommendation');
	if (response.status != 200) return;
	const json = response.data;
	Object.keys(json).forEach((k) => {
		list[k] = {
			title: json[k].title,
			data: json[k].data.map((ID: string) => {
				const entity = index.series.find((z) => z.ID == ID) as BrowseSerie | undefined;
				if (entity == undefined) {
					console.log('Not found entity', k, ID, entity);
					return undefined;
				}
				if (entity?.infos?.image == true) {
					const url = new URL(useBaseURL() + `/images/${entity.ID}/cover.jpg`);
					url.searchParams.append('auth-token', auth.authToken);
					entity.url = url.href;
					// f.url = `http://cinema-api.jodu555.de/images/${f.ID}/cover.jpg?auth-token=${'SECR-DEV'}`;
				} else {
					entity.url = entity?.infos?.imageURL;
				}
				return entity;
			}) as BrowseSerie[],
		};
	});
});
</script>
<style lang=""></style>
