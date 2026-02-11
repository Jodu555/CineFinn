<template>
	<div class="container-fluid">
		<div class="row flex-nowrap">
			<div class="col-auto col-md-3 col-xl-2 px-sm-2 px-0">
				<div class="d-flex flex-column align-items-center align-items-sm-start px-3 pt-2 text-white">
					<NuxtLink to="/admin" class="d-flex align-items-center pb-3 mb-md-0 me-md-auto text-white text-decoration-none">
						<div class="nav-link px-0 align-middle" to="/admin">
							<span class="fs-5 d-none d-sm-inline">Admin Area</span>
						</div>
					</NuxtLink>
					<ul class="nav flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start" id="menu">
						<li class="nav-item">
							<NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/"
								><span class="ms-1 d-none d-sm-inline">Overview</span></NuxtLink
							>
						</li>
						<li>
							<NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/accounts"
								><span class="ms-1 d-none d-sm-inline">Accounts</span></NuxtLink
							>
						</li>
						<li>
							<NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/subsystems"
								><span class="ms-1 d-none d-sm-inline">SubSystems</span>
							</NuxtLink>
						</li>
						<li>
							<NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/emails">
								<span class="ms-1 d-none d-sm-inline">Emails</span>
							</NuxtLink>
						</li>
						<li>
							<NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/config">
								<span class="ms-1 d-none d-sm-inline">Config</span>
							</NuxtLink>
						</li>
						<li>
							<NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/jobs">
								<span class="ms-1 d-none d-sm-inline">System Jobs</span>
							</NuxtLink>
						</li>
						<li>
							<NuxtLink class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/ignore-list">
								<span class="ms-1 d-none d-sm-inline">Ignore List</span>
							</NuxtLink>
						</li>
					</ul>
				</div>
			</div>
			<div class="col py-3">
				<NuxtPage />
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({
	middleware: 'auth',
});

const adminStore = useAdminStore();

const loading = computed(() => adminStore.loading);
const error = computed(() => adminStore.error);

await Promise.all([
	callOnce('loadOverview', () => adminStore.loadOverview(), { mode: 'navigation' }),
	callOnce('loadAccounts', () => adminStore.loadAccounts(), { mode: 'navigation' }),
	callOnce('loadSubsystems', () => adminStore.loadSubsystems(), { mode: 'navigation' }),
	callOnce('loadMovingItems', () => adminStore.loadMovingItems(), { mode: 'navigation' }),
	callOnce('loadEmails', () => adminStore.loadEmails(), { mode: 'navigation' }),
	callOnce('loadConfig', () => adminStore.loadConfig(), { mode: 'navigation' }),
	callOnce('loadIgnoranceItems', () => adminStore.loadIgnoranceItems(), { mode: 'navigation' }),
]);

// await callOnce('loadOverview', () => adminStore.loadOverview(), { mode: 'navigation' });
// await callOnce('loadAccounts', () => adminStore.loadAccounts(), { mode: 'navigation' });
// await callOnce('loadSubsystems', () => adminStore.loadSubsystems(), { mode: 'navigation' });
// await callOnce('loadEmails', () => adminStore.loadEmails(), { mode: 'navigation' });
// await callOnce('loadConfig', () => adminStore.loadConfig(), { mode: 'navigation' });
</script>

<style scoped>
.nav-link.active {
	text-decoration: underline;
}
</style>
