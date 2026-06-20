<template>
	<div
		v-if="episode != undefined"
		:class="[
			'card cursor-pointer',
			isEpisodeWatched(episode.UUID) && !isCurrentEpisode(episode.UUID) ? 'border-success' : '',
			isEpisodeWatched(episode.UUID) ? 'bg-success bg-opacity-10' : '',
			isCurrentEpisode(episode.UUID) ? 'border-primary border-2' : '',
		]"
		@click="handleEpisodeClick(episode.UUID)"
		style="cursor: pointer"
	>
		<div class="card-body p-3">
			<div class="d-flex">
				<div class="flex-grow-1">
					<div class="d-flex align-items-center gap-3">
						<div
							:class="[
								'rounded d-flex align-items-center justify-content-center',
								isEpisodeWatched(episode.UUID) ? 'bg-success bg-opacity-25' : 'bg-secondary',
							]"
							style="width: 64px; height: 40px"
						>
							<font-awesome-icon v-if="isEpisodeWatched(episode.UUID)" :icon="['fas', 'check']" class="text-success" />
							<font-awesome-icon v-else :icon="['fas', 'play']" />
						</div>
						<div class="flex-grow-1">
							<h3 :class="['h6 mb-1', isEpisodeWatched(episode.UUID) ? 'text-success' : '']">
								Episode {{ episode.episode_IDX }}
								<small v-if="isEpisodeWatched(episode.UUID)" class="text-success ms-2">
									<font-awesome-icon :icon="['fas', 'check']" />
									Watched
								</small>
							</h3>
							<div class="d-flex gap-4">
								<p class="text-muted small mb-0">
									<font-awesome-icon :icon="['far', 'clock']" class="me-1" />
									<!-- 20min -->
									{{ msToReadable(averageWatchableEntitysRuntime(episode.watchableEntitys)) }}
								</p>
							</div>
							<p class="text-muted small mb-0">
								<font-awesome-icon :icon="['fa', 'language']" class="me-1" />
								{{ episode.watchableEntitys.map((e) => e.lang).join(', ') }}
								<small class="text-danger-emphasis" v-if="Array.isArray(additionalList) && additionalList.length > 0">
									{{
										additionalList
											?.filter((x) => x.parsed.season === episode!.season_IDX && x.parsed.episode === episode!.episode_IDX)
											.map((x) => x.parsed.language)
											.join(', ')
									}}
								</small>
							</p>
							<div v-if="authStore.loggedIn && authStore.user.settings.developerMode.value" class="text-muted small mb-0">
								<div class="small mb-0 row">
									<p class="mb-1 mt-1 col-4" v-for="entity in episode.watchableEntitys">
										{{ entity.UUID }} ({{ entity.subID }}) [{{ entity.lang }}] = {{ entity.runtime }}
									</p>
									<div class="col-12 d-flex gap-3">
										<p class="mb-0">
											{{ episode.UUID }}
										</p>
										<p class="mb-0">{{ episode.season_IDX }}x{{ episode.episode_IDX }}</p>
										<p class="mb-0">
											WH:&nbsp;
											{{
												indexStore.watchHistory
													.filter((w) => w.watchable_UUID === episode!.UUID)
													.map((w) => `${w.UUID} = ${w.watchTime}`)
													.join(', ')
											}}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div class="progress mt-3" style="width: 100%; height: 4px">
						<div
							:class="['progress-bar', isEpisodeWatched(episode.UUID) ? 'bg-success' : 'bg-secondary']"
							:style="{ width: getEpisodeProgress(episode.UUID) + '%' }"
						></div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div v-else-if="additionalItem != undefined" class="card cursor-disabled border-danger-subtle">
		<div class="card-body p-3">
			<div class="d-flex">
				<div class="flex-grow-1">
					<div class="d-flex align-items-center gap-3">
						<div :class="['rounded d-flex align-items-center justify-content-center', 'bg-secondary']" style="width: 64px; height: 40px">
							<font-awesome-icon :icon="['fas', 'xmark']" class="text-danger-emphasis" />
						</div>
						<div class="flex-grow-1">
							<h3 :class="['h6 mb-1', 'text-danger']">Episode {{ additionalItem.parsed.episode }}</h3>
							<div class="d-flex gap-4">
								<p class="small mb-0 text-danger-emphasis">Episode Missing</p>
							</div>
							<p class="text-muted small mb-0">
								<font-awesome-icon :icon="['fa', 'language']" class="me-1" />
								{{ additionalItem.parsed.language }}
							</p>
						</div>
					</div>
					<div class="progress mt-3" style="width: 100%; height: 4px">
						<div :class="['progress-bar', 'bg-danger']" :style="{ width: '0%' }"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div v-else>No Fallback available</div>
</template>

<script lang="ts" setup>
import type { DetailedEpisode, Langs } from '@cinefinn/types';
import { msToReadable } from '@cinefinn/utilities/time';

const indexStore = useIndexStore();
const authStore = useAuthStore();

export type AdditionalItem = {
	outPath: string;
	file: string;
	parsed: {
		movie: false;
		title: string;
		language: Langs;
		season: number;
		episode: number;
	};
};

const props = defineProps<{
	episode?: DetailedEpisode;
	additionalItem?: AdditionalItem;
	isEpisodeWatched: (episodeUUID: string) => boolean;
	getEpisodeProgress: (episodeUUID: string) => number;
	isCurrentEpisode: (episodeUUID: string) => boolean;
	handleEpisodeClick: (episodeUUID: string) => void;
	additionalList: AdditionalItem[] | undefined;
}>();
</script>

<style></style>
