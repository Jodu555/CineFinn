<template>
	<div data-bs-theme="dark" class="browse-pages">
		<!-- ── CONTENT ROWS ──────────────────────────────────────────────────────── -->
		<div class="content-zone px-2 px-lg-4">
			<!-- 1. Weiterschauen -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'clock-rotate-left']" class="row-icon text-danger" />
						<span class="row-title">Weiterschauen</span>
					</div>
					<a href="#" class="see-all">Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']" /></a>
				</div>
				<div class="scroll-rail">
					<div v-for="item in continueWatching" :key="item.id" class="ep-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
						<div class="ep-thumb-wrap position-relative overflow-hidden rounded-3">
							<img :src="item.thumbnail" class="ep-thumb" :alt="item.episodeTitle" loading="lazy" />
							<div class="ep-play-layer" :class="{ visible: item._hovered }">
								<div class="ep-play-circle">
									<font-awesome-icon :icon="['fas', 'play']" />
								</div>
							</div>
							<span class="ep-badge top-start">S{{ item.season }} E{{ item.episode }}</span>
							<span class="ep-badge top-end">{{ item.duration }}</span>
							<div class="ep-progress-track">
								<div class="ep-progress-fill" :style="{ width: item.progress + '%' }"></div>
							</div>
						</div>
						<div class="ep-info">
							<p class="ep-series">{{ item.seriesTitle }}</p>
							<p class="ep-episode">{{ item.episodeTitle }}</p>
							<p class="ep-pct"><font-awesome-icon :icon="['fas', 'clock']" class="me-1" />{{ item.progress }}% gesehen</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 2. Neu hinzugefügt -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'sparkles']" class="row-icon text-danger" />
						<span class="row-title">Neu hinzugefügt</span>
						<span class="badge bg-danger ms-2" style="font-size: 0.65rem">NEU</span>
					</div>
					<a href="#" class="see-all">Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']" /></a>
				</div>
				<div class="scroll-rail">
					<div v-for="item in newlyAdded" :key="item.id" class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
						<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
							<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
							<div class="series-overlay" :class="{ visible: item._hovered }">
								<div class="series-overlay-actions">
									<button class="sov-btn sov-btn-light"><font-awesome-icon :icon="['fas', 'play']" /></button>
									<button class="sov-btn"><font-awesome-icon :icon="['fas', 'plus']" /></button>
									<button class="sov-btn ms-auto"><font-awesome-icon :icon="['fas', 'chevron-down']" /></button>
								</div>
								<p class="sov-title">{{ item.title }}</p>
								<div class="sov-meta">
									<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
									<span class="sov-year">{{ yearLabel(item) }}</span>
								</div>
								<div class="sov-genres">
									<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
								</div>
							</div>
							<span class="new-ribbon">NEU</span>
						</div>
						<div class="series-info">
							<p class="series-label-title">{{ item.title }}</p>
							<p class="series-label-year">{{ yearLabel(item) }}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 3. Neue Folgen -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'star']" class="row-icon text-danger" />
						<span class="row-title">Neue Folgen</span>
					</div>
					<a href="#" class="see-all">Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']" /></a>
				</div>
				<div class="scroll-rail">
					<div v-for="item in newEpisodes" :key="item.id" class="ep-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
						<div class="ep-thumb-wrap position-relative overflow-hidden rounded-3">
							<img :src="item.thumbnail" class="ep-thumb" :alt="item.episodeTitle" loading="lazy" />
							<div class="ep-play-layer" :class="{ visible: item._hovered }">
								<div class="ep-play-circle">
									<font-awesome-icon :icon="['fas', 'play']" />
								</div>
							</div>
							<span class="ep-badge top-start">S{{ item.season }} E{{ item.episode }}</span>
							<span class="ep-badge top-end">{{ item.duration }}</span>
							<span class="new-pill">NEU</span>
						</div>
						<div class="ep-info">
							<p class="ep-series">{{ item.seriesTitle }}</p>
							<p class="ep-episode">{{ item.episodeTitle }}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 4. Marathon -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'popcorn']" class="row-icon text-danger" />
						<span class="row-title">Für deinen nächsten Marathon</span>
						<span class="badge bg-secondary ms-2" style="font-size: 0.65rem">100+ Folgen</span>
					</div>
					<a href="#" class="see-all">Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']" /></a>
				</div>
				<div class="scroll-rail">
					<div
						v-for="item in marathonShows"
						:key="item.id"
						class="series-card"
						@mouseenter="item._hovered = true"
						@mouseleave="item._hovered = false"
					>
						<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
							<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
							<div class="series-overlay" :class="{ visible: item._hovered }">
								<div class="series-overlay-actions">
									<button class="sov-btn sov-btn-light"><font-awesome-icon :icon="['fas', 'play']" /></button>
									<button class="sov-btn"><font-awesome-icon :icon="['fas', 'plus']" /></button>
									<button class="sov-btn ms-auto"><font-awesome-icon :icon="['fas', 'chevron-down']" /></button>
								</div>
								<p class="sov-title">{{ item.title }}</p>
								<div class="sov-meta">
									<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
									<span class="sov-year">{{ yearLabel(item) }}</span>
								</div>
								<div class="sov-genres">
									<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
								</div>
							</div>
							<div class="episode-count-badge"><font-awesome-icon :icon="['fas', 'film']" class="me-1" />{{ item.episodeCount }} Folgen</div>
						</div>
						<div class="series-info">
							<p class="series-label-title">{{ item.title }}</p>
							<p class="series-label-year">{{ yearLabel(item) }}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 5. Brandaktuell -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'bolt']" class="row-icon text-danger" />
						<span class="row-title">Brandaktuell</span>
						<span class="badge bg-success ms-2" style="font-size: 0.65rem">Neue Folgen diese Woche</span>
					</div>
					<a href="#" class="see-all">Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']" /></a>
				</div>
				<div class="scroll-rail">
					<div v-for="item in brandNew" :key="item.id" class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
						<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
							<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
							<div class="series-overlay" :class="{ visible: item._hovered }">
								<div class="series-overlay-actions">
									<button class="sov-btn sov-btn-light"><font-awesome-icon :icon="['fas', 'play']" /></button>
									<button class="sov-btn"><font-awesome-icon :icon="['fas', 'plus']" /></button>
									<button class="sov-btn ms-auto"><font-awesome-icon :icon="['fas', 'chevron-down']" /></button>
								</div>
								<p class="sov-title">{{ item.title }}</p>
								<div class="sov-meta">
									<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
									<span class="sov-year">{{ yearLabel(item) }}</span>
								</div>
								<div class="sov-genres">
									<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
								</div>
							</div>
							<span class="hot-badge"> <font-awesome-icon :icon="['fas', 'bolt']" class="me-1" />Neue Folgen </span>
						</div>
						<div class="series-info">
							<p class="series-label-title">{{ item.title }}</p>
							<p class="series-label-year">{{ yearLabel(item) }}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 6. Nochmal ansehen -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'rotate-right']" class="row-icon text-danger" />
						<span class="row-title">Nochmal ansehen</span>
					</div>
					<a href="#" class="see-all">Alle ansehen <font-awesome-icon :icon="['fas', 'chevron-right']" /></a>
				</div>
				<div class="scroll-rail">
					<div v-for="item in rewatchList" :key="item.id" class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
						<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
							<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
							<div class="series-overlay" :class="{ visible: item._hovered }">
								<div class="series-overlay-actions">
									<button class="sov-btn sov-btn-light"><font-awesome-icon :icon="['fas', 'rotate-right']" /></button>
									<button class="sov-btn"><font-awesome-icon :icon="['fas', 'plus']" /></button>
									<button class="sov-btn ms-auto"><font-awesome-icon :icon="['fas', 'chevron-down']" /></button>
								</div>
								<p class="sov-title">{{ item.title }}</p>
								<div class="sov-meta">
									<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
									<span class="sov-year">{{ yearLabel(item) }}</span>
								</div>
								<div class="sov-genres">
									<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
								</div>
							</div>
							<span class="completed-badge-abs"> <font-awesome-icon :icon="['fas', 'check']" class="me-1" />100% </span>
						</div>
						<div class="series-info">
							<p class="series-label-title">{{ item.title }}</p>
							<p class="series-label-year">{{ yearLabel(item) }}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- 7. Meine Liste -->
			<div class="content-row">
				<div class="row-header px-2">
					<div class="row-title-group">
						<font-awesome-icon :icon="['fas', 'bookmark']" class="row-icon text-danger" />
						<span class="row-title">Meine Liste</span>
					</div>
					<a href="#" class="see-all">Bearbeiten <font-awesome-icon :icon="['fas', 'pen']" /></a>
				</div>
				<div class="scroll-rail">
					<div v-for="item in myList" :key="item.id" class="series-card" @mouseenter="item._hovered = true" @mouseleave="item._hovered = false">
						<div class="series-thumb-wrap position-relative overflow-hidden rounded-3">
							<img :src="item.cover" class="series-thumb" :alt="item.title" loading="lazy" />
							<div class="series-overlay" :class="{ visible: item._hovered }">
								<div class="series-overlay-actions">
									<button class="sov-btn sov-btn-light"><font-awesome-icon :icon="['fas', 'play']" /></button>
									<button class="sov-btn sov-btn-danger"><font-awesome-icon :icon="['fas', 'minus']" /></button>
									<button class="sov-btn ms-auto"><font-awesome-icon :icon="['fas', 'chevron-down']" /></button>
								</div>
								<p class="sov-title">{{ item.title }}</p>
								<div class="sov-meta">
									<span class="badge bg-secondary" style="font-size: 0.62rem">{{ item.rating }}</span>
									<span class="sov-year">{{ yearLabel(item) }}</span>
								</div>
								<div class="sov-genres">
									<span v-for="g in item.genres.slice(0, 2)" :key="g" class="genre-chip">{{ g }}</span>
								</div>
							</div>
						</div>
						<div class="series-info">
							<p class="series-label-title">{{ item.title }}</p>
							<p class="series-label-year">{{ yearLabel(item) }}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({
	middleware: 'auth',
});

