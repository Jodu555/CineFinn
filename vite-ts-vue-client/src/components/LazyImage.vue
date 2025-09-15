<!-- <template>
	<div>
		<div v-if="loading" class="text-center justtify-content-center mt-3">
			<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<img ref="image" :class="props.childclass" :alt="props.alt" />
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps(['src', 'alt', 'childclass']);

const loading = ref(true);

const image = ref<HTMLImageElement | null>(null);

function loadImage() {
	if (!image.value) return;
	image.value.addEventListener('load', () => {
		loading.value = false;
	});
	image.value.addEventListener('error', () => console.log('Error on Loading Image', props.src));
	image.value.src = props.src;
}

function createObserver() {
	if (!image.value) return;
	const options = {
		root: null,
		threshold: 0,
	};
	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				loadImage();
				observer.unobserve(image.value as Element);
			}
		});
	}, options);
	observer.observe(image.value);
}

onMounted(() => {
	if (window['IntersectionObserver']) {
		createObserver();
	} else {
		loadImage();
	}
});
</script> -->
<template>
	<div>
		<div v-if="loading" class="text-center justify-content-center mt-3">
			<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<img ref="image" :class="props.childclass" :alt="props.alt" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps(['src', 'alt', 'childclass']);
const loading = ref(true);
const image = ref<HTMLImageElement | null>(null);
let loadTimeout: ReturnType<typeof setTimeout> | null = null;

function loadImage() {
	if (!image.value || loading.value == false) return;
	image.value.addEventListener('load', (event) => {
		loading.value = false;
	});
	image.value.addEventListener('error', () => console.log('Error on Loading Image', props.src));
	image.value.src = props.src;
}

function createObserver() {
	if (!image.value) return;

	const options = {
		root: null,
		threshold: 0,
		rootMargin: '1000px'
	} as IntersectionObserverInit;

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				loadTimeout = setTimeout(() => {
					if (entry.isIntersecting) {
						loadImage();
					}
				}, 50);
			} else {
				if (loadTimeout) {
					clearTimeout(loadTimeout);
					loadTimeout = null;
				}
			}
		});
	}, options);

	observer.observe(image.value);
}

onMounted(() => {
	if (window['IntersectionObserver']) {
		createObserver();
	} else {
		loadImage();
	}
});
</script>

<!-- <template>
	<div>
		<div v-if="loading" class="text-center justify-content-center mt-3">
			<div class="spinner-border" style="width: 3rem; height: 3rem" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<img ref="image" :class="props.childclass" :alt="props.alt" />
	</div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';

interface CacheEntry {
	url: string;
	dataURL: string;
	etag?: string;
	lastModified?: string;
	cachedAt: number;
	contentType: string;
	size: number;
}

interface CacheOptions {
	maxAge: number; // milliseconds
	maxSize: number; // bytes
	maxEntries: number;
	checkForUpdates: boolean;
	storeName: string;
	outputFormat: string;
	quality: number;
}

const props = withDefaults(defineProps<{
	src: string;
	alt?: string;
	childclass?: string;
	// Caching options
	enableCache?: boolean;
	maxAge?: number; // Cache max age in milliseconds (default: 24 hours)
	maxSize?: number; // Max cache size in bytes (default: 50MB)
	maxEntries?: number; // Max number of cached entries (default: 100)
	checkForUpdates?: boolean; // Check for image updates (default: true)
	storeName?: string; // IndexedDB store name
	outputFormat?: string; // Output format for cached images
	quality?: number; // JPEG quality (0-1)
	rootMargin?: string; // Intersection observer root margin
	loadDelay?: number; // Delay before loading in ms
}>(), {
	alt: '',
	childclass: '',
	enableCache: true,
	maxAge: 24 * 60 * 60 * 1000, // 24 hours
	maxSize: 50 * 1024 * 1024, // 50MB
	maxEntries: 500,
	checkForUpdates: true,
	storeName: 'ImageCache',
	outputFormat: 'image/jpeg',
	quality: 0.8,
	rootMargin: '1000px',
	loadDelay: 50
});

const loading = ref(true);
const image = ref<HTMLImageElement | null>(null);
let loadTimeout: ReturnType<typeof setTimeout> | null = null;
let db: IDBDatabase | null = null;

const cacheOptions = computed((): CacheOptions => ({
	maxAge: props.maxAge,
	maxSize: props.maxSize,
	maxEntries: props.maxEntries,
	checkForUpdates: props.checkForUpdates,
	storeName: props.storeName,
	outputFormat: props.outputFormat,
	quality: props.quality
}));

