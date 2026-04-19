<template>
	<div class="franchise-page min-vh-100 text-white">
		<!-- Loading Spinner -->
		<div v-if="false" class="d-flex justify-content-center align-items-center min-vh-100">
			<div class="spinner-border text-primary" role="status" style="width: 4rem; height: 4rem"></div>
		</div>

		<!-- Not Found -->
		<div v-else-if="!franchise" class="d-flex justify-content-center align-items-center min-vh-100 text-center">
			<div>
				<h1 class="fw-bold mb-4 display-4">Franchise Not Found</h1>
				<button class="btn btn-outline-light btn-lg px-4 rounded-pill" @click="goBack">
					<font-awesome-icon :icon="['fa-solid', 'fa-arrow-left']" class="me-2" />
					Go Back
				</button>
			</div>
		</div>

		<!-- Franchise Page -->
		<div v-else>
			<!-- Hero Section -->
			<div class="hero-section position-relative">
				<div class="hero-image-wrapper">
					<img :src="franchise.backgroundImage || '/placeholder.svg'" :alt="franchise.name" class="hero-image" />
					<div class="hero-overlay"></div>
				</div>

				<div class="hero-content position-absolute bottom-0 start-0 end-0">
					<div class="container px-4 px-lg-5 pb-5">
						<div class="row align-items-end">
							<div class="col-lg-8">
								<div :initial="{ opacity: 0, y: 30 }" :animate="{ opacity: 1, y: 0 }" class="franchise-logo mb-4">
									<img :src="franchise.logo || '/placeholder.svg'" :alt="`${franchise.name} logo`" class="img-fluid franchise-logo-img" />
								</div>
								<p class="hero-description lead mb-4 text-white-50">{{ franchise.description }}</p>
								<div class="franchise-meta d-flex gap-4 text-white-50">
									<div class="meta-item">
										<span class="meta-number">{{ franchise.totalContent }}</span>
										<span class="meta-label ms-2">Titles</span>
									</div>
									<div class="meta-divider"></div>
									<div class="meta-item">
										<span class="meta-number">{{ franchise.subFranchises.length }}</span>
										<span class="meta-label ms-2">Collections</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Sticky Sub-Franchise Navigation -->
			<div class="sub-franchise-nav sticky-top" ref="stickyNav" :class="{ 'nav-scrolled': isNavScrolled }">
				<div class="container px-4 px-lg-5">
					<div class="nav-track-outer">
						<!-- Left scroll button -->
						<button
							class="nav-scroll-btn nav-scroll-btn--left"
							:class="{ visible: canScrollLeft }"
							@click="scrollNav(-1)"
							aria-label="Scroll navigation left"
						>
							<font-awesome-icon :icon="['fa-solid', 'fa-chevron-left']" />
						</button>

						<!-- Left fade mask -->
						<div class="nav-fade nav-fade--left" :class="{ visible: canScrollLeft }"></div>

						<!-- Scrollable pills wrapper -->
						<div class="nav-wrapper d-flex align-items-center gap-2 py-3" ref="navWrapper" @scroll="updateScrollState">
							<button class="nav-pill" :class="{ active: activeSection === 'all' }" @click="scrollToSection('all')">
								<span class="nav-icon">
									<font-awesome-icon :icon="['fa-solid', 'fa-grip']" />
								</span>
								<span class="nav-text">All Content</span>
							</button>

							<div class="nav-divider"></div>

							<button
								v-for="sf in franchise.subFranchises"
								:key="sf.id"
								class="nav-pill"
								:class="{ active: activeSection === sf.id }"
								@click="scrollToSection(sf.id)"
							>
								<span class="nav-text">{{ sf.name }}</span>
								<span class="nav-count">{{ sf.content.length }}</span>
							</button>
						</div>

						<!-- Right fade mask -->
						<div class="nav-fade nav-fade--right" :class="{ visible: canScrollRight }"></div>

						<!-- Right scroll button -->
						<button
							class="nav-scroll-btn nav-scroll-btn--right"
							:class="{ visible: canScrollRight }"
							@click="scrollNav(1)"
							aria-label="Scroll navigation right"
						>
							<font-awesome-icon :icon="['fa-solid', 'fa-chevron-right']" />
						</button>
					</div>
				</div>
			</div>

			<!-- Content Sections -->
			<div class="content-sections py-5">
				<div class="container px-4 px-lg-5">
					<!-- All Content Grid -->
					<div id="section-all" class="content-section mb-5" ref="sectionAll">
						<div class="section-header mb-4 d-flex align-items-center justify-content-between">
							<div>
								<h2 class="section-title h3 mb-1">All Content</h2>
								<p class="section-subtitle text-white-50 mb-0">Complete {{ franchise.name }} collection</p>
							</div>
						</div>

						<div class="content-grid row g-4">
							<div v-for="content in allContent" :key="content.id" class="col-6 col-sm-4 col-md-3 col-xl-2">
								<LandingSeriesCard
									v-if="content.type === 'series'"
									:show-item-badge="true"
									:series-item="indexStore.seriesById.get(content.id)"
									show-episode-count
									@navigate="watchContent"
									@show-info="showContentInfo"
								/>
								<LandingSeriesCard
									v-else
									:show-item-badge="true"
									:movie-item="content"
									show-episode-count
									@navigate="watchContent"
									@show-info="showContentInfo"
								/>
							</div>
						</div>
					</div>

					<!-- Individual Sub-Franchise Sections -->
					<div
						v-for="sf in franchise.subFranchises"
						:key="sf.id"
						:id="`section-${sf.id}`"
						class="content-section sub-franchise-section mb-5"
						:data-section="sf.id"
					>
						<!-- Sub-Franchise Header -->
						<div class="sub-franchise-header mb-4 p-4 rounded-4 bg-glass">
							<div class="row align-items-center g-4">
								<div class="col-auto">
									<div class="sub-franchise-logo-wrapper">
										<img :src="sf.logo || '/placeholder.svg'" :alt="sf.name" class="sub-franchise-logo" />
									</div>
								</div>
								<div class="col">
									<h2 class="sub-franchise-title h4 mb-2">{{ sf.name }}</h2>
									<p class="sub-franchise-desc text-white-50 mb-0">{{ sf.description }}</p>
								</div>
								<div class="col-auto">
									<span class="content-count-badge"> {{ sf.content.length }} Titles </span>
								</div>
							</div>
						</div>

						<!-- Content Grid for this Sub-Franchise -->
						<div class="content-grid row g-4">
							<div v-for="content in sf.content" :key="content.id" class="col-6 col-sm-4 col-md-3 col-xl-2">
								<LandingSeriesCard
									v-if="content.type === 'series'"
									:show-item-badge="true"
									:series-item="indexStore.seriesById.get(content.id)"
									show-episode-count
									@navigate="watchContent"
									@show-info="showContentInfo"
								/>
								<LandingSeriesCard
									v-else
									:show-item-badge="true"
									:movie-item="content"
									show-episode-count
									@navigate="watchContent"
									@show-info="showContentInfo"
								/>
							</div>
						</div>
					</div>

					<!-- Empty State -->
					<div v-if="franchise.subFranchises.length === 0 && franchise.mainContent.length === 0" class="text-center py-5 text-secondary">
						<font-awesome-icon :icon="['fa-solid', 'fa-film']" class="display-1 mb-3 opacity-25" />
						<p class="lead">No content available for this franchise.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LandingSeriesCard from '~/components/LandingSeriesCard.vue';
