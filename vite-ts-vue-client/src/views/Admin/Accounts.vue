<template>
	<div class="container">
		<h1 class="text-center">Accounts</h1>
		<div v-if="adminStore.loading" class="d-flex justify-content-center">
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
					<tr v-for="account in adminStore.accounts" class="">
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
import { useAdminStore } from '@/stores/admin.store';
import { onMounted, ref } from 'vue';

const adminStore = useAdminStore();

onMounted(async () => {
	document.title = `Cinema | Admin-Accounts`;
});
</script>

<style></style>
