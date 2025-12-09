<template>
    <section class="carousel-section py-3">
        <div class="d-flex align-items-center mb-2">
            <h3 class="me-auto mb-0">{{ title }}</h3>
            <small class="text-muted">Showing {{ visibleCount }} at a time • {{ groupedGenres.length }} genres</small>
        </div>

        <!-- For each genre we render a horizontal row -->
        <div v-for="(group, rowIndex) in groupedGenres" :key="group.genre" class="mb-4">
            <div class="d-flex align-items-center mb-2">
                <h5 class="mb-0 me-3">{{ group.genre }}</h5>
                <small class="text-muted">{{ group.items.length }} titles</small>
            </div>

            <div class="position-relative">
                <!-- left arrow -->
                <button
                    class="btn btn-dark btn-sm shadow-sm position-absolute top-50 translate-middle-y start-0 zindex-3 carousel-nav"
                    :aria-label="`Previous ${group.genre}`" @click="prev(rowIndex)" :disabled="isAtStart(rowIndex)">
                    <i class="bi bi-chevron-left"></i>
                </button>

                <!-- viewport -->
                <div ref="viewports" class="carousel-viewport overflow-hidden rounded" :data-row="rowIndex">
                    <!-- track -->
                    <div class="carousel-track d-flex align-items-stretch" :style="trackStyle(rowIndex)"
                        @pointerdown.prevent="onPointerDown($event, rowIndex)"
                        @pointermove.prevent="onPointerMove($event, rowIndex)"
                        @pointerup.prevent="onPointerUp($event, rowIndex)"
                        @pointercancel.prevent="onPointerUp($event, rowIndex)"
                        @touchstart.passive="onTouchStart($event, rowIndex)"
                        @touchmove.passive="onTouchMove($event, rowIndex)"
                        @touchend.passive="onTouchEnd($event, rowIndex)" role="list">
                        <EntityCard v-for="series in indexStore.series" :key="series.UUID" :series-i-d="series.UUID" />
                        <!-- <article v-for="(item, idx) in group.items" :key="item.id"
                            class="carousel-card card flex-grow-0"
                            :class="{ 'is-center': centerIndex[rowIndex] === idx }" role="listitem"
                            :aria-label="item.title + ' — ' + item.genre" :style="cardStyle(rowIndex)" tabindex="0">
                            <div class="card-img-top poster-wrap position-relative">
                                <img :src="item.image" :alt="item.title" class="w-100 h-100 object-fit-cover" />

                                <div class="poster-gradient position-absolute top-0 start-0 w-100 h-100"></div>


                                <span v-if="item.badge" class="badge bg-danger position-absolute top-2 start-2">{{
                                    item.badge }}</span>
                            </div>

                            <div class="card-body p-2 d-flex flex-column">
                                <h6 class="card-title mb-1 text-truncate">{{ item.title }}</h6>
                                <p class="card-text small text-muted mb-1 text-truncate">{{ item.meta ?? (item.year ?
                                    item.year.toString() : '') }}</p>
                                <div class="mt-auto d-flex justify-content-between align-items-center">
                                    <small class="text-muted">{{ item.genre }}</small>
                                    <button class="btn btn-sm btn-outline-light btn-play" @click.stop="onPlay(item)">
                                        <i class="bi bi-play-fill"></i>
                                    </button>
                                </div>
                            </div>
                        </article> -->
                    </div>
                </div>

                <!-- right arrow -->
                <button
                    class="btn btn-dark btn-sm shadow-sm position-absolute top-50 translate-middle-y end-0 zindex-3 carousel-nav"
                    :aria-label="`Next ${group.genre}`" @click="next(rowIndex)" :disabled="isAtEnd(rowIndex)">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';

const indexStore = useIndexStore();

/* ---------------------------
   Types & props
   --------------------------- */
interface MediaItem {
    id: string | number;
    title: string;
    genre: string;
    image: string;
    meta?: string;
    year?: number;
    badge?: string;
}

