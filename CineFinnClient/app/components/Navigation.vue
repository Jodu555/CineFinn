<template>
	<nav
		class="navbar sticky-top navbar-expand-lg"
		style="backdrop-filter: blur(12px); background-color: color-mix(in oklab, var(--bs-body-bg) 77%, transparent)">
		<div class="container-fluid">
			<router-link class="navbar-brand text-primary fw-bold" to="/">CineFinn</router-link>
			<button
				class="navbar-toggler"
				type="button"
				data-bs-toggle="collapse"
				data-bs-target="#navbarNav"
				aria-controls="navbarNav"
				aria-expanded="false"
				aria-label="Toggle navigation">
				<span class="navbar-toggler-icon"></span>
			</button>
			<div class="collapse navbar-collapse" id="navbarNav">
				<ul class="navbar-nav me-auto mb-2 mb-lg-0">
					<li class="nav-item">
						<router-link class="nav-link" exact-active-class="active" to="/">Home</router-link>
					</li>
					<!-- <li class="nav-item">
						<router-link class="nav-link" exact-active-class="active" to="/news">News</router-link>
					</li> -->
					<!-- <li class="nav-item">
						<router-link class="nav-link" active-class="active" to="/sync">Sync</router-link>
					</li> -->
					<!-- <li class="nav-item">
						<router-link class="nav-link" active-class="active" to="/todo">Todo</router-link>
					</li> -->
					<!-- <li class="nav-item dropdown">
						<a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">Todo</a>
						<ul class="dropdown-menu">
							<li><router-link class="dropdown-item" active-class="active" to="/todo">Todo</router-link></li>
							<li><router-link class="dropdown-item" active-class="active" to="/anidb">AniDB</router-link></li>
						</ul>
					</li> -->
					<!-- <li v-if="false" class="nav-item">
						<router-link class="nav-link" active-class="active" to="/vote">Voting</router-link>
					</li> -->
					<!-- <li class="nav-item">
						<router-link class="nav-link" active-class="active" to="/rmvc">RMVC</router-link>
					</li> -->
					<!-- <li v-if="userInfo.role >= 2" class="nav-item">
						<router-link class="nav-link" active-class="active" to="/admin">Admin</router-link>
					</li> -->
				</ul>
				<div v-if="authStore.loggedIn" class="d-flex">
					<!-- <AutoComplete :options="{ placeholder: 'Search for a series...', clearAfterSelect: true }"
						:data="autoCompleteSeries" :select-fn="autocompleteSearch" /> -->
					<div class="btn-group" style="margin-left: 2rem" role="group" aria-label="Basic outlined example">
						<button
							title="Settings"
							class="btn btn-outline-primary"
							data-bs-toggle="offcanvas"
							data-bs-target="#offcanvasSettings"
							aria-controls="offcanvasSettings">
							<font-awesome-icon icon="fa-solid fa-gears" />
						</button>
						<button class="btn btn-outline-danger" title="Logout" @click="authStore.logout()">
							<font-awesome-icon icon="fa-solid fa-right-from-bracket" />
						</button>
					</div>
				</div>
			</div>
		</div>
	</nav>
</template>

<script setup lang="ts">
const authStore = useAuthStore();

const { $bs } = useNuxtApp();

onMounted(() => {
	console.log($bs);

	// try {
	// 	const collapse = new $bs.Collapse('#navbarNav');
	// 	collapse.show();
	// } catch (e) {
	// 	console.log('Bootstrap error: ', e);
	// }
});
</script>

<style lang="scss" scoped>
[data-bs-theme='experimental'] {
	.navbar {
		border-bottom-width: 1px;
		border-bottom-style: solid;
		border-color: oklch(0.2 0 0);
	}
}
</style>
