<template>
	<div
		class="series-card"
		:class="{ 'is-active': isActive }"
		@click="handleCardClick"
		tabindex="0"
		@focus="handleFocus"
		@blur="handleBlur"
		@mouseenter="handleMouseEnter"
		@mouseleave="handleMouseLeave">
		<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
			<img :src="seriesImage" class="series-thumb" :alt="item.title" loading="lazy" />
			<div class="series-overlay" :class="{ visible: isActive || isHovered }">
				<div class="series-overlay-actions">
					<button class="sov-btn sov-btn-light" @click.stop="$emit('navigate', item.UUID)">
						<font-awesome-icon :icon="['fas', 'play']" />
					</button>
					<button class="sov-btn" :class="{ 'sov-btn-danger': showRemoveButton }" @click.stop="$emit('addToList', item.UUID)">
						<font-awesome-icon :icon="['fas', showRemoveButton ? 'minus' : 'plus']" />
					</button>
					<button class="sov-btn ms-auto" @click.stop="$emit('showInfo', item.UUID)">
						<font-awesome-icon :icon="['fas', 'chevron-down']" />
					</button>
				</div>
				<p class="sov-title">{{ item.title }}</p>
				<div class="sov-meta">
					<span class="sov-year">{{ yearLabel }}</span>
				</div>
				<div class="sov-genres">
					<span v-for="g in (item.tags || []).slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
				</div>
			</div>
			<span v-if="showNewRibbon" class="new-ribbon">NEU</span>
			<div v-if="showEpisodeCount && totalEpisodeCount > 0" class="episode-count-badge">
				<font-awesome-icon :icon="['fas', 'film']" class="me-1" />
				{{ totalEpisodeCount }} Folgen
			</div>
		</div>
		<div class="series-info">
			<p class="series-label-title">{{ item.title }}</p>
			<p class="series-label-year">{{ yearLabel }}</p>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { FrontendSeries } from '@cinefinn/types/database';
import { decideSeriesImage } from '~/utils/utils';

const props = defineProps<{
	item: FrontendSeries;
	showNewRibbon?: boolean;
	showEpisodeCount?: boolean;
	showRemoveButton?: boolean;
}>();

defineEmits<{
	(event: 'navigate', id: string): void;
	(event: 'addToList', id: string): void;
	(event: 'showInfo', id: string): void;
}>();

const isActive = ref(false);
const isHovered = ref(false);

const randomNumber = Math.floor(Math.random() * 1000);
const seriesImage = computed(() => decideSeriesImage(props.item, randomNumber));

const totalEpisodeCount = computed(() => {
	return (props.item.seasons || []).reduce((sum, s) => sum + (s?.episodes || 0), 0);
});

const yearLabel = computed(() => {
	const start = props.item.infos?.startDate?.split('-')[0] || '';
	const end = props.item.infos?.endDate?.split('-')[0] || '';
	if (!start) return '';
	if (!end) return `${start}–`;
	if (start === end) return start;
	return `${start}–${end}`;
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
.series-card {
	flex-shrink: 0;
	width: 230px;
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
	width: 230px;
	height: 250px;
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
		width: 150px;
	}
	.series-thumb-wrap {
		width: 150px;
		height: 165px;
	}
	.series-info {
		max-width: 150px;
	}
}

@media (max-width: 480px) {
	.series-card {
		width: 130px;
	}
	.series-thumb-wrap {
		width: 130px;
		height: 143px;
	}
	.series-info {
		max-width: 130px;
	}
}
</style>
