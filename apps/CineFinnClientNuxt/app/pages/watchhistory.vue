<template>
	<div class="min-vh-100" data-bs-theme="dark">
		<!-- Header -->
		<header class="sticky-top border-bottom shadow-sm" style="backdrop-filter: blur(10px)">
			<div class="container py-3">
				<div class="d-flex align-items-center justify-content-between">
					<div class="d-flex align-items-center gap-3">
						<NuxtLink class="btn btn-link text-decoration-none p-2" to="/">
							<font-awesome-icon :icon="['fas', 'arrow-left']" size="lg" />
						</NuxtLink>
						<h1 class="h3 mb-0 fw-bold text-primary">Watch History</h1>
					</div>

					<!-- Toggle Switch -->
					<div class="btn-group" role="group" aria-label="View toggle">
						<input type="radio" class="btn-check" name="viewToggle" id="viewSeries" :value="false" v-model="showEntities" />
						<label class="btn btn-outline-primary" for="viewSeries">
							<font-awesome-icon :icon="['fas', 'tv']" class="me-2" />
							Series
						</label>

						<input type="radio" class="btn-check" name="viewToggle" id="viewEntities" :value="true" v-model="showEntities" />
						<label class="btn btn-outline-primary" for="viewEntities">
							<font-awesome-icon :icon="['fas', 'film']" class="me-2" />
							Episodes
						</label>
					</div>
				</div>
			</div>
		</header>

		<main class="container py-4">
			<!-- Loading State -->
			<div v-if="status === 'pending'" class="text-center py-5">
				<div class="spinner-border text-primary" role="status">
					<span class="visually-hidden">Loading...</span>
				</div>
			</div>

			<!-- Error State -->
			<div v-else-if="status === 'error'" class="text-center py-5">
				<div
					class="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
					style="width: 96px; height: 96px">
					<font-awesome-icon :icon="['fas', 'exclamation-triangle']" size="3x" class="text-danger" />
				</div>
				<h2 class="h4 fw-bold mb-2">Error Loading History</h2>
				<p class="text-muted mb-4">There was an error loading your watch history</p>
			</div>

			<!-- Empty State -->
			<div v-else-if="displayItems.length === 0" class="text-center py-5">
				<div
					class="bg-secondary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
					style="width: 96px; height: 96px">
					<font-awesome-icon :icon="['fas', 'clock-rotate-left']" size="3x" class="text-secondary" />
				</div>
				<h2 class="h4 fw-bold mb-2">No Watch History</h2>
				<p class="text-muted mb-4">Start watching content to see your history here</p>
				<NuxtLink class="btn btn-primary" to="/">
					<font-awesome-icon :icon="['fas', 'browse']" class="me-2" />
					Browse Content
				</NuxtLink>
			</div>

			<!-- Series View -->
			<div v-else-if="!showEntities">
				<h2 class="h5 fw-semibold mb-3">Series ({{ seriesItems.length }})</h2>
				<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-4">
					<div v-for="item in seriesItems" :key="item.series_UUID" class="col">
						<div class="card h-100 cursor-pointer" @click="navigateToSeries(item.series_UUID)">
							<div class="position-relative">
								<img
									:src="getSeriesImage(item.series_UUID)"
									class="card-img-top"
									:alt="getSeriesTitle(item.series_UUID)"
									style="height: 200px; object-fit: cover" />
								<div class="card-img-overlay d-flex align-items-end p-0">
									<div class="progress w-100" style="height: 4px; border-radius: 0">
										<div class="progress-bar bg-primary" :style="{ width: item.percentage + '%' }"></div>
									</div>
								</div>
							</div>
							<div class="card-body p-2">
								<h6 class="card-title text-truncate mb-1">{{ getSeriesTitle(item.series_UUID) }}</h6>
								<small class="text-muted">{{ item.watchedCount }} / {{ item.totalCount }} watched</small>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Entities View (Episodes/Movies) -->
			<div v-else>
				<h2 class="h5 fw-semibold mb-3">Episodes & Movies ({{ entityItems.length }})</h2>
				<div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 g-4">
					<div v-for="item in entityItems" :key="item.UUID" class="col">
						<div class="card h-100 cursor-pointer" @click="navigateToSeries(item.series_UUID)">
							<div class="position-relative">
								<img
									:src="getEntityThumbnail(item)"
									class="card-img-top"
									:alt="getSeriesTitle(item.series_UUID)"
									style="height: 140px; object-fit: cover" />
								<span v-if="item.watchable_UUID.startsWith('MO-')" class="badge bg-danger position-absolute top-0 start-0 m-2"
									>Movie</span
								>
								<span v-else class="badge bg-primary position-absolute top-0 start-0 m-2"
									>S{{ item.season_IDX }} E{{ item.episode_IDX }}</span
								>
								<div class="card-img-overlay d-flex align-items-end p-0">
									<div class="progress w-100" style="height: 4px; border-radius: 0">
										<div class="progress-bar bg-primary" :style="{ width: item.progressPercentage + '%' }"></div>
									</div>
								</div>
							</div>
							<div class="card-body p-2">
								<h6 class="card-title text-truncate mb-1">{{ getSeriesTitle(item.series_UUID) }}</h6>
								<small class="text-muted"> {{ formatWatchTime(item.watchTime) }} / {{ formatRuntime(item.runtime) }} </small>
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	</div>
</template>

