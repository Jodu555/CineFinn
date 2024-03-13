<template>
	<div v-auto-animate>
		<div v-if="settings.enableBetaFeatures?.value == false">
			<h1 class="text-danger text-center">Work in Progress</h1>
		</div>
		<div v-else style="overflow-x: hidden">
			<div v-for="item of list">
				<pre v-if="settings.developerMode?.value == true">
					{{ item.title }}
					{{ item.data.length }}
				</pre
				>
				<VideoCarousel v-if="item.data.length > 2" class="pb-4 pt-10" :category="item.title" :wrapAround="true" :list="item.data" />
			</div>
		</div>
	</div>
</template>
<script setup>
import { onMounted, reactive, getCurrentInstance, computed } from 'vue';
import { useStore } from 'vuex';

import VideoCarousel from '@/components/Home/VideoCarousel.vue';

const instance = getCurrentInstance().appContext.config.globalProperties;

const store = useStore();

const list = reactive({});

const settings = computed(() => store.state.auth.settings);

onMounted(async () => {
	const series = store.state.series;

	const response = await instance.$networking.get('/recommendation');
	if (!response.success) return;
	const json = response.json;
	Object.keys(json).forEach((k) => {
		list[k] = {
			title: json[k].title,
			data: json[k].data.map((ID) => {
				const entity = series.find((z) => z.ID == ID);
				if (entity == undefined) {
					console.log('Not found entity', k, ID, entity);
				}
				if (entity?.infos?.image == true) {
					const url = new URL(instance.$networking.API_URL + `/images/${entity.ID}/cover.jpg`);
					url.searchParams.append('auth-token', instance.$networking.auth_token);
					entity.url = url.href;
					// f.url = `http://cinema-api.jodu555.de/images/${f.ID}/cover.jpg?auth-token=${'SECR-DEV'}`;
				} else {
					entity.url = entity?.infos?.imageURL;
				}
				return entity;
			}),
		};
	});
});
</script>
<style lang=""></style>