import { useIndexStore } from '~/stores/index.store';
import type { FranchiseData, FranchiseDataExtended } from '@cinefinn/types/models/franchise';

const authStore = useAuthStore();
const indexStore = useIndexStore();
const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;

definePageMeta({
	middleware: 'auth',
});

const { data: franchise } = useFetch<FranchiseDataExtended>(`${useAPIURL()}/franchise/${slug}`, {
	key: 'franchise',
	server: true,
	headers: {
		'auth-token': authStore.authToken,
	},
});

const activeSection = ref('all');
const isNavScrolled = ref(false);
const stickyNav = ref<HTMLElement | null>(null);
const navWrapper = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

// How many pixels to scroll per button click
const NAV_SCROLL_STEP = 240;

useSeoMeta({
	title: computed(() => (franchise.value ? `Cinema | ${franchise.value.name}` : 'Cinema | Franchise')),
	description: computed(() => franchise.value?.description || ''),
});

const allContent = computed(() => {
	if (!franchise.value) return [];
	return [...franchise.value.mainContent, ...franchise.value.subFranchises.flatMap((sf) => sf.content)];
});

// ─── Nav overflow helpers ─────────────────────────────────────────────────────

const updateScrollState = () => {
	const el = navWrapper.value;
	if (!el) return;
	// Small epsilon (2px) to avoid float rounding jitter
	canScrollLeft.value = el.scrollLeft > 2;
	canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
};