const title = 'Recommended for you';
const items = ref<MediaItem[]>(defaultItems());
const visibleCount = ref(5);

// const props = defineProps({
//     title: { type: String, default: 'Recommended for you' },
//     // items: { type: Array as () => MediaItem[], default: () => defaultItems() },
//     items: { type: Array as () => MediaItem[], default: () => defaultItems() },
//     // how many items to try to show (max) on desktop; responsive math will adjust
//     visibleCount: { type: Number, default: 6 },
// });

/* ---------------------------
   Utilities: default demo items
   Replace images with your real poster URLs
   --------------------------- */
function defaultItems(): MediaItem[] {
    const genres = ['Action', 'Drama', 'Comedy', 'Sci-Fi', 'Documentary'];
    const sample: MediaItem[] = [];
    for (let i = 1; i <= 60; i++) {
        const genre = genres[i % genres.length];
        sample.push({
            id: i,
            title: `${genre} Show ${i}`,
            genre: genre as string,
            year: 2000 + (i % 25),
            image: `https://picsum.photos/seed/movie${i}/600/900`, // placeholder images
            meta: `${80 + (i % 20)}% • ${90 + (i % 5)}m`,
            // badge: i % 2 === 0 ? 'NEW' : undefined,
            badge: 'NEW'
        });
    }
    return sample;
}

/* ---------------------------
   Sort & group by genre
   --------------------------- */
const itemsSorted = computed(() => {
    return [...items.value].sort((a, b) => {
        if (a.genre === b.genre) return a.title.localeCompare(b.title);
        return a.genre.localeCompare(b.genre);
    });
});

const groupedGenres = computed(() => {
    const map = new Map<string, MediaItem[]>();
    for (const it of itemsSorted.value) {
        if (!map.has(it.genre)) map.set(it.genre, []);
        map.get(it.genre)!.push(it);
    }
    return Array.from(map.entries()).map(([genre, items]) => ({ genre, items }));
});

/* ---------------------------
   Carousel state per row
   --------------------------- */
const trackPositions = reactive<number[]>([]);        // translateX in px for each track
const containerWidths = reactive<number[]>([]);       // viewport width per row
const cardWidths = reactive<number[]>([]);            // card width per row
const centerIndex = reactive<number[]>([]);          // which item is centered per row
const itemsPerView = reactive<number[]>([]);         // how many visible per row (responsive)
const isDragging = reactive<boolean[]>([]);

// refs for DOM nodes
const viewports = ref<Array<HTMLElement | null>>([]);

/* initialize arrays based on number of rows */
function ensureRowState(count: number) {
    while (trackPositions.length < count) trackPositions.push(0);
    while (containerWidths.length < count) containerWidths.push(0);
    while (cardWidths.length < count) cardWidths.push(0);
    while (centerIndex.length < count) centerIndex.push(0);
    while (itemsPerView.length < count) itemsPerView.push(0);
    while (isDragging.length < count) isDragging.push(false);
    while (viewports.value.length < count) viewports.value.push(null);
}

/* ---------------------------
   Responsive sizing & compute helpers
   --------------------------- */

// compute items per view depending on viewport width (simple responsive logic)
function computeItemsPerViewFor(width: number) {
    if (width >= 1400) return Math.min(visibleCount.value, 7);
    if (width >= 1200) return Math.min(visibleCount.value, 6);
    if (width >= 992) return Math.min(visibleCount.value, 5);
    if (width >= 768) return Math.min(visibleCount.value, 4);
    if (width >= 576) return Math.min(visibleCount.value, 3);
    return Math.min(visibleCount.value, 2);
}

