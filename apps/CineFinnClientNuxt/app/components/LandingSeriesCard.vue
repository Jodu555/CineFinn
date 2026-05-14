<template>
	<div
		class="series-card"
		:class="{ 'is-active': isActive }"
		@click="handleCardClick"
		tabindex="0"
		@focus="handleFocus"
		@blur="handleBlur"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave"
	>
		<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
			<img :src="itemImage" class="series-thumb" :alt="itemTitle" loading="lazy" />
			<span v-if="props.showItemBadge" class="type-badge" :class="isMovie ? 'movie' : 'series'">
				{{ isMovie ? 'Movie' : 'Series' }}
			</span>
			<div class="series-overlay" :class="{ visible: isActive || isHovered }">
				<div class="series-overlay-actions">
					<button v-if="fnNavigation" class="sov-btn sov-btn-light" @click.stop="$emit('navigate', itemId)">
						<font-awesome-icon :icon="['fas', 'play']" />
					</button>
					<NuxtLink v-else class="sov-btn sov-btn-light" :to="to">
						<font-awesome-icon :icon="['fas', 'play']" />
					</NuxtLink>

					<button v-if="!isMovie" class="sov-btn" :class="{ 'sov-btn-danger': showRemoveButton }" @click.stop="$emit('addToList', itemId)">
						<font-awesome-icon :icon="['fas', showRemoveButton ? 'minus' : 'plus']" />
					</button>
					<!-- <button class="sov-btn ms-auto" @click.stop="$emit('showInfo', itemId)">
						<font-awesome-icon :icon="['fas', 'chevron-down']" />
					</button> -->
				</div>
				<p class="sov-title">{{ itemTitle }}</p>
				<div class="sov-meta">
					<span class="sov-year">{{ yearLabel }}</span>
					<span v-if="isMovie" class="sov-duration">{{ movieDuration }}</span>
				</div>
				<div class="sov-genres">
					<span v-for="g in itemGenres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
				</div>
			</div>
			<span v-if="showNewRibbon && !isMovie" class="new-ribbon">NEU</span>
			<div v-if="!isActive && !isHovered">
				<div v-if="!isMovie && showEpisodeCount && totalEpisodeCount > 0" class="episode-count-badge">
					<font-awesome-icon :icon="['fas', 'film']" class="me-1" />
					{{ totalEpisodeCount }} Folgen
				</div>
				<div v-if="isMovie" class="episode-count-badge">
					<font-awesome-icon :icon="['fas', 'film']" class="me-1" />
					{{ yearLabel }}
				</div>
			</div>
		</div>
		<div class="series-info">
			<p class="series-label-title">{{ itemTitle }}</p>
			<p class="series-label-year">{{ yearLabel }}</p>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { averageWatchableEntitysRuntime } from '#imports';
import type { FrontendSeries, Movie, WatchableEntity } from '@cinefinn/types';
import type { FranchiseContentMovie, FranchiseContentMovieExtened } from '@cinefinn/types/models/franchise';
import { msToReadable } from '@cinefinn/utilities/time';

const { decideSeriesImage } = useSeriesImage();

const props = defineProps<{
	/**
	 * The series item to show (if no movie item is provided)
	 */
	seriesItem?: FrontendSeries;
	/**
	 * The movie item to show (if no series item is provided)
	 */
	movieItem?: FranchiseContentMovieExtened;
	/**
	 * Whether to show the new ribbon
	 */
	showNewRibbon?: boolean;
	/**
	 * Whether to show the episode count badge
	 */
	showEpisodeCount?: boolean;
	/**
	 * Whether to show the playlist remove button
	 */
	showRemoveButton?: boolean;
	/**
	 * Whether to show the item type badge (Series / Movie)
	 */
	showItemBadge?: boolean;
	/**
	 * Whether to emit a navigation event and let the caller handle the navigation or use a router link
	 */
	fnNavigation?: boolean;
	/**
	 * The router link to navigate to if fnNavigation is false
	 */
	to?: string;
}>();

defineEmits<{
	(event: 'navigate', id: string): void;
	(event: 'addToList', id: string): void;
	(event: 'showInfo', id: string): void;
}>();