const scrollNav = (direction: 1 | -1) => {
	const el = navWrapper.value;
	if (!el) return;
	el.scrollBy({ left: direction * NAV_SCROLL_STEP, behavior: 'smooth' });
};

/** Scroll the active pill into view inside the nav strip */
const scrollActivePillIntoView = (sectionId: string) => {
	nextTick(() => {
		const el = navWrapper.value;
		if (!el) return;
		const activePill = el.querySelector<HTMLElement>(`.nav-pill.active`);
		if (!activePill) return;
		const pillLeft = activePill.offsetLeft;
		const pillRight = pillLeft + activePill.offsetWidth;
		const containerLeft = el.scrollLeft;
		const containerRight = containerLeft + el.clientWidth;

		if (pillLeft < containerLeft + 40) {
			el.scrollTo({ left: pillLeft - 16, behavior: 'smooth' });
		} else if (pillRight > containerRight - 40) {
			el.scrollTo({ left: pillRight - el.clientWidth + 16, behavior: 'smooth' });
		}
	});
};

// ─── Page scroll helpers ──────────────────────────────────────────────────────

onMounted(() => {
	if (process.client) {
		window.addEventListener('scroll', handleScroll, { passive: true });
		setupIntersectionObserver();

		// Initial check once nav is rendered
		nextTick(() => {
			updateScrollState();

			// Re-check whenever nav wrapper is resized (e.g. orientation change)
			if (navWrapper.value && typeof ResizeObserver !== 'undefined') {
				const ro = new ResizeObserver(updateScrollState);
				ro.observe(navWrapper.value);
				onUnmounted(() => ro.disconnect());
			}
		});
	}
});

onUnmounted(() => {
	if (process.client) {
		window.removeEventListener('scroll', handleScroll);
	}
});

const goBack = () => router.back();

const handleScroll = () => {
	isNavScrolled.value = window.scrollY > 100;
};

const scrollToSection = (sectionId: string) => {
	const element = document.getElementById(`section-${sectionId}`);
	if (element) {
		const navHeight = stickyNav.value?.offsetHeight || 60;
		const navbarHeight = 60;
		const totalOffset = navHeight + navbarHeight + 20;

		const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
		window.scrollTo({ top: elementPosition - totalOffset, behavior: 'smooth' });
		activeSection.value = sectionId;
		scrollActivePillIntoView(sectionId);
	}
};

const setupIntersectionObserver = () => {
	if (!process.client) return;

	nextTick(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const sectionId = entry.target.getAttribute('data-section') || 'all';
						activeSection.value = sectionId;
						scrollActivePillIntoView(sectionId);
					}
				});
			},
			{
				rootMargin: '-20% 0px -60% 0px',
				threshold: 0,
			},
		);

		document.querySelectorAll('.content-section').forEach((section) => {
			observer.observe(section);
		});
	});
};

const watchContent = (contentId: string) => {
	router.push(`/watch/${contentId}`);
};

const showContentInfo = (contentId: string) => {
	console.log('Show info:', contentId);
};
</script>

<style scoped>
/* CSS Variables for the dark theme */
.franchise-page {
	--franchise-bg: oklch(0.1436 0.0152 284.32);
	--franchise-surface: oklch(0.2 0.02 284.32);
	--franchise-accent: #3b82f6;
	--franchise-glass: rgba(255, 255, 255, 0.05);
	--franchise-glass-border: rgba(255, 255, 255, 0.1);
}

/* ─── Hero Section ─────────────────────────────────────────────────────────── */
.hero-section {
	height: 70vh;
	position: relative;
	overflow: hidden;
}

.hero-image-wrapper {
	position: absolute;
	inset: 0;
}

.hero-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
	transform: scale(1.1);
	animation: subtleZoom 20s ease-out forwards;
}

@keyframes subtleZoom {
	to {
		transform: scale(1);
	}
}

.hero-overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(to top, oklch(0.1436 0.0152 284.32) 0%, rgba(9, 9, 16, 0.8) 30%, rgba(9, 9, 16, 0.4) 60%, transparent 100%);
}

