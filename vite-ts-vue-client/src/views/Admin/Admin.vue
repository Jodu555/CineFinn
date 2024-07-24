<template>
	<div v-auto-animate class="container-fluid">
		<div class="row flex-nowrap">
			<div class="col-auto col-md-3 col-xl-2 px-sm-2 px-0 bg-dark">
				<div class="d-flex flex-column align-items-center align-items-sm-start px-3 pt-2 text-white">
					<a href="/" class="d-flex align-items-center pb-3 mb-md-0 me-md-auto text-white text-decoration-none">
						<router-link class="nav-link px-0 align-middle" to="/admin/"><span class="fs-5 d-none d-sm-inline">Admin Area</span></router-link>
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
					</ul>
				</div>
			</div>
			<div class="col py-3" v-auto-animate>
				<router-view> </router-view>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup></script>

<style scoped>
.nav-link.active {
	text-decoration: underline;
}
</style>