<script setup lang="ts">
import type { FrontendSeries, WatchHistory } from '@cinefinn/types';
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

definePageMeta({
	middleware: 'auth',
});

type WatchHistoryWithDetails = WatchHistory & {
	runtime: number;
	season_IDX: number;
	episode_IDX: number;
	movie_IDX: number;
};

type SeriesWatchSummary = {
	series_UUID: string;
	watchedCount: number;
	totalCount: number;
	percentage: number;
	totalWatchTime: number;
};

const router = useRouter();
const indexStore = useIndexStore();

await callOnce('loadSeries', () => indexStore.loadSeries(), { mode: 'navigation' });

const showEntities = ref(false);

const { data: watchHistoryData, status } = useFetch<WatchHistoryWithDetails[]>(`${useAPIURL()}/watch/history`, {
	method: 'GET',
	key: 'watchHistory',
	headers: {
		'auth-token': useAuthStore().authToken,
	},
});

const watchHistory = computed(() => watchHistoryData.value || []);

const getSeriesTitle = (seriesUUID: string): string => {
	const series = indexStore.seriesById.get(seriesUUID);
	return series?.title || 'Unknown Series';
};

const getSeriesImage = (seriesUUID: string): string => {
	const series = indexStore.seriesById.get(seriesUUID);
	if (series?.infos?.imageURL) {
		const url = new URL(useAPIURL() + `/images/${seriesUUID}/cover.jpg`);
		url.searchParams.append('auth-token', useAuthStore().authToken);
		return url.href;
	}
	return 'https://via.placeholder.com/300x400?text=No+Image';
};

const getEntityThumbnail = (item: WatchHistoryWithDetails): string => {
	const series = indexStore.seriesById.get(item.series_UUID);
	const seriesUUID = item.series_UUID;

	if (item.watchable_UUID.startsWith('MO-')) {
		if (series?.infos?.imageURL) {
			const url = new URL(useAPIURL() + `/images/${seriesUUID}/cover.jpg`);
			url.searchParams.append('auth-token', useAuthStore().authToken);
			return url.href;
		}
	}

	const url = new URL(useAPIURL() + `/images/${seriesUUID}/previewImages/${item.watchable_UUID}/default.jpg`);
	url.searchParams.append('auth-token', useAuthStore().authToken);
	return url.href;
};

const formatWatchTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	if (mins >= 60) {
		const hours = Math.floor(mins / 60);
		const remainingMins = mins % 60;
		return `${hours}h ${remainingMins}m`;
	}
	return `${mins}m`;
};

const formatRuntime = (seconds: number): string => {
	if (seconds <= 0) return 'N/A';
	return formatWatchTime(seconds);
};

const seriesItems = computed((): SeriesWatchSummary[] => {
	const seriesMap = new Map<string, WatchHistoryWithDetails[]>();

	watchHistory.value.forEach((wh) => {
		if (!seriesMap.has(wh.series_UUID)) {
			seriesMap.set(wh.series_UUID, []);
		}
		seriesMap.get(wh.series_UUID)!.push(wh);
	});

	const result: SeriesWatchSummary[] = [];
	seriesMap.forEach((historyItems, seriesUUID) => {
		const totalWatchTime = historyItems.reduce((sum, item) => sum + item.watchTime, 0);
		const watchedCount = historyItems.filter((item) => {
			const runtime = item.runtime > 0 ? item.runtime : 600;
			return item.watchTime >= runtime * 0.8;
		}).length;

		let totalCount = 0;
		const series = indexStore.seriesById.get(seriesUUID);
		if (series) {
			totalCount = series.seasons.reduce((sum, s) => sum + s.episodes, 0) + series.movies.length;
		}

		result.push({
			series_UUID: seriesUUID,
			watchedCount,
			totalCount,
			percentage: totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0,
			totalWatchTime,
		});
	});

	return result.sort((a, b) => b.totalWatchTime - a.totalWatchTime);
});

const entityItems = computed(() => {
	return watchHistory.value
		.map((item) => ({
			...item,
			progressPercentage: item.runtime > 0 ? Math.min(100, Math.round((item.watchTime / item.runtime) * 100)) : 0,
		}))
		.sort((a, b) => b.watchTime - a.watchTime);
});

const displayItems = computed(() => {
	return showEntities.value ? entityItems.value : seriesItems.value;
});

const navigateToSeries = (seriesUUID: string) => {
	router.push(`/watch/${seriesUUID}`);
};
</script>

<style scoped>
.sticky-top {
	position: sticky;
	top: 0;
	z-index: 1010;
}

.cursor-pointer {
	cursor: pointer;
}

.card {
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;
}

.card:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.card-img-overlay {
	background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 50%);
}

.progress {
	background-color: rgba(255, 255, 255, 0.2);
}

.badge {
	font-size: 0.65rem;
	font-weight: 600;
}
</style>
