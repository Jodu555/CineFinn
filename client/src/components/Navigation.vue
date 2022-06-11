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
				</ul>
				<div class="d-flex">
					<input
						type="text"
						class="form-control"
						id="input"
						placeholder="Start typing..."
						autocomplete="off"
					/>
					<div class="btn-group" role="group" aria-label="Basic outlined example">
						<button class="btn btn-outline-primary">Profile</button>
						<button class="btn btn-outline-danger" type="submit">Logout</button>
					</div>
				</div>
			</div>
		</div>
	</nav>
</template>

<script>
import Autocomplete from '@/plugins/autocomplete';
export default {
	mounted() {
		const field = document.getElementById('input');
		const ac = new Autocomplete(field, {
			data: [{ label: "I'm a label", value: 42 }],
			maximumItems: 5,
			threshold: 1,
			onSelectItem: ({ label, value }) => {
				console.log('user selected:', label, value);
			},
		});
		ac.setData([
			{
				label: 'Test',
				value: 'test',
			},
			{
				label: 'hello',
				value: 'hello',
			},
			{
				label: 'other',
				value: 'other',
			},
		]);
	},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