function updateLayout() {
    groupedGenres.value.forEach((group, rowIndex) => {
        const vp = viewports.value[rowIndex];
        if (!vp) return;
        const w = vp.clientWidth;
        containerWidths[rowIndex] = w;
        const perView = computeItemsPerViewFor(window.innerWidth);
        itemsPerView[rowIndex] = Math.min(perView, group.items.length);
        const gap = 12; // px gap (CSS uses .gap in track— but we set widths here)
        // desired card width to fit perView with small peek margin for center effect
        const cw = Math.floor((w - gap * (itemsPerView[rowIndex] - 1)) / itemsPerView[rowIndex]);
        cardWidths[rowIndex] = cw;
        // ensure current centerIndex within bounds
        if (centerIndex[rowIndex]! >= group.items.length) centerIndex[rowIndex] = Math.max(0, group.items.length - 1);
        // adjust trackPositions to align center
        alignToIndex(rowIndex, centerIndex[rowIndex]!, false);
    });
}

/* ---------------------------
   Track transform generation (used in template)
   --------------------------- */
function trackStyle(rowIndex: number) {
    // translate3d for smooth GPU animation
    return {
        transform: `translate3d(${trackPositions[rowIndex] || 0}px, 0, 0)`,
        transition: isDragging[rowIndex] ? 'none' : 'transform 400ms cubic-bezier(.2,.8,.2,1)',
        gap: '12px',
    };
}

function cardStyle(rowIndex: number) {
    const w = cardWidths[rowIndex] || 200;
    return {
        width: `${w}px`,
        minWidth: `${w}px`,
        maxWidth: `${w}px`,
    };
}

/* ---------------------------
   Align/scroll logic
   centerIndex: we try to center the chosen item in the viewport
   --------------------------- */
function alignToIndex(rowIndex: number, index: number, animate = true) {
    const vp = viewports.value[rowIndex];
    if (!vp) return;
    const cw = cardWidths[rowIndex] || 200;
    const gap = 12;
    const totalItemWidth = cw + gap;
    const centerOffset = (vp.clientWidth / 2) - (cw / 2);
    // compute target translate such that item at `index` sits centered
    const target = -(index * totalItemWidth) + centerOffset;
    // clamp so we don't show empty space at ends
    const maxTranslate = 0 + 8; // small positive to allow tiny peek
    const minTranslate = Math.min(-(groupedGenres.value[rowIndex]!.items.length * totalItemWidth - vp.clientWidth) - 8, 0);
    const clamped = Math.max(Math.min(target, maxTranslate), minTranslate);
    trackPositions[rowIndex] = clamped;
    if (!animate) {
        // force no transition for the next render (handled by trackStyle)
    }
    centerIndex[rowIndex] = index;
}

function isAtStart(rowIndex: number) {
    const idx = centerIndex[rowIndex] ?? 0;
    return idx <= 0;
}
function isAtEnd(rowIndex: number) {
    const idx = centerIndex[rowIndex] ?? 0;
    return idx >= groupedGenres.value[rowIndex]!.items.length - 1;
}

/* ---------------------------
   Next / Prev controls
   we move by one item (center moves right/left)
   --------------------------- */
function next(rowIndex: number) {
    const len = groupedGenres.value[rowIndex]!.items.length;
    const cur = centerIndex[rowIndex] ?? 0;
    if (cur < len - 1) {
        alignToIndex(rowIndex, cur + 1);
    } else {
        // small bounce: snap to end
        alignToIndex(rowIndex, len - 1);
    }
}

function prev(rowIndex: number) {
    const cur = centerIndex[rowIndex] ?? 0;
    if (cur > 0) alignToIndex(rowIndex, cur - 1);
    else alignToIndex(rowIndex, 0);
}

/* ---------------------------
   Pointer / touch dragging & swipe
   We'll implement a simple pointer drag that translates track,
   detects swipe velocity on end to move forward/backward.
   --------------------------- */
type DragState = {
    startX: number;
    lastX: number;
    lastTime: number;
    velocity: number;
    startTranslate: number;
};

const dragStates: Array<DragState | null> = [];

function ensureDragState(rowIndex: number) {
    while (dragStates.length <= rowIndex) dragStates.push(null);
    if (!dragStates[rowIndex]) dragStates[rowIndex] = { startX: 0, lastX: 0, lastTime: 0, velocity: 0, startTranslate: 0 };
}

