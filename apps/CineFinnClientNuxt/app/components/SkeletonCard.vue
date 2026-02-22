<template>
	<div class="skeleton-card card">
		<div class="skeleton-image"></div>
		<div class="card-body" v-if="showBody">
			<div class="skeleton-title"></div>
			<div class="skeleton-text">
				<div class="skeleton-line"></div>
				<div class="skeleton-line"></div>
				<div class="skeleton-line short"></div>
			</div>
			<div class="skeleton-footer">
				<div class="skeleton-button"></div>
			</div>
		</div>
		<div v-if="showFooter" class="card-footer">
			<div class="skeleton-footer-line"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
	showBody?: boolean;
	showFooter?: boolean;
}>(), {
	showBody: true,
	showFooter: true,
});
</script>

<style scoped>
.skeleton-card {
	background: #1a1a1a;
	border: 1px solid #2d2d2d;
	overflow: hidden;
}

.skeleton-image {
	width: 100%;
	padding-top: 150%;
	background: linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
}

.skeleton-title {
	height: 24px;
	width: 80%;
	background: linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: 4px;
	margin-bottom: 12px;
}

.skeleton-text {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.skeleton-line {
	height: 14px;
	width: 100%;
	background: linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: 4px;
}

.skeleton-line.short {
	width: 60%;
}

.skeleton-footer {
	margin-top: 16px;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.skeleton-button {
	height: 32px;
	width: 80px;
	background: linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: 4px;
}

.skeleton-footer-line {
	height: 16px;
	width: 50%;
	background: linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%);
	background-size: 200% 100%;
	animation: shimmer 1.5s infinite;
	border-radius: 4px;
}

@keyframes shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}
</style>