// ── Types ──────────────────────────────────────────────────────────────────────
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

interface EpisodeItem {
	id: number;
	seriesTitle: string;
	episodeTitle: string;
	season: number;
	episode: number;
	thumbnail: string;
	progress?: number;
	duration: string;
	_hovered?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const yearLabel = (item: Series): string => {
	if (!item.yearEnd) return `${item.yearStart}–`;
	if (item.yearStart === item.yearEnd) return `${item.yearStart}`;
	return `${item.yearStart}–${item.yearEnd}`;
};

// ── Navbar scroll ──────────────────────────────────────────────────────────────
const scrolled = ref(false);
onMounted(() => {
	const onScroll = () => {
		scrolled.value = window.scrollY > 60;
	};
	window.addEventListener('scroll', onScroll, { passive: true });
	onUnmounted(() => window.removeEventListener('scroll', onScroll));
});

// ── Weiterschauen ──────────────────────────────────────────────────────────────
const continueWatching = reactive<EpisodeItem[]>([
	{
		id: 1,
		seriesTitle: 'Dark Horizons',
		episodeTitle: 'Die letzte Brücke',
		season: 2,
		episode: 7,
		thumbnail: 'https://picsum.photos/seed/cw1/640/360',
		progress: 63,
		duration: '48 Min.',
	},
	{
		id: 2,
		seriesTitle: 'Neon City',
		episodeTitle: 'Schwarzmarkt',
		season: 1,
		episode: 3,
		thumbnail: 'https://picsum.photos/seed/cw2/640/360',
		progress: 28,
		duration: '42 Min.',
	},
	{
		id: 3,
		seriesTitle: 'Waldgeister',
		episodeTitle: 'Das Erwachen',
		season: 3,
		episode: 11,
		thumbnail: 'https://picsum.photos/seed/cw3/640/360',
		progress: 81,
		duration: '55 Min.',
	},
	{
		id: 4,
		seriesTitle: 'Stellar Abyss',
		episodeTitle: 'Jenseits der Leere',
		season: 3,
		episode: 2,
		thumbnail: 'https://picsum.photos/seed/cw4/640/360',
		progress: 45,
		duration: '51 Min.',
	},
	{
		id: 5,
		seriesTitle: 'Blutlinie',
		episodeTitle: 'Verrat',
		season: 2,
		episode: 5,
		thumbnail: 'https://picsum.photos/seed/cw5/640/360',
		progress: 10,
		duration: '44 Min.',
	},
	{
		id: 6,
		seriesTitle: 'Quantensprung',
		episodeTitle: 'Parallelwelten',
		season: 1,
		episode: 8,
		thumbnail: 'https://picsum.photos/seed/cw6/640/360',
		progress: 72,
		duration: '58 Min.',
	},
]);

// ── Neu hinzugefügt ────────────────────────────────────────────────────────────
const newlyAdded = reactive<Series[]>([
	{
		id: 10,
		title: 'Die Küstenräuber',
		description: '',
		cover: 'https://picsum.photos/seed/na10/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Abenteuer', 'Drama'],
		rating: '16+',
	},
	{
		id: 11,
		title: 'Cybergeist',
		description: '',
		cover: 'https://picsum.photos/seed/na11/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Krimi'],
		rating: '12+',
	},
	{
		id: 12,
		title: 'Feuertaufe',
		description: '',
		cover: 'https://picsum.photos/seed/na12/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Action', 'Drama'],
		rating: '16+',
	},
	{
		id: 13,
		title: 'Mondschatten',
		description: '',
		cover: 'https://picsum.photos/seed/na13/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Mystery'],
		rating: '12+',
	},
	{
		id: 14,
		title: 'Das Labyrinth',
		description: '',
		cover: 'https://picsum.photos/seed/na14/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Thriller', 'Mystery'],
		rating: '18+',
	},
	{
		id: 15,
		title: 'Eiszeit',
		description: '',
		cover: 'https://picsum.photos/seed/na15/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Drama'],
		rating: '16+',
	},
	{
		id: 16,
		title: 'Stadtgold',
		description: '',
		cover: 'https://picsum.photos/seed/na16/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Drama'],
		rating: '12+',
	},
]);