/* Pointer events (desktop & pointer capable devices) */
function onPointerDown(e: PointerEvent, rowIndex: number) {
    const vp = (e.currentTarget as HTMLElement)?.closest('.carousel-viewport') as HTMLElement;
    ensureRowState(groupedGenres.value.length);
    ensureDragState(rowIndex);
    isDragging[rowIndex] = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const ds = dragStates[rowIndex]!;
    ds.startX = e.clientX;
    ds.lastX = e.clientX;
    ds.lastTime = performance.now();
    ds.velocity = 0;
    ds.startTranslate = trackPositions[rowIndex] ?? 0;
}

function onPointerMove(e: PointerEvent, rowIndex: number) {
    if (!isDragging[rowIndex]) return;
    const ds = dragStates[rowIndex]!;
    const dx = e.clientX - ds.lastX;
    const now = performance.now();
    const dt = Math.max(1, now - ds.lastTime);
    ds.velocity = dx / dt;
    ds.lastX = e.clientX;
    ds.lastTime = now;
    trackPositions[rowIndex] = (ds.startTranslate ?? 0) + (e.clientX - ds.startX);
}

function onPointerUp(e: PointerEvent, rowIndex: number) {
    if (!isDragging[rowIndex]) return;
    isDragging[rowIndex] = false;
    const ds = dragStates[rowIndex]!;
    const velocity = ds.velocity;
    const cw = cardWidths[rowIndex] || 200;
    const gap = 12;
    const threshold = 0.35; // velocity threshold
    const moveBy = Math.sign(velocity) !== 0 && Math.abs(velocity) > threshold ? -Math.sign(velocity) : 0;
    // compute approximate index based on center position after drag
    const vp = viewports.value[rowIndex];
    if (!vp) return;
    const totalItemWidth = cw + gap;
    // compute index from current translate
    const translate = trackPositions[rowIndex];
    const centerOffset = (vp.clientWidth / 2) - (cw / 2);
    const rawIndex = Math.round((centerOffset - translate!) / totalItemWidth);
    let newIndex = rawIndex + moveBy;
    newIndex = Math.max(0, Math.min(newIndex, groupedGenres.value[rowIndex]!.items.length - 1));
    alignToIndex(rowIndex, newIndex);
}

/* Touch events fallback (mobile browsers) */
function onTouchStart(ev: TouchEvent, rowIndex: number) {
    const t = ev.touches[0];
    ensureDragState(rowIndex);
    isDragging[rowIndex] = true;
    const ds = dragStates[rowIndex]!;
    ds.startX = t!.clientX;
    ds.lastX = t!.clientX;
    ds.lastTime = performance.now();
    ds.velocity = 0;
    ds.startTranslate = trackPositions[rowIndex] ?? 0;
}
function onTouchMove(ev: TouchEvent, rowIndex: number) {
    if (!isDragging[rowIndex]) return;
    const t = ev.touches[0];
    const ds = dragStates[rowIndex]!;
    const dx = t!.clientX - ds.lastX;
    const now = performance.now();
    const dt = Math.max(1, now - ds.lastTime);
    ds.velocity = dx / dt;
    ds.lastX = t!.clientX;
    ds.lastTime = now;
    trackPositions[rowIndex] = (ds.startTranslate ?? 0) + (t!.clientX - ds.startX);
}
function onTouchEnd(ev: TouchEvent, rowIndex: number) {
    if (!isDragging[rowIndex]) return;
    isDragging[rowIndex] = false;
    const ds = dragStates[rowIndex]!;
    const velocity = ds.velocity;
    const cw = cardWidths[rowIndex] || 200;
    const gap = 12;
    const threshold = 0.35;
    const moveBy = Math.sign(velocity) !== 0 && Math.abs(velocity) > threshold ? -Math.sign(velocity) : 0;
    const vp = viewports.value[rowIndex];
    if (!vp) return;
    const totalItemWidth = cw + gap;
    const translate = trackPositions[rowIndex];
    const centerOffset = (vp.clientWidth / 2) - (cw / 2);
    const rawIndex = Math.round((centerOffset - translate!) / totalItemWidth);
    let newIndex = rawIndex + moveBy;
    newIndex = Math.max(0, Math.min(newIndex, groupedGenres.value[rowIndex]!.items.length - 1));
    alignToIndex(rowIndex, newIndex);
}