const isActive = ref(false);
const isHovered = ref(false);

const isMovie = computed(() => !!props.movieItem);
const hasSeries = computed(() => !!props.seriesItem);
const hasValidItem = computed(() => isMovie.value || hasSeries.value);

const itemId = computed(() => {
	if (isMovie.value) return props.movieItem!.id;
	if (hasSeries.value) return props.seriesItem!.UUID;
	return '';
});

const itemTitle = computed(() => {
	if (isMovie.value) return props.movieItem!.item.primaryName;
	if (hasSeries.value) return props.seriesItem!.title;
	return 'Loading...';
});

const itemGenres = computed(() => {
	if (isMovie.value) return [];
	// if (isMovie.value) return props.movieItem!.genre;
	if (hasSeries.value) return props.seriesItem!.tags || [];
	return [];
});

const movieDuration = computed(() => {
	if (!isMovie.value) return '';
	return msToReadable(averageWatchableEntitysRuntime(props.movieItem!.watchableEntities), { millis: false, seconds: false });
});

const randomNumber = Math.floor(Math.random() * 1000);
const itemImage = computed(() => {
	if (isMovie.value) {
		return props.movieItem!.poster || '/placeholder.svg';
	}
	if (hasSeries.value) {
		return decideSeriesImage(props.seriesItem!, randomNumber);
	}
	return '/placeholder.svg';
});

const totalEpisodeCount = computed(() => {
	if (isMovie.value || !hasSeries.value) return 0;
	return (props.seriesItem!.seasons || []).reduce((sum, s) => sum + (s?.episodes || 0), 0);
});

const yearLabel = computed(() => {
	if (isMovie.value) {
		return String(props.movieItem!.year);
	}
	if (hasSeries.value) {
		const start = props.seriesItem!.infos?.startDate?.split('-')[0] || '';
		const end = props.seriesItem!.infos?.endDate?.split('-')[0] || '';
		if (!start) return '';
		if (!end) return `${start}–`;
		if (start === end) return start;
		return `${start}–${end}`;
	}
	return '';
});

const handleCardClick = () => {
	isActive.value = !isActive.value;
};

const handleMouseEnter = () => {
	isHovered.value = true;
};

const handleMouseLeave = () => {
	isHovered.value = false;
};

const handleFocus = () => {
	isHovered.value = true;
};

const handleBlur = () => {
	isHovered.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
	const target = event.target as HTMLElement;
	if (!target.closest('.series-card')) {
		isActive.value = false;
	}
};

