<template>
	<div class="container-fluid mt-2">
		<!-- Month Navigation & Controls -->
		<div class="d-flex justify-content-between align-items-center mb-4">
			<button class="btn btn-outline-secondary" @click="prevMonth">
				<font-awesome-icon :icon="['fas', 'chevron-left']" />
			</button>

			<div class="d-flex align-items-center gap-3">
				<h2 class="h5 mb-0 fw-bold">{{ currentMonthLabel }}</h2>
				<button class="btn btn-sm btn-outline-secondary" @click="goToToday">Today</button>

				<div class="vr d-none d-sm-block"></div>

				<div class="form-check form-switch m-0">
					<input id="compactToggle" v-model="isCompact" class="form-check-input" type="checkbox" role="switch" />
					<label class="form-check-label user-select-none small" for="compactToggle">Compact</label>
				</div>
			</div>

			<button class="btn btn-outline-secondary" @click="nextMonth">
				<font-awesome-icon :icon="['fas', 'chevron-right']" />
			</button>
		</div>

		<!-- Filters -->
		<div class="mb-4">
			<div class="d-flex align-items-center gap-2 mb-2">
				<button class="btn btn-sm btn-outline-secondary d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#filterPanel">
					<font-awesome-icon :icon="['fas', 'filter']" class="me-1" />
					Filters
				</button>
			</div>

			<div id="filterPanel" class="collapse d-md-block">
				<div class="card border-secondary">
					<div class="card-body">
						<div class="row g-3 align-items-end">
							<!-- Language Multiselect -->
							<div class="col-12 col-lg-5">
								<label class="form-label fw-bold small text-uppercase text-muted mb-2">Languages</label>
								<div class="d-flex flex-wrap gap-2">
									<div v-for="lang in availableLanguages" :key="lang">
										<input :id="`lang-${lang}`" v-model="selectedLanguages" class="btn-check" type="checkbox" :value="lang" />
										<label class="btn btn-sm btn-outline-primary" :for="`lang-${lang}`">{{ lang }}</label>
									</div>
								</div>
							</div>

							<!-- Watched Toggle -->
							<div class="col-6 col-lg-2">
								<div class="form-check">
									<input id="watchedFilter" v-model="filterWatched" class="form-check-input" type="checkbox" />
									<label class="form-check-label fw-bold small" for="watchedFilter">Watched only</label>
								</div>
							</div>

							<!-- Playlist Multiselect -->
							<div class="col-12 col-lg-5">
								<label class="form-label fw-bold small text-uppercase text-muted mb-2">Playlists</label>
								<div class="dropdown">
									<button
										class="btn btn-sm btn-outline-secondary dropdown-toggle w-100 text-start d-flex justify-content-between align-items-center"
										type="button"
										data-bs-toggle="dropdown"
									>
										<span>
											<font-awesome-icon :icon="['fas', 'list']" class="me-1" />
											{{ playlistButtonText }}
										</span>
									</button>
									<ul class="dropdown-menu dropdown-menu-dark w-100">
										<li>
											<div class="dropdown-item">
												<div class="form-check">
													<input id="selectAllPlaylists" v-model="allPlaylistsSelected" class="form-check-input" type="checkbox" />
													<label class="form-check-label fw-bold" for="selectAllPlaylists">All Playlists</label>
												</div>
											</div>
										</li>
										<li><hr class="dropdown-divider" /></li>
										<li v-for="playlist in playlistStore.playlists" :key="playlist.UUID">
											<div class="dropdown-item">
												<div class="form-check">
													<input
														:id="`pl-${playlist.UUID}`"
														v-model="selectedPlaylists"
														class="form-check-input"
														type="checkbox"
														:value="playlist.name"
													/>
													<label class="form-check-label" :for="`pl-${playlist.UUID}`">{{ playlist.name }}</label>
												</div>
											</div>
										</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Desktop: Month Grid -->
		<div class="d-none d-md-block">
			<!-- Weekday Headers -->
			<div class="row g-1 mb-1 text-center">
				<div v-for="day in weekDays" :key="day" class="col">
					<small class="text-muted fw-bold text-uppercase">{{ day }}</small>
				</div>
			</div>

			<!-- Weeks -->
			<div v-for="(week, wIndex) in weeks" :key="wIndex" class="row g-1">
				<div v-for="day in week.days" :key="`${wIndex}-${day.date}`" class="col">
					<div class="border border-secondary rounded p-2 h-100" :class="{ 'opacity-50': !day.isCurrentMonth }" style="min-height: 160px">
						<div class="d-flex justify-content-between align-items-center mb-2">
							<span class="small fw-bold" :class="day.isToday ? 'text-primary' : 'text-muted'">
								{{ day.date }}
							</span>
							<span v-if="day.isToday" class="badge bg-primary rounded-pill" style="font-size: 0.6rem">Today</span>
						</div>

						<div class="d-flex flex-column gap-2">
							<div
								v-for="event in day.events"
								:key="event.id"
								class="rounded p-2"
								:class="isCompact ? 'bg-secondary bg-opacity-10' : 'border border-secondary'"
							>
								<!-- Full Card -->
								<div v-if="!isCompact" class="d-flex gap-2">
									<img
										:src="event.image"
										class="rounded flex-shrink-0"
										style="width: 60px; height: 85px; object-fit: cover"
										:alt="event.seriesTitle"
									/>
									<div class="d-flex flex-column justify-content-between flex-grow-1" style="min-width: 0">
										<div class="fw-bold text-truncate" style="font-size: 0.75rem">{{ event.seriesTitle }}</div>
										<div class="d-flex flex-wrap gap-1">
											<span v-for="lang in event.languages" :key="lang" class="badge" :class="getLangBadgeClass(lang)" style="font-size: 0.65rem">
												{{ lang }}
											</span>
										</div>
										<div class="text-muted" style="font-size: 0.7rem">Ep. {{ event.episode }}</div>
									</div>
								</div>

								<!-- Compact Row -->
								<div v-else class="d-flex justify-content-between align-items-center gap-1">
									<span class="fw-bold text-truncate" style="font-size: 0.75rem">{{ event.seriesTitle }}</span>
									<div class="d-flex gap-1 flex-shrink-0">
										<span
											v-for="lang in event.languages.slice(0, 2)"
											:key="lang"
											class="badge"
											:class="getLangBadgeClass(lang)"
											style="font-size: 0.6rem"
										>
											{{ lang }}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile: Chronological List -->
		<div class="d-md-none">
			<div v-if="daysWithEvents.length === 0" class="text-center text-muted py-5">
				<font-awesome-icon :icon="['fas', 'calendar-xmark']" size="2x" class="mb-3 d-block mx-auto" />
				<p class="mb-0">No releases match your filters.</p>
			</div>

			<div v-for="day in daysWithEvents" :key="day.fullDate.toISOString()" class="mb-3">
				<div class="d-flex align-items-center gap-2 mb-2">
					<span class="badge bg-secondary">{{ formatMobileDate(day.fullDate) }}</span>
					<div class="flex-grow-1 border-bottom border-secondary"></div>
				</div>

				<div class="d-flex flex-column gap-2">
					<div v-for="event in day.events" :key="event.id" class="d-flex align-items-center gap-3 p-2 border border-secondary rounded">
						<img
							v-if="!isCompact"
							:src="event.image"
							class="rounded flex-shrink-0"
							style="width: 70px; height: 100px; object-fit: cover"
							:alt="event.seriesTitle"
						/>

						<div class="flex-grow-1" style="min-width: 0">
							<div class="d-flex justify-content-between align-items-start gap-2">
								<div class="fw-bold text-truncate">{{ event.seriesTitle }}</div>
								<span class="badge bg-secondary flex-shrink-0">Ep {{ event.episode }}</span>
							</div>
							<div class="d-flex flex-wrap gap-1 mt-1">
								<span v-for="lang in event.languages" :key="lang" class="badge" :class="getLangBadgeClass(lang)" style="font-size: 0.75rem">
									{{ lang }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';

// --- Types ---
interface CalendarEvent {
	id: string;
	seriesTitle: string;
	image: string;
	episode: number;
	languages: string[];
	watched: boolean;
	playlists: string[];
	date: Date;
}

// --- Store ---
const playlistStore = usePlaylistStore();

// --- Configuration ---
const availableLanguages = ['EngDub', 'EngSub', 'GerDub', 'GerSub', 'JpnSub'];
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// --- Mock Data ---
const generateMockData = (): CalendarEvent[] => {
	const pool = [
		{
			title: 'A Chivalry of a Failed Knight',
			img: 'https://v2.cinema-api.jodu555.de/images/ee28ef23/cover.jpg?auth-token=d3b9ad8d-fc5c-4e32-b489-88fe2170a3d1',
		},
		{
			title: 'Bastard!! Heavy Metal, Dark Fantasy',
			img: 'https://v2.cinema-api.jodu555.de/images/dbc0aa61/cover.jpg?auth-token=d3b9ad8d-fc5c-4e32-b489-88fe2170a3d1',
		},
		{
			title: 'By the Grace of the Gods',
			img: 'https://v2.cinema-api.jodu555.de/images/00ba2a50/cover.jpg?auth-token=d3b9ad8d-fc5c-4e32-b489-88fe2170a3d1',
		},
		{ title: 'Date a Live', img: 'https://v2.cinema-api.jodu555.de/images/48ccd6f0/cover.jpg?auth-token=d3b9ad8d-fc5c-4e32-b489-88fe2170a3d1' },
		{
			title: 'The Irregular at Magic High School',
			img: 'https://v2.cinema-api.jodu555.de/images/814f331c/cover.jpg?auth-token=d3b9ad8d-fc5c-4e32-b489-88fe2170a3d1',
		},
	];

	const events: CalendarEvent[] = [];
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();

	const fallbackPlaylists = ['Watching', 'Plan to Watch', 'Favorites', 'Summer 2026'];
	const getRandomPlaylist = (): string => {
		const storePlaylists = playlistStore.playlists.map((p) => p.name);
		const source = storePlaylists.length > 0 ? storePlaylists : fallbackPlaylists;
		return source[Math.floor(Math.random() * source.length)]!;
	};

	for (let i = 1; i <= 30; i += Math.floor(Math.random() * 2) + 1) {
		const s = pool[Math.floor(Math.random() * pool.length)]!;
		const langs: string[] = [];
		const count = Math.floor(Math.random() * 2) + 1;
		while (langs.length < count) {
			const l = availableLanguages[Math.floor(Math.random() * availableLanguages.length)]!;
			if (!langs.includes(l)) langs.push(l);
		}

		const randomDay = Math.floor(Math.random() * 30) + 1;
		events.push({
			id: `evt-${i}-${Math.random().toString(36).slice(2, 5)}`,
			seriesTitle: s.title,
			image: s.img,
			episode: Math.floor(Math.random() * 12) + 1,
			languages: langs,
			watched: Math.random() > 0.6,
			playlists: [getRandomPlaylist()],
			date: new Date(year, month, randomDay),
		});
	}
	return events;
};

// --- State ---
const allEvents = ref<CalendarEvent[]>(generateMockData());
const isCompact = ref(false);
const selectedLanguages = ref<string[]>([...availableLanguages]);
const filterWatched = ref(false);
const selectedPlaylists = ref<string[]>([]);

// --- Computed ---
const availablePlaylists = computed(() => playlistStore.playlists.map((p) => p.name));

const allPlaylistsSelected = computed({
	get: () => availablePlaylists.value.length > 0 && selectedPlaylists.value.length === availablePlaylists.value.length,
	set: (val: boolean) => {
		selectedPlaylists.value = val ? [...availablePlaylists.value] : [];
	},
});

// Auto-select all playlists when store populates
watch(
	availablePlaylists,
	(names) => {
		if (names.length > 0) {
			selectedPlaylists.value = [...names];
		}
	},
	{ immediate: true },
);

const currentMonthLabel = computed(() => currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

const filteredEvents = computed(() => {
	return allEvents.value.filter((e) => {
		if (!e.languages.some((l) => selectedLanguages.value.includes(l))) return false;
		if (filterWatched.value && !e.watched) return false;
		if (selectedPlaylists.value.length === 0) return true;
		if (!e.playlists.some((p) => selectedPlaylists.value.includes(p))) return false;
		return true;
	});
});

const weeks = computed(() => {
	const year = currentDate.value.getFullYear();
	const month = currentDate.value.getMonth();
	const first = new Date(year, month, 1);
	const last = new Date(year, month + 1, 0);

	let offset = first.getDay() - 1;
	if (offset < 0) offset = 6;

	const prevDays = new Date(year, month, 0).getDate();
	const total = last.getDate();
	const today = new Date();

	const weeks: { days: any[] }[] = [];
	let week: any[] = [];

	// Pad previous month
	for (let i = offset - 1; i >= 0; i--) {
		week.push({ date: prevDays - i, isCurrentMonth: false, isToday: false, events: [] });
	}

	// Current month
	for (let d = 1; d <= total; d++) {
		const dateObj = new Date(year, month, d);
		const isToday = dateObj.toDateString() === today.toDateString();
		const evts = filteredEvents.value.filter((e) => e.date.getDate() === d && e.date.getMonth() === month && e.date.getFullYear() === year);
		week.push({ date: d, isCurrentMonth: true, isToday, events: evts });

		if (week.length === 7) {
			weeks.push({ days: week });
			week = [];
		}
	}

	// Pad next month
	if (week.length) {
		let n = 1;
		while (week.length < 7) {
			week.push({ date: n++, isCurrentMonth: false, isToday: false, events: [] });
		}
		weeks.push({ days: week });
	}

	return weeks;
});

const daysWithEvents = computed(() => {
	const map = new Map<string, { fullDate: Date; events: CalendarEvent[] }>();
	filteredEvents.value.forEach((e) => {
		const key = e.date.toDateString();
		if (!map.has(key)) map.set(key, { fullDate: e.date, events: [] });
		map.get(key)!.events.push(e);
	});
	return Array.from(map.values()).sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
});

const playlistButtonText = computed(() => {
	if (availablePlaylists.value.length === 0) return 'Loading...';
	if (selectedPlaylists.value.length === 0) return 'Select Playlists...';
	if (selectedPlaylists.value.length === availablePlaylists.value.length) return 'All Playlists';
	if (selectedPlaylists.value.length === 1) return selectedPlaylists.value[0];
	return `${selectedPlaylists.value.length} Playlists`;
});

// --- Methods ---
const getLangBadgeClass = (lang: string): string => {
	const map: Record<string, string> = {
		EngDub: 'bg-primary',
		EngSub: 'bg-info text-dark',
		GerDub: 'bg-success',
		GerSub: 'bg-warning text-dark',
		JpnSub: 'bg-danger',
	};
	return map[lang] || 'bg-secondary';
};

const prevMonth = () => {
	currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1);
};
const nextMonth = () => {
	currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1);
};
const goToToday = () => {
	currentDate.value = new Date();
};
const formatMobileDate = (date: Date): string => {
	return date.toLocaleDateString('de-DE', { weekday: 'short', month: 'short', day: 'numeric' });
};

const currentDate = ref(new Date());
</script>

<style scoped>
/* Intentionally empty — Bootstrap 5 handles all styling */
</style>
