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
				aria-label="Toggle navigation"
			>
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
				</ul>
				<div v-if="loggedIn" class="d-flex">
					<AutoComplete
						:options="{ placeholder: 'Search for a series...', clearAfterSelect: true }"
						:data="autoCompleteSeries"
						:select-fn="autocompleteSearch"
					/>
					<div class="btn-group" style="margin-left: 2rem" role="group" aria-label="Basic outlined example">
						<button
							title="Settings"
							class="btn btn-outline-primary"
							data-bs-toggle="offcanvas"
							data-bs-target="#offcanvasSettings"
							aria-controls="offcanvasSettings"
						>
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

<script>
import { mapState, mapActions } from 'vuex';
import AutoComplete from './AutoComplete.vue';

export default {
	components: { AutoComplete },
	data() {
		return {
			ac: null,
			pressedKeys: [],
		};
	},
	computed: {
		...mapState(['series']),
		...mapState('auth', ['loggedIn']),
		autoCompleteSeries() {
			return this.series.map((x) => ({ value: x.title, ID: x.ID }));
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
		...mapActions('auth', ['logout']),
		handleKeyUp(e) {
			if (this.pressedKeys[e.key] != true) this.pressedKeys[e.key] = false;
		},
		handleKeyDown(e) {
			if (this.pressedKeys[e.key] != false) this.pressedKeys[e.key] = true;
		},
		autocompleteSearch(ID, value) {
			this.$router.push({ path: '/watch', query: { id: ID } });
		},
	},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