// ── Neue Folgen ────────────────────────────────────────────────────────────────
const newEpisodes = reactive<EpisodeItem[]>([
	{
		id: 20,
		seriesTitle: 'Dark Horizons',
		episodeTitle: 'Das Ende des Anfangs',
		season: 3,
		episode: 1,
		thumbnail: 'https://picsum.photos/seed/ne20/640/360',
		duration: '52 Min.',
	},
	{
		id: 21,
		seriesTitle: 'Blutlinie',
		episodeTitle: 'Asche und Staub',
		season: 3,
		episode: 1,
		thumbnail: 'https://picsum.photos/seed/ne21/640/360',
		duration: '47 Min.',
	},
	{
		id: 22,
		seriesTitle: 'Waldgeister',
		episodeTitle: 'Der große Rat',
		season: 4,
		episode: 1,
		thumbnail: 'https://picsum.photos/seed/ne22/640/360',
		duration: '61 Min.',
	},
	{
		id: 23,
		seriesTitle: 'Neon City',
		episodeTitle: 'Systemabsturz',
		season: 2,
		episode: 8,
		thumbnail: 'https://picsum.photos/seed/ne23/640/360',
		duration: '43 Min.',
	},
	{
		id: 24,
		seriesTitle: 'Quantensprung',
		episodeTitle: 'Nullpunkt',
		season: 2,
		episode: 3,
		thumbnail: 'https://picsum.photos/seed/ne24/640/360',
		duration: '55 Min.',
	},
	{
		id: 25,
		seriesTitle: 'Stellar Abyss',
		episodeTitle: 'Das Herz der Finsternis',
		season: 3,
		episode: 6,
		thumbnail: 'https://picsum.photos/seed/ne25/640/360',
		duration: '67 Min.',
	},
]);

