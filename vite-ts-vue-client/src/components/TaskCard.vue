<template>
	<div>
		<div class="card mb-3 px-3 pt-3 pb-3 border-primary">
			<div class="row g-0">
				<div class="col-md-4">
					<img :src="decideImageURL(element)" class="img-fluid rounded-start dp-img" :alt="decideImageURL(element)" />
				</div>
				<div class="col-md-8">
					<div class="card-body">
						<h5 class="card-title">{{ element.name }} - {{ element.categorie }}</h5>
						<p class="card-text">
							<div style="width: 15%" class="d-flex justify-content-around">
								<a v-if="element.references.aniworld" target="_blank" :href="element.references.aniworld" class="h6">A</a>
								<span v-if="element.references.zoro" class="h6">Z</span>
								<a v-if="element.references.sto" target="_blank" :href="element.references.sto" class="h6">S</a>
							</div>
							<ul v-if="!minimal && languageDevision(element).total != -1">
								<li>Episodes: {{ languageDevision(element).total }}</li>
								<li>
									&nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk:
									{{ numWithFP((languageDevision(element).total * constants.mbperEpisode) / 1024, 1) }}GB
								</li>
								<li v-for="[key, value] in Object.entries(languageDevision(element).devision)">&nbsp;&nbsp;&nbsp;&nbsp;{{ key }}: {{ value }}%</li>
								<template v-if="element.scraped != undefined && element.scraped !== true && element.scraped?.movies != undefined">
									<li>Movies: {{ element.scraped?.movies?.length }}</li>
									<li>
										&nbsp;&nbsp;&nbsp;&nbsp;Apx Size on Disk:
										{{ numWithFP((element.scraped?.movies?.length * constants.mbperMovie) / 1024, 1) }}GB
									</li>
								</template>
								<!-- <li>
									<em>
										<template v-if="auth.userInfo.role > 2">
											Source:
											<template v-if="element.scraped !== undefined && element.scraped !== true">
												<br />
												<a target="_blank" :href="element.scraped?.url">{{ element.scraped?.url }}</a>
											</template>
											<template v-if="element.scrapedZoro !== undefined && element.scrapedZoro !== true">
												<br />
												<a target="_blank" :href="element.scrapedZoro.episodes[0]?.url">{{ element.scrapedZoro.episodes[0]?.url }}</a>
											</template>
											<template v-if="element.scrapednewZoro !== undefined && element.scrapednewZoro !== true">
												<br />
												<a target="_blank" :href="element.scrapednewZoro.seasons[0]?.[0]?.url">{{ element.scrapednewZoro.seasons[0]?.[0]?.url }}</a>
											</template>
											<template v-if="element.scrapedAnix !== undefined && element.scrapedAnix !== true">
												<br />
												<a target="_blank" :href="`https://anix.to/anime/${element.references.anix}`">{{
													`https://anix.to/anime/${element.references.anix}`
												}}</a>
											</template>
										</template>
										<br />
									</em>
								</li> -->
							</ul>
						</p>
						<p class="card-text"><small class="text-body-secondary">From: {{ permittedAccounts.find((x) => x.UUID == element.creator)?.username  }}</small></p>
					</div>
				</div>
			</div>
		</div>

		<!-- <div class="bg-white shadow rounded px-3 pt-3 pb-5 border border-white">
			<div class="d-flex justify-between">
				<p class="text-gray-700 font-semibold font-sans tracking-wide text-sm">title</p>

				<img class="w-6 h-6 rounded-full ml-3" src="https://pickaface.net/gallery/avatar/unr_sample_161118_2054_ynlrg.png" alt="Avatar" />
			</div>
			<div class="flex mt-4 justify-between items-center">
				<span class="text-sm text-gray-600">00</span>
			</div>
		</div> -->
	</div>
</template>
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import type { DatabaseParsedTodoItem } from '@Types/database';
import { reactive, ref } from 'vue';

const auth = useAuthStore();


