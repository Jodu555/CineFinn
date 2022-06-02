<template>
	<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
		<div class="container-fluid">
			<router-link class="navbar-brand" to="/">xxx--xxx</router-link>
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
					<div class="btn-group" role="group" aria-label="Basic outlined example">
						<button class="btn btn-outline-primary">Profile</button>
						<button class="btn btn-outline-danger" type="submit">Logout</button>
					</div>
				</div>
			</div>
		</div>
	</nav>
</template>

<script></script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss"></style>