// ── Marathon ───────────────────────────────────────────────────────────────────
const marathonShows = reactive<Series[]>([
	{
		id: 30,
		title: 'Grenzland',
		description: '',
		cover: 'https://picsum.photos/seed/ma30/460/500',
		yearStart: 2010,
		yearEnd: 2023,
		genres: ['Drama'],
		rating: '16+',
		episodeCount: 312,
	},
	{
		id: 31,
		title: 'Precinct 9',
		description: '',
		cover: 'https://picsum.photos/seed/ma31/460/500',
		yearStart: 2008,
		yearEnd: 2021,
		genres: ['Krimi', 'Drama'],
		rating: '18+',
		episodeCount: 284,
	},
	{
		id: 32,
		title: 'Himmel & Erde',
		description: '',
		cover: 'https://picsum.photos/seed/ma32/460/500',
		yearStart: 2015,
		yearEnd: 2022,
		genres: ['History', 'Drama'],
		rating: '18+',
		episodeCount: 156,
	},
	{
		id: 33,
		title: 'Klinikum 12',
		description: '',
		cover: 'https://picsum.photos/seed/ma33/460/500',
		yearStart: 2012,
		yearEnd: 2025,
		genres: ['Drama', 'Medical'],
		rating: '16+',
		episodeCount: 420,
	},
	{
		id: 34,
		title: 'Codebreaker',
		description: '',
		cover: 'https://picsum.photos/seed/ma34/460/500',
		yearStart: 2016,
		yearEnd: 2024,
		genres: ['Thriller', 'Sci-Fi'],
		rating: '16+',
		episodeCount: 198,
	},
	{
		id: 35,
		title: 'Dynastien',
		description: '',
		cover: 'https://picsum.photos/seed/ma35/460/500',
		yearStart: 2014,
		yearEnd: 2023,
		genres: ['History', 'Drama'],
		rating: '16+',
		episodeCount: 240,
	},
]);

