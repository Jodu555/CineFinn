<template>
	<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
		<div class="container-fluid">
			<router-link class="navbar-brand" to="/">CineFinn</router-link>
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
					<li class="nav-item">
						<router-link class="nav-link" exact-active-class="active" to="/news">News</router-link>
					</li>
					<li class="nav-item">
						<router-link class="nav-link" active-class="active" to="/sync">Sync</router-link>
					</li>
					<li class="nav-item">
						<router-link class="nav-link" active-class="active" to="/todo">Todo</router-link>
					</li>
					<li class="nav-item">
						<router-link class="nav-link" active-class="active" to="/rmvc">RMVC</router-link>
					</li>
				</ul>
				<div v-if="loggedIn" class="d-flex">
					<AutoComplete
						:options="{ placeholder: 'Search for a series...', clearAfterSelect: true }"
						:data="autoCompleteSeries"
						:select-fn="autocompleteSearch" />
					<div class="btn-group" style="margin-left: 2rem" role="group" aria-label="Basic outlined example">
						<button
							title="Settings"
							class="btn btn-outline-primary"
							data-bs-toggle="offcanvas"
							data-bs-target="#offcanvasSettings"
							aria-controls="offcanvasSettings">
							<font-awesome-icon icon="fa-solid fa-gears" />
						</button>
						<button class="btn btn-outline-danger" title="Logout" @click="logout()">
							<font-awesome-icon icon="fa-solid fa-right-from-bracket" />
						</button>
					</div>
				</div>
			</div>
		</div>
	</nav>
</template>

<script lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';
import { mapWritableState, mapActions } from 'pinia';
import AutoComplete from './AutoComplete.vue';

export default {
	components: { AutoComplete },
	data() {
		return {
			ac: null,
			pressedKeys: {} as Record<string, boolean>,
		};
	},
	computed: {
		...mapWritableState(useIndexStore, ['series']),
		...mapWritableState(useAuthStore, ['loggedIn', 'settings']),
		autoCompleteSeries() {
			return this.series.map((x) => ({ value: x.title, ID: x.ID })).filter((x) => x.value);
		},
	},
	created() {
		window.addEventListener('keyup', this.handleKeyUp);
		window.addEventListener('keydown', this.handleKeyDown);
	},
	beforeUnmount() {
		window.removeEventListener('keyup', this.handleKeyUp);
		window.removeEventListener('keydown', this.handleKeyDown);
	},
	methods: {
		...mapActions(useAuthStore, ['logout']),
		handleKeyUp(e: KeyboardEvent) {
			console.log('UP', e.key);
			this.pressedKeys[e.key] = false;
		},
		handleKeyDown(e: KeyboardEvent) {
			console.log('DOWN', e.key);
			this.pressedKeys[e.key] = true;

			if (this.pressedKeys?.['Shift'] == true && this.pressedKeys?.['D'] == true) {
				console.log('Developer Mode Activated');
				this.settings.developerMode.value = true;
			}
			if (this.pressedKeys?.['Shift'] == true && this.pressedKeys?.['Z'] == true) {
				console.log('Normie Mode Activated');
				this.settings.developerMode.value = false;
			}
		},
		autocompleteSearch(ID: string) {
			if (this.pressedKeys?.j) {
				const routeData = this.$router.resolve({ path: '/watch', query: { id: ID } });
				window.open(routeData.href, '_blank');
				this.pressedKeys.j = false;
			} else {
				this.$router.push({ path: '/watch', query: { id: ID } });
			}
		},
	},
};
</script>
