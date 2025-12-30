<template>
    <div class="container">
        <br />

        <div class="d-flex justify-content-between">
            <button v-if="authStore.user.role >= 2" class="btn btn-outline-primary mb-5"
                @click="todoStore.addEmptyItem()">Add
                Item</button>

            <button class="btn btn-outline-warning mb-5" @click="todoStore.minimal = !todoStore.minimal">Minimal
                View</button>

            <button v-if="authStore.user.role >= 2" class="btn btn-outline-danger mb-5"
                @click="todoStore.rescrapeAllItems()">Rescrape All Items</button>
        </div>

        <div v-if="todoStore.loading" class="d-flex justify-content-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <!-- <pre>
            {{ todoStore.list }}
        </pre> -->

        <VueDraggableNext v-model="todoStore.list" @change="todoStore.onListChange" class="list-group" tag="ul"
            :component-data="{
                tag: 'ul',
                name: !todoStore.drag ? 'flip-list' : null,
            }" v-bind="dragOptions" @start="todoStore.drag = true" @end="todoStore.drag = false" item-key="ID">
            <template v-for="element in todoStore.list">
                <TodoItem :element="element" :minimal="todoStore.minimal" :list-length="todoStore.list.length"
                    :permitted-accounts="permittedAccounts" :drag="todoStore.drag" />
            </template>
        </VueDraggableNext>

    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VueDraggableNext } from 'vue-draggable-next'

definePageMeta({
    middleware: ['auth'],
});

const authStore = useAuthStore();
const todoStore = useTodoStore();

await callOnce('loadTodoList', () => todoStore.loadTodoList(), { mode: 'navigation' });

const permittedAccounts = computed(() => todoStore.permittedAccounts);

onMounted(() => {
    window.addEventListener('resize', handleWindowSizeChange);
    handleWindowSizeChange();
});

onUnmounted(() => {
    window.removeEventListener('resize', handleWindowSizeChange);
});

const handleWindowSizeChange = () => {
    windowWidth.value = window.innerWidth;
    if (windowWidth.value < 580) {
    }
};

const windowWidth = ref(600);

const dragOptions = computed(() => {
    return {
        animation: 200,
        group: 'description',
        disabled: windowWidth.value < 580,
        ghostClass: 'ghost',
    };
});
</script>

<style scoped>
/* .drag-container {
    min-height: 200px;
    padding: 20px;
}

.drag-item {
    padding: 10px;
    margin: 5px 0;
    background: #f0f0f0;
    border-radius: 4px;
    cursor: move;
    transition: background 0.2s;
}

.drag-item:hover {
    background: #e0e0e0;
} */
</style>