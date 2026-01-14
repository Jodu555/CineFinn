<template>
    <!-- Teleport is used to render the modal at the end of the body tag to avoid z-index issues -->
    <Teleport to="body">
        <div ref="modalElement" class="modal fade" :id="id" tabindex="-1" aria-labelledby="modalLabel"
            aria-hidden="true">
            <div class="modal-dialog" :class="[
                { 'modal-dialog-centered': centered },
                { 'modal-dialog-scrollable': scrollable },
                size ? `modal-${size}` : ''
            ]">
                <div class="modal-content">
                    <slot name="header">
                        <div v-if="title" class="modal-header">
                            <h5 class="modal-title" id="modalLabel">{{ title }}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                    </slot>
                    <div class="modal-body">
                        <slot />
                    </div>
                    <slot name="footer">
                        <div v-if="$slots.footer" class="modal-footer">
                            <slot name="footer" />
                        </div>
                    </slot>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'

interface Props {
    modelValue: boolean
    id?: string
    title?: string
    size?: 'sm' | 'lg' | 'xl'
    centered?: boolean
    scrollable?: boolean
    backdrop?: boolean | 'static'
    keyboard?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    id: 'bootstrapModal',
    title: '',
    size: undefined,
    centered: false,
    scrollable: false,
    backdrop: true,
    keyboard: true
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'show'): void
    (e: 'shown'): void
    (e: 'hide'): void
    (e: 'hidden'): void
}>()

const modalElement = ref<HTMLDivElement | null>(null)

let bsModal: any = null

onMounted(async () => {
    if (modalElement.value && typeof window !== 'undefined') {
        const { Modal } = await import('bootstrap')
        if (Modal) {
            bsModal = new Modal(modalElement.value, {
                backdrop: props.backdrop,
                keyboard: props.keyboard
            })

            // Event Listeners to sync state with Bootstrap
            modalElement.value.addEventListener('hidden.bs.modal', () => {
                emit('update:modelValue', false)
                emit('hidden')
            })

            modalElement.value.addEventListener('show.bs.modal', () => {
                emit('show')
            })

            modalElement.value.addEventListener('shown.bs.modal', () => {
                emit('shown')
            })

            modalElement.value.addEventListener('hide.bs.modal', () => {
                emit('hide')
            })
        }
    }
})

onBeforeUnmount(() => {
    if (bsModal) {
        bsModal.dispose()
    }
})

watch(
    () => props.modelValue,
    (newValue) => {
        if (!bsModal) return

        if (newValue) {
            bsModal.show()
        } else {
            bsModal.hide()
        }
    }
)
</script>