// Initialize IndexedDB
async function initDB(): Promise<IDBDatabase> {
	if (db) return db;

	return new Promise((resolve, reject) => {
		const request = indexedDB.open('LazyImageCache', 1);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(props.storeName)) {
				const store = database.createObjectStore(props.storeName, { keyPath: 'url' });
				store.createIndex('cachedAt', 'cachedAt', { unique: false });
				store.createIndex('size', 'size', { unique: false });
			}
		};
	});
}

// Get cached image
async function getCachedImage(url: string): Promise<CacheEntry | null> {
	if (!props.enableCache) return null;

	try {
		const database = await initDB();
		return new Promise((resolve, reject) => {
			const transaction = database.transaction([props.storeName], 'readonly');
			const store = transaction.objectStore(props.storeName);
			const request = store.get(url);

			request.onsuccess = () => {
				const entry = request.result as CacheEntry;
				if (entry && Date.now() - entry.cachedAt < cacheOptions.value.maxAge) {
					resolve(entry);
				} else if (entry) {
					// Entry exists but is expired, remove it
					deleteCachedImage(url);
					resolve(null);
				} else {
					resolve(null);
				}
			};
			request.onerror = () => resolve(null);
		});
	} catch (error) {
		console.warn('Failed to get cached image:', error);
		return null;
	}
}

// Save image to cache
async function cacheImage(url: string, dataURL: string, headers: Headers): Promise<void> {
	if (!props.enableCache) return;

	try {
		const database = await initDB();

		// Clean cache if needed
		// await cleanCache();

		const entry: CacheEntry = {
			url,
			dataURL,
			etag: headers.get('etag') || undefined,
			lastModified: headers.get('last-modified') || undefined,
			cachedAt: Date.now(),
			contentType: headers.get('content-type') || 'image/jpeg',
			size: dataURL.length
		};

		return new Promise((resolve, reject) => {
			const transaction = database.transaction([props.storeName], 'readwrite');
			const store = transaction.objectStore(props.storeName);
			const request = store.put(entry);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.warn('Failed to cache image:', error);
	}
}

// Delete cached image
async function deleteCachedImage(url: string): Promise<void> {
	if (!props.enableCache) return;

	try {
		const database = await initDB();
		return new Promise((resolve) => {
			const transaction = database.transaction([props.storeName], 'readwrite');
			const store = transaction.objectStore(props.storeName);
			const request = store.delete(url);
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
		});
	} catch (error) {
		console.warn('Failed to delete cached image:', error);
	}
}

// Clean cache based on size and entry limits
async function cleanCache(): Promise<void> {
	try {
		const database = await initDB();

		return new Promise((resolve) => {
			const transaction = database.transaction([props.storeName], 'readwrite');
			const store = transaction.objectStore(props.storeName);
			const index = store.index('cachedAt');
			const request = index.openCursor();

			const entries: CacheEntry[] = [];
			let totalSize = 0;

			request.onsuccess = () => {
				const cursor = request.result;
				if (cursor) {
					const entry = cursor.value as CacheEntry;
					entries.push(entry);
					totalSize += entry.size;
					cursor.continue();
				} else {
					// Sort by cachedAt (oldest first)
					entries.sort((a, b) => a.cachedAt - b.cachedAt);

					// Remove entries if over limits
					const toDelete: string[] = [];

					// Check entry count limit
					if (entries.length > cacheOptions.value.maxEntries) {
						const excess = entries.length - cacheOptions.value.maxEntries;
						toDelete.push(...entries.slice(0, excess).map(e => e.url));
					}

					// Check size limit
					if (totalSize > cacheOptions.value.maxSize) {
						let currentSize = totalSize;
						for (const entry of entries) {
							if (currentSize <= cacheOptions.value.maxSize) break;
							if (!toDelete.includes(entry.url)) {
								toDelete.push(entry.url);
								currentSize -= entry.size;
							}
						}
					}

					// Delete excess entries
					if (toDelete.length > 0) {
						const deleteTransaction = database.transaction([props.storeName], 'readwrite');
						const deleteStore = deleteTransaction.objectStore(props.storeName);
						toDelete.forEach(url => deleteStore.delete(url));
					}

					resolve();
				}
			};
			request.onerror = () => resolve();
		});
	} catch (error) {
		console.warn('Failed to clean cache:', error);
	}
}

// Check if image needs update
async function needsUpdate(url: string, cachedEntry: CacheEntry): Promise<boolean> {
	if (!props.checkForUpdates) return false;

	try {
		const response = await fetch(url, { method: 'HEAD' });

		const etag = response.headers.get('etag');
		const lastModified = response.headers.get('last-modified');

		if (etag && cachedEntry.etag) {
			return etag !== cachedEntry.etag;
		}

		if (lastModified && cachedEntry.lastModified) {
			return new Date(lastModified).getTime() > new Date(cachedEntry.lastModified).getTime();
		}

		return false;
	} catch (error) {
		console.warn('Failed to check for updates:', error);
		return false;
	}
}

// Convert image to data URL
function imageToDataURL(img: HTMLImageElement): string {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return '';

	canvas.height = img.naturalHeight;
	canvas.width = img.naturalWidth;
	ctx.drawImage(img, 0, 0);

	return canvas.toDataURL(props.outputFormat, props.quality);
}

// Load image with caching
async function loadImage() {
	if (!image.value || loading.value === false) return;

	try {
		// Check cache first
		const cachedEntry = await getCachedImage(props.src);

		if (cachedEntry) {
			console.log('Cache Hit', props.src);

			// Use cached image
			image.value.src = cachedEntry.dataURL;
			loading.value = false;

			// Check for updates in background if enabled
			if (props.checkForUpdates) {
				const needsUpdateResult = await needsUpdate(props.src, cachedEntry);
				if (needsUpdateResult) {
					// Fetch and cache new version
					fetchAndCacheImage(props.src, true);
				}
			}
			return;
		}
		console.log('Cache Miss', props.src);

		// No cache, fetch image
		await fetchAndCacheImage(props.src);

	} catch (error) {
		console.error('Error loading image:', error);
		// Fallback to direct loading
		loadImageDirect();
	}
}

// Fetch image and cache it
async function fetchAndCacheImage(url: string, isUpdate: boolean = false) {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const blob = await response.blob();
		const objectURL = URL.createObjectURL(blob);

		const tempImg = new Image();
		tempImg.onload = async () => {
			const dataURL = imageToDataURL(tempImg);

			// Cache the image
			await cacheImage(url, dataURL, response.headers);

			// Update display if this is not a background update
			if (!isUpdate) {
				if (image.value) {
					image.value.src = dataURL;
					loading.value = false;
				}
			}

			URL.revokeObjectURL(objectURL);
		};

		tempImg.onerror = () => {
			URL.revokeObjectURL(objectURL);
			if (!isUpdate) loadImageDirect();
		};

		tempImg.src = objectURL;

	} catch (error) {
		console.error('Error fetching image:', error);
		if (!isUpdate) loadImageDirect();
	}
}

// Fallback direct image loading
function loadImageDirect() {
	if (!image.value) return;

	image.value.addEventListener('load', () => {
		loading.value = false;
	});

	image.value.addEventListener('error', () => {
		console.log('Error on Loading Image', props.src);
		loading.value = false;
	});

	image.value.src = props.src;
}

// Create intersection observer
function createObserver() {
	if (!image.value) return;

	const options: IntersectionObserverInit = {
		root: null,
		threshold: 0,
		rootMargin: props.rootMargin
	};

	const observer = new IntersectionObserver((entries) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				loadTimeout = setTimeout(() => {
					if (entry.isIntersecting) {
						loadImage();
					}
				}, props.loadDelay);
			} else {
				if (loadTimeout) {
					clearTimeout(loadTimeout);
					loadTimeout = null;
				}
			}
		});
	}, options);

	observer.observe(image.value);
}