.hero-content {
	z-index: 2;
	background: linear-gradient(to top, oklch(0.1436 0.0152 284.32), transparent);
	padding-bottom: 2rem;
}

.franchise-logo-img {
	max-height: 180px;
	width: auto;
	filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
}

.hero-description {
	max-width: 600px;
	line-height: 1.7;
	font-size: 1.125rem;
}

.franchise-meta {
	padding-top: 1rem;
	border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.meta-number {
	font-size: 1.5rem;
	font-weight: 700;
	color: white;
}

.meta-label {
	text-transform: uppercase;
	letter-spacing: 0.05em;
	font-size: 0.875rem;
}

.meta-divider {
	width: 1px;
	height: 30px;
	background: rgba(255, 255, 255, 0.2);
}

/* ─── Sticky Navigation ────────────────────────────────────────────────────── */
.sub-franchise-nav {
	top: 56px;
	z-index: 1020;
	background: transparent;
	transition:
		background 0.3s ease,
		border-color 0.3s ease,
		box-shadow 0.3s ease;
	border-bottom: 1px solid transparent;
}

.nav-scrolled {
	background: color-mix(in oklab, var(--bs-body-bg) 85%, transparent);
	backdrop-filter: blur(12px);
	border-bottom-color: var(--franchise-glass-border);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* ─── Nav track: scroll buttons + fades + pill strip ──────────────────────── */
.nav-track-outer {
	position: relative;
	display: flex;
	align-items: center;
}

/* The scrollable pill strip — no native scrollbar */
.nav-wrapper {
	flex: 1;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: none;
	-ms-overflow-style: none;
	/* Slight horizontal padding so first/last pill isn't flush against the fade */
	padding-left: 4px;
	padding-right: 4px;
}

.nav-wrapper::-webkit-scrollbar {
	display: none;
}

/* ─── Edge fade masks ──────────────────────────────────────────────────────── */
.nav-fade {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 64px;
	pointer-events: none;
	opacity: 0;
	transition: opacity 0.2s ease;
	z-index: 2;
}

.nav-fade.visible {
	opacity: 1;
}

.nav-fade--left {
	left: 0;
	background: linear-gradient(to right, var(--franchise-bg, #0e0e18) 20%, transparent 100%);
}

.nav-scrolled .nav-fade--left {
	/* Match the blurred/tinted nav background when scrolled */
	background: linear-gradient(to right, color-mix(in oklab, var(--bs-body-bg, #0e0e18) 85%, transparent) 20%, transparent 100%);
}

.nav-fade--right {
	right: 0;
	background: linear-gradient(to left, var(--franchise-bg, #0e0e18) 20%, transparent 100%);
}

.nav-scrolled .nav-fade--right {
	background: linear-gradient(to left, color-mix(in oklab, var(--bs-body-bg, #0e0e18) 85%, transparent) 20%, transparent 100%);
}

/* ─── Scroll arrow buttons ─────────────────────────────────────────────────── */
.nav-scroll-btn {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	border: 1px solid rgba(255, 255, 255, 0.15);
	background: rgba(255, 255, 255, 0.08);
	color: rgba(255, 255, 255, 0.7);
	font-size: 0.75rem;
	cursor: pointer;
	transition:
		opacity 0.2s ease,
		transform 0.2s ease,
		background 0.2s ease,
		color 0.2s ease;
	/* Hidden by default — shown when overflow exists */
	opacity: 0;
	pointer-events: none;
	z-index: 3;
}

.nav-scroll-btn.visible {
	opacity: 1;
	pointer-events: auto;
}

.nav-scroll-btn:hover {
	background: rgba(255, 255, 255, 0.18);
	color: white;
	transform: scale(1.1);
}

.nav-scroll-btn:active {
	transform: scale(0.95);
}

.nav-scroll-btn--left {
	margin-right: 6px;
}

.nav-scroll-btn--right {
	margin-left: 6px;
}

/* ─── Nav pills ────────────────────────────────────────────────────────────── */
.nav-pill {
	display: inline-flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 1rem;
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 100px;
	color: rgba(255, 255, 255, 0.7);
	font-size: 0.875rem;
	font-weight: 500;
	white-space: nowrap;
	transition:
		background 0.2s ease,
		color 0.2s ease,
		transform 0.2s ease,
		border-color 0.2s ease,
		box-shadow 0.2s ease;
	cursor: pointer;
}

.nav-pill:hover {
	background: rgba(255, 255, 255, 0.1);
	color: white;
	transform: translateY(-1px);
}

.nav-pill.active {
	background: var(--franchise-accent);
	border-color: var(--franchise-accent);
	color: white;
	box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.nav-icon {
	font-size: 0.875rem;
}

.nav-count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 20px;
	height: 20px;
	padding: 0 6px;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 10px;
	font-size: 0.75rem;
	font-weight: 600;
}

.nav-pill.active .nav-count {
	background: rgba(255, 255, 255, 0.3);
}

.nav-divider {
	width: 1px;
	height: 24px;
	background: rgba(255, 255, 255, 0.1);
	flex-shrink: 0;
}

/* ─── Content Sections ─────────────────────────────────────────────────────── */
.content-sections {
	position: relative;
}

.content-section {
	scroll-margin-top: 140px;
}

.section-title {
	font-weight: 700;
	letter-spacing: -0.02em;
}

.section-subtitle {
	font-size: 0.95rem;
}

.bg-glass {
	background: var(--franchise-glass);
	backdrop-filter: blur(10px);
	border: 1px solid var(--franchise-glass-border);
}

.sub-franchise-header {
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
	border: 1px solid rgba(255, 255, 255, 0.08);
}

.sub-franchise-logo-wrapper {
	width: 80px;
	height: 80px;
	background: rgba(0, 0, 0, 0.3);
	border-radius: 16px;
	padding: 12px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(255, 255, 255, 0.1);
}

.sub-franchise-logo {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.sub-franchise-title {
	font-weight: 700;
	background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
}

.content-count-badge {
	display: inline-flex;
	align-items: center;
	padding: 0.5rem 1rem;
	background: rgba(59, 130, 246, 0.15);
	color: #60a5fa;
	border: 1px solid rgba(59, 130, 246, 0.3);
	border-radius: 100px;
	font-size: 0.875rem;
	font-weight: 600;
}

.content-grid {
	margin-top: -0.5rem;
}

/* ─── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 991.98px) {
	.hero-section {
		height: 60vh;
	}
	.franchise-logo-img {
		max-height: 120px;
	}
	.hero-description {
		font-size: 1rem;
	}
}

@media (max-width: 767.98px) {
	.hero-section {
		height: 50vh;
	}
	.franchise-logo-img {
		max-height: 80px;
	}

	.sub-franchise-logo-wrapper {
		width: 60px;
		height: 60px;
		padding: 8px;
	}

	.meta-number {
		font-size: 1.25rem;
	}
	.meta-label {
		font-size: 0.75rem;
	}

	/* Slightly smaller pills on mobile to fit more before overflow kicks in */
	.nav-pill {
		padding: 0.4rem 0.75rem;
		font-size: 0.8125rem;
	}
}

/* ─── Misc ─────────────────────────────────────────────────────────────────── */
html {
	scroll-behavior: smooth;
}

:deep(.content-card) {
	position: relative;
	border-radius: 12px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.03);
	border: 1px solid rgba(255, 255, 255, 0.05);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
	height: 100%;
}

:deep(.content-card:hover) {
	transform: translateY(-4px) scale(1.02);
	border-color: rgba(255, 255, 255, 0.2);
	box-shadow:
		0 20px 40px rgba(0, 0, 0, 0.4),
		0 0 0 1px rgba(255, 255, 255, 0.1);
}

:deep(.card-poster) {
	aspect-ratio: 2/3;
	width: 100%;
	object-fit: cover;
}

:deep(.card-badge) {
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
}

:deep(.card-content) {
	padding: 1rem;
}

:deep(.card-title) {
	font-weight: 600;
	font-size: 0.95rem;
	margin-bottom: 0.5rem;
	color: white;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

:deep(.card-meta) {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: rgba(255, 255, 255, 0.5);
	font-size: 0.8rem;
	margin-bottom: 0.5rem;
}

:deep(.card-genres) {
	display: flex;
	flex-wrap: wrap;
	gap: 0.375rem;
	margin-top: 0.75rem;
}

:deep(.genre-tag) {
	font-size: 0.7rem;
	padding: 0.25rem 0.5rem;
	background: rgba(255, 255, 255, 0.08);
	border: 1px solid rgba(255, 255, 255, 0.1);
	border-radius: 4px;
	color: rgba(255, 255, 255, 0.7);
}
</style>