// ── Brandaktuell ───────────────────────────────────────────────────────────────
const brandNew = reactive<Series[]>([
	{
		id: 40,
		title: 'Schattenläufer',
		description: '',
		cover: 'https://picsum.photos/seed/bn40/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Thriller'],
		rating: '16+',
	},
	{
		id: 41,
		title: 'Lichtjahre',
		description: '',
		cover: 'https://picsum.photos/seed/bn41/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Sci-Fi', 'Mystery'],
		rating: '12+',
	},
	{
		id: 42,
		title: 'Eisenbahn der Seelen',
		description: '',
		cover: 'https://picsum.photos/seed/bn42/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Drama', 'Fantasy'],
		rating: '12+',
	},
	{
		id: 43,
		title: 'Stahl und Seide',
		description: '',
		cover: 'https://picsum.photos/seed/bn43/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Drama'],
		rating: '12+',
	},
	{
		id: 44,
		title: 'Herzrhythmus',
		description: '',
		cover: 'https://picsum.photos/seed/bn44/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Drama', 'Medical'],
		rating: '16+',
	},
	{
		id: 45,
		title: 'Rote Linie',
		description: '',
		cover: 'https://picsum.photos/seed/bn45/460/500',
		yearStart: 2022,
		yearEnd: null,
		genres: ['Thriller', 'Drama'],
		rating: '16+',
	},
]);

// ── Nochmal ansehen ────────────────────────────────────────────────────────────
const rewatchList = reactive<Series[]>([
	{
		id: 50,
		title: 'Dark Horizons',
		description: '',
		cover: 'https://picsum.photos/seed/rw50/460/500',
		yearStart: 2019,
		yearEnd: 2024,
		genres: ['Sci-Fi', 'Thriller'],
		rating: '16+',
	},
	{
		id: 51,
		title: 'Waldgeister',
		description: '',
		cover: 'https://picsum.photos/seed/rw51/460/500',
		yearStart: 2018,
		yearEnd: 2023,
		genres: ['Fantasy', 'Drama'],
		rating: '12+',
	},
	{
		id: 52,
		title: 'Neon City',
		description: '',
		cover: 'https://picsum.photos/seed/rw52/460/500',
		yearStart: 2020,
		yearEnd: 2022,
		genres: ['Sci-Fi', 'Krimi'],
		rating: '16+',
	},
	{
		id: 53,
		title: 'Blutlinie',
		description: '',
		cover: 'https://picsum.photos/seed/rw53/460/500',
		yearStart: 2021,
		yearEnd: 2024,
		genres: ['Drama', 'Thriller'],
		rating: '18+',
	},
	{
		id: 54,
		title: 'Quantensprung',
		description: '',
		cover: 'https://picsum.photos/seed/rw54/460/500',
		yearStart: 2022,
		yearEnd: 2024,
		genres: ['Sci-Fi'],
		rating: '16+',
	},
]);

