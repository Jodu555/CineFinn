<template>
  <div class="container">
    <h1 class="text-center">Accounts ({{ accounts?.length || 0 }})</h1>
    <div v-if="status === 'pending'" class="d-flex justify-content-center">
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
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in accounts" class="">
            <td scope="row">{{ account.UUID }}</td>
            <td>{{ account?.username }}</td>
            <td>{{ roleIDToName(account?.role) }}</td>
            <td>{{ account?.activityDetails?.lastHandshake }}</td>
            <td>{{ account?.activityDetails?.lastLogin }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Account } from '@cinefinn/types/database';
import useAPIURL from '~/hooks/useAPIURL';

const { status, data: accounts } = await useFetch<Account[]>(useAPIURL() + '/admin/accounts', {
  key: 'admin-accounts',
  method: 'GET',
  headers: {
    'auth-token': useAuthStore().authToken,
  },
});

</script>

<style></style>