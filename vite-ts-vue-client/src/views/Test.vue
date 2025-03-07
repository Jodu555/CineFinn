<template>
	<div>
		<h2 class="text-center">Test Route</h2>

		<div class="d-flex justify-content-center" v-if="false">
			<div class="d-flex overflow-x-scroll pb-2" style="overflow-y: hidden">
				<div
					v-for="column in columns"
					:key="column.title"
					class="border border-secondary rounded-lg px-3 py-3 me-3 column-width rounded mr-4">
					<p class="display-6">{{ column.title }}</p>
					<!-- Draggable component comes from vuedraggable. It provides drag & drop functionality -->
					<draggable :list="column.todos" :animation="200" class="fully" ghost-class="ghost-card" group="tasks" item-key="id">
						<template #item="{ element }">
							<TaskCard :permittedAccounts="permittedAccounts" :element="element" class="mt-3 cursor-move"></TaskCard>
						</template>
						<!-- Each element from here will be draggable and animated. Note :key is very important here to be unique both for draggable and animations to be smooth & consistent. -->
						<!-- </transition-group> -->
					</draggable>
				</div>
			</div>
		</div>
		<div v-else class="d-flex flex-column align-items-center">
			<div class="d-flex flex-column pb-2 w-100">
				<div v-for="column in columns" :key="column.title" class="border border-secondary rounded-lg px-3 py-3 mb-3">
					<p class="display-6 text-center">{{ column.title }}</p>
					<!-- style="flex-wrap: nowrap; max-width: 45%; width: 45%" -->
					<draggable
						:list="column.todos"
						:animation="200"
						class="fully row"
						style="flex-wrap: nowrap"
						ghost-class="ghost-card"
						group="tasks"
						item-key="id">
						<template #item="{ element }">
							<TaskCard :permittedAccounts="permittedAccounts" :element="element" class="col-3 mt-3 cursor-move"></TaskCard>
						</template>
					</draggable>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import draggable from 'vuedraggable';
import TaskCard from '@/components/TaskCard.vue';
import { useAxios } from '@/utils';
import type { DatabaseParsedTodoItem } from '@Types/database';

const columns = ref<{ title: string; todos: any[] | DatabaseParsedTodoItem[] }[]>([
	{
		title: 'Releases',
		todos: [],
	},
	{
		title: 'Jodu',
		todos: [],
	},
	{
		title: 'TRyFlow',
		todos: [],
	},
	{
		title: 'Waiting',
		todos: [],
	},
	{
		title: 'K-Drama',
		todos: [],
	},
]);

const loading = ref(false);

const list = ref<DatabaseParsedTodoItem[]>([]);
const permittedAccounts = ref<permAcc[]>([]);

interface permAcc {
	UUID: string;
	username: string;
	role: number;
}

onMounted(async () => {
	document.title = `Cinema | Todo`;
	loading.value = true;

	const [response, accResponse] = await Promise.all([
		useAxios().get<DatabaseParsedTodoItem[]>('/todo/'),
		useAxios().get<permAcc[]>('/todo/permittedAccounts'),
	]);

	if (response.status == 200) {
		list.value = response?.data?.sort((a, b) => a.order - b.order);
		columns.value[0].todos = list.value;
		// columns.value[0].todos = list.value.splice(-3);
	}
	if (accResponse.status == 200) {
		permittedAccounts.value = accResponse.data;
	}

	loading.value = false;
});
</script>

<style>
.column-width {
	min-width: 500px;
	width: 500px;
}
/* Unfortunately @apply cannot be setup in codesandbox, 
but you'd use "@apply border opacity-50 border-blue-500 bg-gray-200" here */
.ghost-card {
	opacity: 0.5;
	/* background: #f7fafc; */
	/* border: 1px solid #4299e1; */
}

.fully {
	height: 100%;
}
</style>
