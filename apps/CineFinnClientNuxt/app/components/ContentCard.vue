<template>
	<div class="content-card" @click="$emit('click')">
		<div class="position-relative">
			<img :src="content.poster || '/placeholder.svg'" :alt="content.title" class="card-poster" />
			<span class="card-badge" :class="content.type">
				{{ content.type === 'movie' ? 'Movie' : 'Series' }}
			</span>
		</div>
		<div class="card-content">
			<h6 class="card-title">{{ content.title }}</h6>
			<div class="card-meta">
				<font-awesome-icon :icon="['fa-solid', 'fa-calendar']" />
				<span>{{ content.year }}</span>
				<span class="mx-1">•</span>
				<font-awesome-icon :icon="['fa-solid', 'fa-clock']" />
				<span>{{ content.duration }}</span>
			</div>
			<div class="card-genres">
				<span v-for="genre in content.genre.slice(0, 2)" :key="genre" class="genre-tag">
					{{ genre }}
				</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Content {
	id: string;
	title: string;
	year: number;
	rating: number;
	duration: string;
	description: string;
	poster: string;
	type: 'movie' | 'series';
	genre: string[];
}

defineProps<{
	content: Content;
}>();

defineEmits<{
	click: [];
}>();
</script>

<style scoped>
.content-card {
	position: relative;
	border-radius: 12px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.05);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
	height: 100%;
}

.content-card:hover {
	transform: translateY(-4px) scale(1.02);
	border-color: rgba(255, 255, 255, 0.2);
	box-shadow:
		0 20px 40px rgba(0, 0, 0, 0.4),
		0 0 0 1px rgba(255, 255, 255, 0.1);
}

.card-poster {
	aspect-ratio: 2/3;
	width: 100%;
	object-fit: cover;
	display: block;
}

.card-badge {
	position: absolute;
	top: 0.75rem;
	right: 0.75rem;
	background: rgba(0, 0, 0, 0.7);
	backdrop-filter: blur(4px);
	padding: 0.25rem 0.75rem;
	border-radius: 100px;
	font-size: 0.75rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border: 1px solid rgba(255, 255, 255, 0.1);
	color: white;
}

.card-badge.movie {
	background: rgba(239, 68, 68, 0.2);
	border-color: rgba(239, 68, 68, 0.4);
	color: #fca5a5;
}

.card-badge.series {
	background: rgba(59, 130, 246, 0.2);
	border-color: rgba(59, 130, 246, 0.4);
	color: #93c5fd;
}

.card-content {
	padding: 1rem;
}

.card-title {
	font-weight: 600;
	font-size: 0.95rem;
	margin-bottom: 0.5rem;
	color: white;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: 1.3;
}

.card-meta {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: rgba(255, 255, 255, 0.5);
	font-size: 0.8rem;
	margin-bottom: 0.5rem;
}

.card-genres {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	margin-top: 0.75rem;
}

.genre-tag {
	font-size: 0.7rem;
	padding: 0.25rem 0.5rem;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 4px;
	color: rgba(255, 255, 255, 0.7);
}
</style>
