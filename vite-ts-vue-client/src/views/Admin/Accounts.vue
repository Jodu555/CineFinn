<template>
	<div class="container">
		<h1 class="text-center">Accounts</h1>
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div class="table-responsive">
			<table class="table">
				<thead>
					<tr>
						<th scope="col">UUID</th>
						<th scope="col">Username</th>
						<th scope="col">Role</th>
						<th scope="col">Last Seen</th>
						<th scope="col">Last Login</th>
						<th scope="col">Last Ip</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="account in accounts" class="">
						<td scope="row">{{ account.UUID }}</td>
						<td>{{ account?.username }}</td>
						<td>{{ account?.role }}</td>
						<td>{{ account?.activityDetails?.lastHandshake }}</td>
						<td>{{ account?.activityDetails?.lastLogin }}</td>
						<td>{{ account?.activityDetails?.lastIP }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useAxios } from '@/utils';
import { onMounted, ref } from 'vue';

const loading = ref(false);

const accounts = ref<DBAccount[]>([]);

interface DBAccount {
	UUID: string;
	username: string;
	email: string;
	role: number;
	settings: object;
	activityDetails: {
		lastIP: string;
		lastHandshake: string;
		lastLogin: string;
	};
}

onMounted(async () => {
	document.title = `Cinema | Admin-Accounts`;

	loading.value = true;

	const response = await useAxios().get<DBAccount[]>('/admin/accounts');

	if (response.status == 200) {
		accounts.value = response?.data;
	}

	loading.value = false;
});
</script>

<style></style>
