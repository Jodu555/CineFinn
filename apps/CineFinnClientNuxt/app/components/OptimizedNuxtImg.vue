<template>
    <!-- ClientOnly prevents server from rendering the image HTML -->
    <ClientOnly>
        <div ref="root" :class="containerClass" :style="containerStyle" role="img" :aria-label="alt ?? undefined">
            <NuxtImg v-show="visible" :src="visible ? (src as string) : 'https://noop.org'" :alt="alt" :width="width"
                :height="height" :sizes="sizes" :format="format" :provider="provider" :loading="(loadingAttr as any)"
                v-bind="nuxtImgAttrs" :style="{ width, height }" />
            <div v-if="!visible" class="lazy-placeholder" :style="placeholderStyle">Loading....</div>
            <!-- Render NuxtImg only when visible -->
            <!-- <NuxtImg v-if="visible" :src="(src as string)" :alt="alt" :width="width" :height="height" :sizes="sizes"
                :format="format" :provider="provider" :loading="(loadingAttr as any)" v-bind="nuxtImgAttrs" :style="{
                    width,
                    height,
                }" />
            <template v-else>
                <slot name="placeholder">
                    <div class="lazy-placeholder" :style="placeholderStyle">Loading....</div>
                </slot>
            </template> -->
        </div>
    </ClientOnly>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'

/**
 * Props:
 * - src: image source (string)
 * - width/height: pass to NuxtImg when available (number|string)
 * - alt: accessible alt text
 * - rootMargin / threshold: IntersectionObserver options
 * - placeholderHeight / placeholderBg: quick placeholder visual
 * - loadingAttr: 'lazy' | 'eager' | undefined (defaults to 'lazy' when mounted)
 * - provider / format / sizes: forwarded to NuxtImg
 */
const props = defineProps({
    src: { type: [String, Object], required: true },
    alt: { type: String, default: '' },
    width: { type: [String, Number], default: undefined },
    height: { type: [String, Number], default: undefined },
    sizes: { type: String, default: undefined },
    provider: { type: String, default: undefined },
    format: { type: String, default: undefined },
    // IntersectionObserver options
    rootMargin: { type: String, default: '200px' }, // pre-load slightly before visible
    threshold: { type: [Number, Array], default: 0 },
    // Visual placeholder options
    placeholderHeight: { type: String, default: '200px' },
    placeholderBg: { type: String, default: '#f3f3f3' },
    // Pass additional attributes to nuxt-img via object
    nuxtImgAttrs: { type: Object, default: () => ({}) },
    // prefer explicit loading attr, otherwise default to 'lazy' when mounted
    loadingAttr: { type: String, default: undefined },
    containerClass: { type: [String, Array, Object], default: '' },
    containerStyle: { type: [String, Object], default: '' },
})

// const root = ref<HTMLElement | null>(null)
const root = useTemplateRef('root');
const visible = ref(false)
let observer: IntersectionObserver | null = null

const placeholderStyle = computed(() => ({
    height: props.placeholderHeight,
    background: props.placeholderBg,
    display: 'block',
    width: '100%'
}))

// If user didn't set loadingAttr, use 'lazy' for the actual <NuxtImg>
const loadingAttr = computed(() => props.loadingAttr ?? 'lazy')

onNuxtReady(() => {
    // console.log('onNuxtReady called');
    trySetup();
})

onMounted(() => {
    // console.log('onMounted called');

    trySetup();
});

function trySetup() {
    // console.log('Came 1', root.value, visible.value, observer == null);
    // Only run on client
    if (!root.value) return

    // If IntersectionObserver unsupported, fallback to immediate show
    if (!('IntersectionObserver' in window)) {
        visible.value = true
        return
    }

    if (observer !== null) return;

    observer = new IntersectionObserver(
        (entries, obs) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    visible.value = true
                    // If you want the image to only load once, unobserve and stop.
                    if (obs && root.value) obs.unobserve(root.value)
                }
            }
        },
        {
            root: null,
            rootMargin: props.rootMargin,
        }
    )

    observer.observe(root.value)
}

onBeforeUnmount(() => {
    // console.log('onBeforeUnmount called');
    if (observer && root.value) {
        observer.unobserve(root.value)
        observer.disconnect()
        observer = null
    }
})
</script>

<style scoped>
.lazy-placeholder {
    width: 100%;
    object-fit: cover;
    background: gray;
}
</style>
