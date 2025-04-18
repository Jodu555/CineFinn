<template>
	<div v-auto-animate class="container-fluid">
		<div class="row flex-nowrap">
			<div class="col-auto col-md-3 col-xl-2 px-sm-2 px-0 bg-dark">
				<div class="d-flex flex-column align-items-center align-items-sm-start px-3 pt-2 text-white">
					<a href="/" class="d-flex align-items-center pb-3 mb-md-0 me-md-auto text-white text-decoration-none">
						<router-link class="nav-link px-0 align-middle" to="/admin/"
							><span class="fs-5 d-none d-sm-inline">Admin Area</span></router-link
						>
					</a>
					<ul class="nav flex-column mb-sm-auto mb-0 align-items-center align-items-sm-start" id="menu">
						<li class="nav-item">
							<router-link class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/"
								><span class="ms-1 d-none d-sm-inline">Overview</span></router-link
							>
						</li>
						<li>
							<router-link class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/accounts"
								><span class="ms-1 d-none d-sm-inline">Accounts</span></router-link
							>
						</li>
						<li>
							<router-link class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/jobs"
								><span class="ms-1 d-none d-sm-inline">Jobs</span></router-link
							>
						</li>
						<li>
							<router-link class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/subsystems"
								><span class="ms-1 d-none d-sm-inline">SubSystems</span></router-link
							>
						</li>
						<li>
							<router-link class="nav-link px-0 align-middle" exact-active-class="active" to="/admin/ignoreList"
								><span class="ms-1 d-none d-sm-inline">Ignore List</span></router-link
							>
						</li>
					</ul>
				</div>
			</div>
			<div class="col py-3" v-auto-animate>
				<router-view> </router-view>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useAdminStore } from '@/stores/admin.store';
import { useSocket } from '@/utils/socket';
import { onMounted, onUnmounted } from 'vue';

const adminStore = useAdminStore();

onMounted(async () => {
	adminStore.loading = true;
	await Promise.all([adminStore.loadOverview(), adminStore.loadAccounts(), adminStore.loadSubSystems()]);
	adminStore.loading = false;
	// await adminStore.loadOverview();
	// await adminStore.loadAccounts();
	useSocket().on('admin-update', ({ context, data }) => {
		if (context == 'overview') {
			adminStore.overview = data;
		}
		if (context == 'accounts') {
			adminStore.accounts = data;
		}
		if (context == 'subsystem') {
			data.movingItems = data.movingItems.map((x: any) => {
				if (!x?.meta)
					x.meta = {
						isMoving: false,
						progress: 0,
						result: '',
						isAdditional: false,
					};
				return x;
			});
			adminStore.subsystems = data;
		}
	});

	useSocket().on('admin-movingItem-update', ({ ID, progress, message }) => {
		console.log('Update', ID, progress);
		const movingItem = adminStore.subsystems.movingItems.find((x) => x.ID == ID);
		if (movingItem) {
			if (!movingItem.meta) {
				movingItem.meta = {
					progress: progress,
					isMoving: true,
					result: message || '',
					isAdditional: false,
				};
			} else {
				console.log('Update!!!!');
				movingItem.meta.isMoving = true;
				movingItem.meta.progress = progress;
				movingItem.meta.result = message || '';
			}
		}
	});
});

onUnmounted(() => {
	useSocket().off('admin-update');
	useSocket().off('admin-movingItem-update');
});
</script>

<style scoped>
.nav-link.active {
	text-decoration: underline;
}
</style>