const constants = reactive({
	mbperEpisode: 260,
	mbperMovie: 1024,
});

const minimal = ref(false);

const numWithFP = (num: string | number, pts: number): number => {
	if (typeof num == 'number') num = String(num);
	return parseFloat(parseFloat(num).toFixed(pts));
};

function decideImageURL(element: DatabaseParsedTodoItem) {
	// if (minimal.value) return '';

	if (
		element.scraped != undefined &&
		element.scraped !== true &&
		element.scraped.informations.image &&
		typeof element.scraped.informations.image == 'string'
	) {
		return element.scraped.informations.image;
	}
	if (
		element.scrapednewZoro != undefined &&
		element.scrapednewZoro !== true &&
		element.scrapednewZoro.image &&
		typeof element.scrapednewZoro.image == 'string'
	) {
		return element.scrapednewZoro.image;
	}

	if (element.scrapedAnix != undefined && element.scrapedAnix !== true && element.scrapedAnix.image && typeof element.scrapedAnix.image == 'string') {
		return element.scrapedAnix.image;
	}
	return '';
}

const languageDevision = (element: DatabaseParsedTodoItem) => {
	const out: Record<string, number> = {};
	let total = -1;
	if (element.scraped != undefined && element.scraped !== true) {
		total = element.scraped.seasons.flat().length;
		element.scraped.seasons.flat().forEach((x) => x.langs.forEach((l) => (!out[l] ? (out[l] = 1) : (out[l] += 1))));
	}
	if (element.scrapedZoro != undefined && element.scrapedZoro !== true) {
		if (total == -1) total = element.scrapedZoro.episodes.length;
		const zoroEps = element.scrapedZoro?.episodes;
		zoroEps.forEach((e) => {
			e.langs.forEach((l) => {
				if (l == 'sub') l = 'EngSub';
				if (l == 'dub') l = 'EngDub';
				if (out[l]) {
					out[l] += 1;
				} else {
					out[l] = 1;
				}
			});
		});
	}
	if (element.scrapednewZoro != undefined && element.scrapednewZoro !== true) {
		if (total == -1) total = element.scrapednewZoro?.seasons.flat().length;
		const zoroEps = element.scrapednewZoro?.seasons.flat();
		zoroEps.forEach((e) => {
			e.langs.forEach((l) => {
				if (l == 'sub') l = 'EngSub';
				if (l == 'dub') l = 'EngDub';
				if (l == 'raw') l = 'JapDub';
				if (out[l]) {
					out[l] += 1;
				} else {
					out[l] = 1;
				}
			});
		});
	}
	if (element.scrapedAnix != undefined && element.scrapedAnix !== true) {
		if (total == -1) total = element.scrapedAnix?.seasons.flat().length;
		const anixEps = element.scrapedAnix?.seasons.flat();
		anixEps.forEach((e) => {
			e.langs.forEach((l) => {
				if (l == 'sub') l = 'EngSub';
				if (l == 'dub') l = 'EngDub';
				if (out[l]) {
					out[l] += 1;
				} else {
					out[l] = 1;
				}
			});
		});
	}

	for (const [key, value] of Object.entries(out)) {
		out[key] = Math.min(100, parseFloat(parseFloat(String((value / total) * 100)).toFixed(2)));
	}

	if (out['GerDub'] == 100) {
		delete out['GerSub'];
		delete out['EngSub'];
	} else if (out['GerSub'] == 100 && out['EngSub']) {
		delete out['EngSub'];
	}

	return { total, devision: out };
};



interface permAcc {
	UUID: string;
	username: string;
	role: number;
}

const props = defineProps<{
	element: DatabaseParsedTodoItem;
	permittedAccounts: permAcc[];
}>();
</script>

<style scoped>
.dp-img {
	/* max-width: 10rem;
	min-width: 9rem;
	min-height: 20rem;
	max-height: 17rem; */
	width: 100%;
	object-fit: cover;
	border-radius: 25px;
}
</style>