// ── Meine Liste ────────────────────────────────────────────────────────────────
const myList = reactive<Series[]>([
	{
		id: 60,
		title: 'Schattenläufer',
		description: '',
		cover: 'https://picsum.photos/seed/ml60/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Thriller'],
		rating: '16+',
	},
	{
		id: 61,
		title: 'Mondschatten',
		description: '',
		cover: 'https://picsum.photos/seed/ml61/460/500',
		yearStart: 2025,
		yearEnd: null,
		genres: ['Sci-Fi', 'Mystery'],
		rating: '12+',
	},
	{
		id: 62,
		title: 'Klinikum 12',
		description: '',
		cover: 'https://picsum.photos/seed/ml62/460/500',
		yearStart: 2012,
		yearEnd: 2025,
		genres: ['Drama', 'Medical'],
		rating: '16+',
	},
	{
		id: 63,
		title: 'Lichtjahre',
		description: '',
		cover: 'https://picsum.photos/seed/ml63/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Sci-Fi', 'Mystery'],
		rating: '12+',
	},
	{
		id: 64,
		title: 'Eisenbahn der Seelen',
		description: '',
		cover: 'https://picsum.photos/seed/ml64/460/500',
		yearStart: 2023,
		yearEnd: null,
		genres: ['Drama', 'Fantasy'],
		rating: '12+',
	},
	{
		id: 65,
		title: 'Stahl und Seide',
		description: '',
		cover: 'https://picsum.photos/seed/ml65/460/500',
		yearStart: 2024,
		yearEnd: null,
		genres: ['Drama'],
		rating: '12+',
	},
	{
		id: 66,
		title: 'Rote Linie',
		description: '',
		cover: 'https://picsum.photos/seed/ml66/460/500',
		yearStart: 2022,
		yearEnd: null,
		genres: ['Thriller', 'Drama'],
		rating: '16+',
	},
]);
</script>

