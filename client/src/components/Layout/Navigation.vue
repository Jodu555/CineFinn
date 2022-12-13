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
					<input ref="autocomplete" type="text" class="form-control" placeholder="Search for a series..." style="width: 18rem" autocomplete="off" />
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
import Autocomplete from '@/plugins/autocomplete';
import { mapState, mapActions } from 'vuex';

export default {
	data() {
		return {
			ac: null,
			pressedKeys: [],
		};
	},
	computed: {
		...mapState(['series']),
		...mapState('auth', ['loggedIn']),
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
	},
	watch: {
		series() {
			if (!this.$refs.autocomplete) return;

			!this.ac &&
				(this.ac = new Autocomplete(this.$refs.autocomplete, {
					data: [],
					maximumItems: 5,
					threshold: 1,
					onSelectItem: ({ event, label, value }) => {
						this.$refs.autocomplete.value = '';
						if (event.ctrlKey || this.pressedKeys['j']) {
							console.log({ ctrl: event.ctrlKey, j: this.pressedKeys['j'] });
							this.pressedKeys['j'] && (this.pressedKeys['j'] = false);
							//Open in new tab
							let routeData = this.$router.resolve({
								path: '/watch',
								query: { id: value },
							});
							console.log(routeData);
							window.open(routeData.href, '_blank');
						} else {
							this.$router.push({ path: '/watch', query: { id: value } });
						}
					},
				}));
			this.ac.setData(
				this.series.map((x) => {
					return { label: x.title, value: x.ID };
				})
			);
		},
	},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
