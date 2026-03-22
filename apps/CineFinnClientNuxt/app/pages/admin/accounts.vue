<template>
	<div class="container">
		<h1 class="text-center">Accounts ({{ accounts?.length || 0 }})</h1>
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
		<div v-if="error" class="alert alert-danger" role="alert"><strong>Error:</strong> {{ error }}</div>
		<div class="table-responsive">
			<table class="table">
				<thead>
					<tr>
						<th scope="col">UUID (first -)</th>
						<th scope="col">Username</th>
						<th scope="col">E-Mail</th>
						<th scope="col">Role</th>
						<th scope="col">Status</th>
						<th scope="col">Last Seen</th>
						<th scope="col">Last Login</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="account in accounts" class="">
						<td scope="row">{{ account.UUID.split('-')[0] }}</td>
						<td>{{ account.username }}</td>
						<td>{{ account.email.includes('@nil.com') ? 'N/A' : account.email }}</td>
						<td>{{ roleIDToName(account.role) }}</td>
						<td>{{ capitalize(account.status) }}</td>
						<td>{{ account.activityDetails?.lastHandshake }}</td>
						<td>{{ account.activityDetails?.lastLogin }}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({
	middleware: 'auth',
});

const adminStore = useAdminStore();

await callOnce('loadAccounts', () => adminStore.loadAccounts(), { mode: 'navigation' });

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);
const accounts = computed(() => adminStore.accounts);

const capitalize = (str: string) => {
	return str.charAt(0).toUpperCase() + str.slice(1);
};

// await callOnce('loadAccounts', () => adminStore.loadAccounts(), { mode: 'navigation' });
</script>

<style></style>
