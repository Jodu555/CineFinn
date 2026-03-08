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
			<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
			<div class="series-overlay" :class="{ visible: isActive || isHovered }">
				<div class="series-overlay-actions">
					<button class="sov-btn sov-btn-light" @click.stop="$emit('navigate', item.id)">
						<font-awesome-icon :icon="['fas', 'play']" />
					</button>
					<button class="sov-btn" :class="{ 'sov-btn-danger': showRemoveButton }" @click.stop="$emit('addToList', item.id)">
						<font-awesome-icon :icon="['fas', showRemoveButton ? 'minus' : 'plus']" />
					</button>
					<button class="sov-btn ms-auto" @click.stop="$emit('showInfo', item.id)">
						<font-awesome-icon :icon="['fas', 'chevron-down']" />
					</button>
				</div>
				<p class="sov-title">{{ item.title }}</p>
				<div class="sov-meta">
					<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
					<span class="sov-year">{{ yearLabel }}</span>
				</div>
				<div class="sov-genres">
					<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
				</div>
			</div>
			<span v-if="showNewRibbon" class="new-ribbon">NEU</span>
			<div v-if="showEpisodeCount && item.episodeCount" class="episode-count-badge">
				<font-awesome-icon :icon="['fas', 'film']" class="me-1" />
				{{ item.episodeCount }} Folgen
			</div>
		</div>
		<div class="series-info">
			<p class="series-label-title">{{ item.title }}</p>
			<p class="series-label-year">{{ yearLabel }}</p>
		</div>
	</div>
</template>

<script lang="ts" setup>
interface Series {
	id: number;
	title: string;
	description: string;
	cover: string;
	yearStart: number;
	yearEnd: number | null;
	genres: string[];
	rating: string;
	episodeCount?: number;
	_hovered?: boolean;
}

const props = defineProps<{
	item: Series;
	showNewRibbon?: boolean;
	showEpisodeCount?: boolean;
	showRemoveButton?: boolean;
}>();

defineEmits<{
	(event: 'navigate', id: number): void;
	(event: 'addToList', id: number): void;
	(event: 'showInfo', id: number): void;
}>();

const isActive = ref(false);
const isHovered = ref(false);

const yearLabel = computed(() => {
	if (!props.item.yearEnd) return `${props.item.yearStart}–`;
	if (props.item.yearStart === props.item.yearEnd) return `${props.item.yearStart}`;
	return `${props.item.yearStart}–${props.item.yearEnd}`;
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
	opacity: 1;
}

.series-card:hover .series-overlay {
	opacity: 1;
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