<style>
/* ── Fonts ───────────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600;9..40,700;9..40,800&display=swap');

/* ── Variables ───────────────────────────────────────────────────────────────── */
:root {
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

*,
*::before,
*::after {
	box-sizing: border-box;
}

/* ── Page ────────────────────────────────────────────────────────────────────── */
.browse-page {
	background-color: var(--cs-bg);
	min-height: 100vh;
	font-family: 'DM Sans', sans-serif;
	color: var(--cs-text);
	overflow-x: hidden;
}

/* ── Navbar ──────────────────────────────────────────────────────────────────── */
.browse-navbar {
	background: linear-gradient(to bottom, rgba(5, 5, 14, 0.96) 0%, transparent 100%);
	padding-top: 1rem !important;
	padding-bottom: 1rem !important;
	transition:
		background var(--t),
		box-shadow var(--t);
	z-index: 1040;
}
.browse-navbar.navbar-scrolled {
	background: rgba(9, 9, 16, 0.96) !important;
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
	box-shadow: 0 2px 24px rgba(0, 0, 0, 0.55);
}
.brand-name {
	font-family: 'Bebas Neue', sans-serif;
	font-size: 1.65rem;
	letter-spacing: 0.09em;
	color: var(--cs-text);
	line-height: 1;
	vertical-align: middle;
}
.nav-icon-btn {
	font-size: 1.05rem;
	transition: color var(--t);
	line-height: 1;
}
.nav-icon-btn:hover {
	color: var(--cs-accent) !important;
}
.avatar-circle {
	width: 34px;
	height: 34px;
	background: linear-gradient(135deg, #e5091a 0%, #ff5f6d 100%);
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 700;
	font-size: 0.85rem;
	color: #fff;
	letter-spacing: 0.05em;
}

/* ── Hero ────────────────────────────────────────────────────────────────────── */
.hero-section {
	height: 96vh;
	min-height: 600px;
	position: relative;
}

.hero-backdrop {
	position: absolute;
	inset: 0;
	background-size: cover;
	background-position: center 25%;
	animation: heroKenBurns 22s ease-in-out infinite alternate;
}
@keyframes heroKenBurns {
	from {
		transform: scale(1);
		background-position: center 25%;
	}
	to {
		transform: scale(1.07);
		background-position: center 18%;
	}
}
.hero-gradient {
	position: absolute;
	inset: 0;
	background: linear-gradient(110deg, rgba(5, 5, 14, 0.95) 0%, rgba(5, 5, 14, 0.72) 42%, rgba(5, 5, 14, 0.12) 100%);
}
.hero-gradient-bottom {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 45%;
	background: linear-gradient(to top, var(--cs-bg) 0%, transparent 100%);
}
.hero-content {
	position: relative;
	z-index: 2;
	padding-top: 72px;
}

.hero-eyebrow {
	display: inline-flex;
	align-items: center;
	background: rgba(255, 200, 50, 0.07);
	border: 1px solid rgba(255, 200, 50, 0.2);
	border-radius: 20px;
	padding: 0.3rem 0.9rem;
	animation: fadeSlideUp 0.8s 0.05s both;
}
.hero-title {
	font-family: 'Bebas Neue', sans-serif;
	font-size: clamp(3rem, 7vw, 5.5rem);
	line-height: 0.95;
	letter-spacing: 0.04em;
	text-shadow: 0 6px 40px rgba(0, 0, 0, 0.8);
	animation: fadeSlideUp 0.8s 0.15s both;
}
.hero-desc {
	font-size: 0.98rem;
	line-height: 1.7;
	color: rgba(220, 220, 235, 0.82);
	max-width: 490px;
	text-shadow: 0 2px 14px rgba(0, 0, 0, 0.7);
	animation: fadeSlideUp 0.8s 0.28s both;
}
.hero-play-btn {
	background: #fff;
	color: #000;
	font-weight: 700;
	transition:
		transform 0.15s,
		box-shadow 0.2s;
	animation: fadeSlideUp 0.8s 0.38s both;
}
.hero-play-btn:hover {
	transform: scale(1.04);
	box-shadow: 0 6px 24px rgba(229, 9, 26, 0.4);
}
.hero-info-btn {
	background: rgba(120, 120, 140, 0.3);
	color: var(--cs-text);
	border: 1px solid rgba(255, 255, 255, 0.12);
	font-weight: 600;
	backdrop-filter: blur(4px);
	transition: background var(--t);
	animation: fadeSlideUp 0.8s 0.44s both;
}
.hero-info-btn:hover {
	background: rgba(150, 150, 170, 0.4);
	color: #fff;
}
.hero-add-btn {
	width: 50px;
	height: 50px;
	border-radius: 50% !important;
	padding: 0;
	background: rgba(80, 80, 100, 0.3);
	color: var(--cs-text);
	border: 1px solid rgba(255, 255, 255, 0.18);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	transition:
		background var(--t),
		transform 0.15s;
	animation: fadeSlideUp 0.8s 0.5s both;
}
.hero-add-btn:hover {
	background: rgba(255, 255, 255, 0.15);
	transform: scale(1.08);
	color: #fff;
}
.dot-sep {
	font-size: 0.7rem;
	opacity: 0.5;
}

@keyframes fadeSlideUp {
	from {
		opacity: 0;
		transform: translateY(22px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* ── Content Zone ────────────────────────────────────────────────────────────── */
.content-zone {
	position: relative;
	z-index: 5;
	padding-bottom: 2rem;
}

/* ── Row Header ──────────────────────────────────────────────────────────────── */
.content-row {
	margin-bottom: 0.5rem;
	padding: 0.75rem 0;
}
.row-header {
	display: flex;
	align-items: center;
	gap: 0.6rem;
	margin-bottom: 0.9rem;
}
.row-title-group {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex: 1;
	min-width: 0;
}
.row-icon {
	font-size: 0.88rem;
}
.row-title {
	font-weight: 700;
	font-size: 1rem;
	color: var(--cs-text);
	letter-spacing: 0.01em;
	white-space: nowrap;
}
.see-all {
	font-size: 0.78rem;
	color: var(--cs-muted);
	text-decoration: none;
	white-space: nowrap;
	opacity: 0;
	transition:
		opacity var(--t),
		color var(--t);
	display: flex;
	align-items: center;
	gap: 0.3rem;
}
.content-row:hover .see-all {
	opacity: 1;
}
.see-all:hover {
	color: var(--cs-text);
}

/* ── Scroll Rail ─────────────────────────────────────────────────────────────── */
.scroll-rail {
	display: flex;
	gap: 12px;
	overflow-x: auto;
	padding: 6px 6px 12px;
	scroll-behavior: smooth;
	scrollbar-width: thin;
	scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}
.scroll-rail::-webkit-scrollbar {
	height: 4px;
}
.scroll-rail::-webkit-scrollbar-track {
	background: transparent;
}
.scroll-rail::-webkit-scrollbar-thumb {
	background: rgba(255, 255, 255, 0.12);
	border-radius: 4px;
}

/* ── Series Card ─────────────────────────────────────────────────────────────── */
.series-card {
	flex-shrink: 0;
	width: 230px;
	cursor: pointer;
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
.series-card:hover .series-thumb {
	transform: scale(1.05);
	box-shadow: 0 14px 42px rgba(0, 0, 0, 0.75);
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
.sov-btn:hover {
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
	line-clamp: 2;
	-webkit-line-clamp: 2;
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

/* Badges on covers */
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
.hot-badge {
	position: absolute;
	top: 8px;
	left: 8px;
	background: rgba(229, 9, 26, 0.85);
	backdrop-filter: blur(4px);
	color: #fff;
	font-size: 0.62rem;
	font-weight: 700;
	padding: 3px 7px;
	border-radius: 6px;
	letter-spacing: 0.04em;
}
.completed-badge-abs {
	position: absolute;
	top: 8px;
	right: 8px;
	background: rgba(25, 135, 84, 0.9);
	backdrop-filter: blur(4px);
	color: #fff;
	font-size: 0.62rem;
	font-weight: 700;
	padding: 3px 7px;
	border-radius: 6px;
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

/* ── Episode Card (16:9) ─────────────────────────────────────────────────────── */
.ep-card {
	flex-shrink: 0;
	width: 306px;
	cursor: pointer;
}
.ep-thumb-wrap {
	width: 306px;
	height: 172px;
	background: var(--cs-surface);
	border-radius: var(--radius) !important;
	position: relative;
}
.ep-thumb {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	border-radius: var(--radius);
	transition:
		transform var(--t),
		filter var(--t);
}
.ep-card:hover .ep-thumb {
	transform: scale(1.04);
	filter: brightness(0.85);
}

.ep-play-layer {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0, 0, 0, 0.35);
	border-radius: var(--radius);
	opacity: 0;
	transition: opacity var(--t);
}
.ep-play-layer.visible {
	opacity: 1;
}
.ep-play-circle {
	width: 52px;
	height: 52px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.65);
	background: rgba(255, 255, 255, 0.15);
	backdrop-filter: blur(6px);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.1rem;
	color: #fff;
	transition:
		transform 0.15s,
		background var(--t);
}
.ep-play-layer.visible .ep-play-circle:hover {
	transform: scale(1.12);
	background: rgba(229, 9, 26, 0.75);
	border-color: var(--cs-accent);
}
.ep-badge {
	position: absolute;
	background: rgba(0, 0, 0, 0.72);
	color: rgba(255, 255, 255, 0.88);
	font-size: 0.62rem;
	font-weight: 600;
	padding: 3px 7px;
	border-radius: 5px;
	backdrop-filter: blur(3px);
}
.ep-badge.top-start {
	top: 8px;
	left: 8px;
}
.ep-badge.top-end {
	top: 8px;
	right: 8px;
}
.new-pill {
	position: absolute;
	bottom: 8px;
	left: 8px;
	background: var(--cs-accent);
	color: #fff;
	font-size: 0.6rem;
	font-weight: 700;
	padding: 2px 6px;
	border-radius: 4px;
	letter-spacing: 0.05em;
}
.ep-progress-track {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	height: 3px;
	background: rgba(255, 255, 255, 0.18);
	border-radius: 0 0 var(--radius) var(--radius);
	overflow: hidden;
}
.ep-progress-fill {
	height: 100%;
	background: var(--cs-accent);
	border-radius: 2px;
	box-shadow: 0 0 6px var(--cs-accent-glow);
	transition: width 0.4s ease;
}
.ep-info {
	padding: 7px 2px 0;
	max-width: 306px;
}
.ep-series {
	margin: 0 0 1px;
	font-size: 0.84rem;
	font-weight: 700;
	color: var(--cs-text);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.ep-episode {
	margin: 0 0 2px;
	font-size: 0.75rem;
	color: var(--cs-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.ep-pct {
	margin: 0;
	font-size: 0.7rem;
	color: var(--cs-accent);
	font-weight: 500;
}

/* ── Footer ──────────────────────────────────────────────────────────────────── */
.browse-footer {
	background: transparent;
}
.footer-link {
	transition: color var(--t);
}
.footer-link:hover {
	color: var(--cs-text) !important;
}

/* ── Responsive ──────────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
	.hero-section {
		height: 78vh;
	}
	.series-card {
		width: 150px;
	}
	.series-thumb-wrap {
		width: 150px;
		height: 165px;
	}
	.ep-card {
		width: 240px;
	}
	.ep-thumb-wrap {
		width: 240px;
		height: 135px;
	}
}
@media (max-width: 480px) {
	.hero-title {
		font-size: 2.8rem !important;
	}
	.series-card {
		width: 130px;
	}
	.series-thumb-wrap {
		width: 130px;
		height: 143px;
	}
}
</style>
