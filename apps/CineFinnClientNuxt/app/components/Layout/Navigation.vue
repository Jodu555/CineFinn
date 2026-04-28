<template>
	<div v-if="globalStore.motd.show" class="alert" :class="`alert-${globalStore.motd.type}`" role="alert">
		<strong>Motd:</strong> {{ globalStore.motd.message }}
	</div>

	<nav
		class="navbar sticky-top navbar-expand-lg"
		style="backdrop-filter: blur(12px); background-color: color-mix(in oklab, var(--bs-body-bg) 77%, transparent)"
	>
		<div class="container-fluid">
			<router-link class="navbar-brand text-primary fw-bold" to="/">CineFinn</router-link>
			<button
				class="navbar-toggler"
				type="button"
				data-bs-toggle="collapse"
				data-bs-target="#navbarNav"
				aria-controls="navbarNav"
				aria-expanded="false"
				aria-label="Toggle navigation"
			>
				<span class="navbar-toggler-icon"></span>
			</button>
			<div class="collapse navbar-collapse" id="navbarNav">
				<ul class="navbar-nav me-auto mb-2 mb-lg-0">
					<li class="nav-item">
						<NuxtLink class="nav-link" exact-active-class="active" to="/">Home</NuxtLink>
					</li>
					<li v-if="authStore.loggedIn" class="nav-item">
						<NuxtLink class="nav-link" exact-active-class="active" to="/list">List</NuxtLink>
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
					<li v-if="authStore.loggedIn" class="nav-item">
						<NuxtLink class="nav-link" active-class="active" to="/playlists">Playlists</NuxtLink>
					</li>
					<li v-if="false && authStore.loggedIn" class="nav-item">
						<NuxtLink class="nav-link" active-class="active" to="/watchhistory">History</NuxtLink>
					</li>
					<li v-if="authStore.loggedIn" class="nav-item">
						<NuxtLink class="nav-link" active-class="active" to="/todo">Todo</NuxtLink>
					</li>
					<li class="nav-item" v-if="authStore.user?.role >= Role.Mod">
						<NuxtLink class="nav-link" active-class="active" to="/todo/anidb">AniDB</NuxtLink>
					</li>
					<li class="nav-item">
						<NuxtLink class="nav-link" active-class="active" to="/rmvc">RMVC</NuxtLink>
					</li>
					<li v-if="authStore.loggedIn && authStore.user?.role >= Role.Mod" class="nav-item">
						<NuxtLink class="nav-link" active-class="active" to="/admin">Admin</NuxtLink>
					</li>
				</ul>
				<div v-if="authStore.loggedIn" class="d-flex flex-wrap align-items-center gap-2 justify-content-end">
					<AutoComplete
						:options="{ placeholder: 'Search for a series...', clearAfterSelect: true, asLink: true }"
						:data="autoCompleteSeries"
						:prefetch-fn="autocompletePrefetch"
						:link-builder-fn="autocompleteLinkBuilder"
					/>
					<div class="btn-group" role="group" aria-label="Basic outlined example">
						<button
							title="Settings"
							class="btn btn-outline-primary"
							data-bs-toggle="offcanvas"
							data-bs-target="#offcanvasSettings"
							aria-controls="offcanvasSettings"
						>
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
import { Role } from '@cinefinn/types';
import AutoComplete from './AutoComplete.vue';
import { vModelText } from 'vue';

const authStore = useAuthStore();

const indexStore = useIndexStore();

const globalStore = useGlobalStore();

const autoCompleteSeries = computed(() => {
	const arr = [] as { ID: string; value: string }[];
	indexStore.series.forEach((i) => {
		arr.push({
			ID: i.UUID,
			value: i.title,
		});
	});
	return arr;
});

function autocompleteLinkBuilder(ID: string, value: string) {
	console.log('Autocomplete Link Builder', ID, value);
	return `/watch/${ID}`;
}

async function autocompletePrefetch(ID: string, value: string) {
	console.log('Autocomplete Prefetch', ID, value);
	await indexStore.prefetchSeries(ID);
}
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