/* ---------------------------
   Small utility: clicking play
   --------------------------- */
function onPlay(item: MediaItem) {
    // placeholder action — in real app, emit event or route to player
    // eslint-disable-next-line no-console
    console.log('Play clicked for', item);
    alert(`Play: ${item.title}`);
}

/* ---------------------------
   Setup lifecycle
   --------------------------- */
onMounted(() => {
    ensureRowState(groupedGenres.value.length);
    // populate viewports refs after mount
    // (we rely on the DOM order: each viewport gets index-based ref)
    const nodes = Array.from(document.querySelectorAll('.carousel-viewport')) as HTMLElement[];
    nodes.forEach((n, i) => {
        viewports.value[i] = n;
    });
    ensureRowState(groupedGenres.value.length);
    // initial layout and on resize
    updateLayout();
    window.addEventListener('resize', updateLayout, { passive: true });
});

/* watch for group changes */
watch(groupedGenres, (newG) => {
    ensureRowState(newG.length);
    // ensure viewports ref is still aligned
    setTimeout(() => {
        const nodes = Array.from(document.querySelectorAll('.carousel-viewport')) as HTMLElement[];
        nodes.forEach((n, i) => viewports.value[i] = n);
        updateLayout();
    }, 0);
}, { deep: true });

/* Initialize trackPositions for rows */
groupedGenres.value.forEach((_, i) => {
    ensureRowState(groupedGenres.value.length);
    trackPositions[i] = 0;
    centerIndex[i] = 0;
});

/* Expose small helpers for template */
const z = {
    prev, next, isAtStart, isAtEnd, trackStyle, cardStyle, onPointerDown,
    onPointerMove, onPointerUp, onTouchStart, onTouchMove, onTouchEnd, onPlay,
};

</script>

<style scoped>
/* Use Bootstrap variables where possible; this CSS supplies the "cinematic" look */
.carousel-section h3 {
    font-weight: 600;
}

/* viewport */
.carousel-viewport {
    width: 100%;
    /* small padding for center peek */
    padding: 8px 48px;
    box-sizing: border-box;
}

/* track: horizontal flex */
.carousel-track {
    display: flex;
    align-items: stretch;
    gap: 12px;
    will-change: transform;
    user-select: none;
    padding-bottom: 6px;
}

/* card */
.carousel-card {
    background: rgba(255, 255, 255, 0.03);
    border: none;
    color: #fff;
    transition: transform 300ms ease, box-shadow 300ms ease;
    transform-origin: center center;
    border-radius: 8px;
    overflow: hidden;
    min-height: 160px;
}

/* center item scales up */
.carousel-card.is-center {
    transform: scale(1.04);
    z-index: 2;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
}

/* poster */
.poster-wrap {
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border-radius: 6px 6px 0 0;
    background: #222;
}

.poster-wrap img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* gradient overlay over image for legibility */
.poster-gradient {
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.0) 30%, rgba(0, 0, 0, 0.55) 100%);
    pointer-events: none;
}

/* navigation arrows */
.carousel-nav {
    width: 44px;
    height: 44px;
    opacity: 0.95;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* play button small */
.btn-play {
    border-radius: 999px;
    padding-left: 10px;
    padding-right: 10px;
    font-weight: 600;
}

/* utilities */
.object-fit-cover {
    object-fit: cover;
}

/* Responsive tweaks */
@media (max-width: 768px) {
    .carousel-viewport {
        padding: 8px 24px;
    }

    .carousel-card.is-center {
        transform: scale(1.03);
    }
}
</style>