onMounted(() => {
	document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
* {
	--cs-bg: #090910;
	--cs-surface: #11111a;
	--cs-accent: #e5091a;
	--cs-accent-glow: rgba(229, 9, 26, 0.35);
	--cs-text: #eeeef5;
	--cs-muted: #7777a0;
	--cs-overlay: linear-gradient(to top, rgba(5, 5, 15, 0.97) 0%, rgba(5, 5, 15, 0.7) 55%, transparent 100%);
	--radius: 10px;
	--t: 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}

.series-card {
	flex-shrink: 0;
	width: 100%;
	max-width: 230px;
	cursor: pointer;
	margin: 0 auto;
	outline: none;
}

.series-card:focus-visible {
	outline: 2px solid var(--cs-accent);
	outline-offset: 2px;
	border-radius: var(--radius);
}

.series-thumb-wrap {
	width: 100%;
	aspect-ratio: 2/3;
	background: var(--cs-surface);
	border-radius: var(--radius) !important;
}

.series-thumb {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	border-radius: var(--radius);
	transition:
		transform var(--t),
		box-shadow var(--t);
}

.series-card:hover .series-thumb,
.series-card.is-active .series-thumb {
	transform: scale(1.05);
	box-shadow: 0 14px 42px rgba(0, 0, 0, 0.75);
}

@media (hover: none) and (pointer: coarse) {
	.series-card:hover .series-thumb {
		transform: none;
		box-shadow: none;
	}
}

.series-overlay {
	position: absolute;
	inset: 0;
	background: var(--cs-overlay);
	border-radius: var(--radius);
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	padding: 10px;
	opacity: 0;
	transition: opacity var(--t);
}

.series-overlay.visible {
	opacity: 1 !important;
}

.series-card:hover .series-overlay {
	opacity: 1 !important;
}

@media (hover: none) and (pointer: coarse) {
	.series-card:hover .series-overlay {
		opacity: 0;
	}

	.series-card.is-active .series-overlay {
		opacity: 1;
	}
}

.series-overlay-actions {
	display: flex;
	gap: 6px;
	align-items: center;
	margin-bottom: 8px;
}

.sov-btn {
	width: 30px;
	height: 30px;
	border-radius: 50% !important;
	border: 1.5px solid rgba(255, 255, 255, 0.55);
	background: rgba(0, 0, 0, 0.5);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 0.72rem;
	cursor: pointer;
	padding: 0;
	transition:
		background var(--t),
		transform 0.15s;
}

.sov-btn:hover,
.sov-btn:focus {
	background: rgba(255, 255, 255, 0.22);
	transform: scale(1.12);
}

.sov-btn-light {
	background: #fff !important;
	color: #000 !important;
	border-color: #fff !important;
}

.sov-btn-light:hover {
	background: #ddd !important;
}

.sov-btn-danger {
	border-color: var(--cs-accent) !important;
}

.sov-btn-danger:hover {
	background: var(--cs-accent) !important;
	border-color: var(--cs-accent) !important;
}

.sov-title {
	margin: 0 0 5px;
	font-size: 0.82rem;
	font-weight: 700;
	color: #fff;
	line-height: 1.25;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.sov-meta {
	display: flex;
	align-items: center;
	gap: 6px;
	margin-bottom: 5px;
}

.sov-year {
	font-size: 0.72rem;
	color: rgba(255, 255, 255, 0.6);
}

.sov-genres {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

.genre-chip {
	font-size: 0.62rem;
	padding: 2px 7px;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 20px;
	color: rgba(255, 255, 255, 0.65);
	letter-spacing: 0.01em;
}

.type-badge {
	position: absolute;
	top: 10px;
	right: 10px;
	padding: 3px 8px;
	border-radius: 100px;
	font-size: 0.62rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border: 1px solid rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(4px);
	z-index: 5;
}

.type-badge.movie {
	background: rgba(239, 68, 68, 0.25);
	color: #fca5a5;
	border-color: rgba(239, 68, 68, 0.4);
}

.type-badge.series {
	background: rgba(59, 130, 246, 0.25);
	color: #93c5fd;
	border-color: rgba(59, 130, 246, 0.4);
}

.new-ribbon {
	position: absolute;
	top: 10px;
	left: -1px;
	background: var(--cs-accent);
	color: #fff;
	font-size: 0.62rem;
	font-weight: 700;
	padding: 3px 8px 3px 6px;
	letter-spacing: 0.06em;
	border-radius: 0 4px 4px 0;
	box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
}

.episode-count-badge {
	position: absolute;
	bottom: 8px;
	left: 8px;
	background: rgba(0, 0, 0, 0.72);
	backdrop-filter: blur(4px);
	color: rgba(255, 255, 255, 0.85);
	font-size: 0.62rem;
	padding: 3px 7px;
	border-radius: 6px;
}

.series-info {
	padding: 6px 2px 0;
	max-width: 230px;
}

.series-label-title {
	margin: 0 0 2px;
	font-size: 0.82rem;
	font-weight: 600;
	color: var(--cs-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.series-label-year {
	margin: 0;
	font-size: 0.72rem;
	color: var(--cs-muted);
}

@media (max-width: 768px) {
	.series-card {
		max-width: 150px;
	}
	.series-thumb-wrap {
		width: 100%;
		height: 165px;
	}
	.series-info {
		max-width: 100%;
	}
}

@media (max-width: 480px) {
	.series-card {
		max-width: 130px;
	}
	.series-thumb-wrap {
		width: 100%;
		height: 143px;
	}
	.series-info {
		max-width: 100%;
	}
}
</style>
