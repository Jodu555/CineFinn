<template>
	<div>
		<h2 class="text-center">Test Route</h2>

		<div class="d-flex justify-content-center">
			<div class="min-h-screen flex overflow-x-scroll py-12">
				<div v-for="column in columns" :key="column.title" class="col-1 bg-gray-100 rounded-lg px-3 py-3 column-width rounded mr-4">
					<p class="text-gray-700 font-semibold font-sans tracking-wide text-sm">{{ column.title }}</p>
					<!-- Draggable component comes from vuedraggable. It provides drag & drop functionality -->
					<draggable :list="column.tasks" :animation="200" ghost-class="ghost-card" group="tasks">
						<!-- Each element from here will be draggable and animated. Note :key is very important here to be unique both for draggable and animations to be smooth & consistent. -->
						<TaskCard v-for="task in column.tasks" :key="task.id" :task="task" class="mt-3 cursor-move"></TaskCard>
						<!-- </transition-group> -->
					</draggable>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import TaskCard from '@/components/TaskCard.vue';
import { ref } from 'vue';

const columns = ref([
	{
		title: 'Backlog',
		tasks: [
			{
				id: 1,
				title: 'Add discount code to checkout page',
				date: 'Sep 14',
				type: 'Feature Request',
			},
			{
				id: 2,
				title: 'Provide documentation on integrations',
				date: 'Sep 12',
			},
			{
				id: 3,
				title: 'Design shopping cart dropdown',
				date: 'Sep 9',
				type: 'Design',
			},
			{
				id: 4,
				title: 'Add discount code to checkout page',
				date: 'Sep 14',
				type: 'Feature Request',
			},
			{
				id: 5,
				title: 'Test checkout flow',
				date: 'Sep 15',
				type: 'QA',
			},
		],
	},
	{
		title: 'In Progress',
		tasks: [
			{
				id: 6,
				title: 'Design shopping cart dropdown',
				date: 'Sep 9',
				type: 'Design',
			},
			{
				id: 7,
				title: 'Add discount code to checkout page',
				date: 'Sep 14',
				type: 'Feature Request',
			},
			{
				id: 8,
				title: 'Provide documentation on integrations',
				date: 'Sep 12',
				type: 'Backend',
			},
		],
	},
	{
		title: 'Review',
		tasks: [
			{
				id: 9,
				title: 'Provide documentation on integrations',
				date: 'Sep 12',
			},
			{
				id: 10,
				title: 'Design shopping cart dropdown',
				date: 'Sep 9',
				type: 'Design',
			},
			{
				id: 11,
				title: 'Add discount code to checkout page',
				date: 'Sep 14',
				type: 'Feature Request',
			},
			{
				id: 12,
				title: 'Design shopping cart dropdown',
				date: 'Sep 9',
				type: 'Design',
			},
			{
				id: 13,
				title: 'Add discount code to checkout page',
				date: 'Sep 14',
				type: 'Feature Request',
			},
		],
	},
	{
		title: 'Done',
		tasks: [
			{
				id: 14,
				title: 'Add discount code to checkout page',
				date: 'Sep 14',
				type: 'Feature Request',
			},
			{
				id: 15,
				title: 'Design shopping cart dropdown',
				date: 'Sep 9',
				type: 'Design',
			},
			{
				id: 16,
				title: 'Add discount code to checkout page',
				date: 'Sep 14',
				type: 'Feature Request',
			},
		],
	},
]);
</script>

<style></style>