// Clear cache method (can be called from parent)
async function clearCache(): Promise<void> {
	if (!props.enableCache) return;

	try {
		const database = await initDB();
		return new Promise((resolve) => {
			const transaction = database.transaction([props.storeName], 'readwrite');
			const store = transaction.objectStore(props.storeName);
			const request = store.clear();
			request.onsuccess = () => resolve();
			request.onerror = () => resolve();
		});
	} catch (error) {
		console.warn('Failed to clear cache:', error);
	}
}

// Get cache stats
async function getCacheStats(): Promise<{ count: number; totalSize: number; }> {
	if (!props.enableCache) return { count: 0, totalSize: 0 };

	try {
		const database = await initDB();
		return new Promise((resolve) => {
			const transaction = database.transaction([props.storeName], 'readonly');
			const store = transaction.objectStore(props.storeName);
			const request = store.getAll();

			request.onsuccess = () => {
				const entries = request.result as CacheEntry[];
				const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
				resolve({ count: entries.length, totalSize });
			};
			request.onerror = () => resolve({ count: 0, totalSize: 0 });
		});
	} catch (error) {
		console.warn('Failed to get cache stats:', error);
		return { count: 0, totalSize: 0 };
	}
}

// Expose methods to parent component
defineExpose({
	clearCache,
	getCacheStats,
	deleteCachedImage
});

onMounted(() => {
	if (window['IntersectionObserver']) {
		createObserver();
	} else {
		loadImage();
	}
});
</script> -->