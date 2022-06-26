<template lang="">
	<div class="container">
		<h1 class="text-center mb-3">Login - CineFinn</h1>
		<div v-if="error != null" class="alert alert-danger alert-dismissible">
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
			<strong
				>Error: <span>{{ error }}</span></strong
			>
		</div>
		<div class="row">
			<div class="col-1"></div>
			<div class="col-5">
				<div class="card">
					<div class="card-header">Login - CineFinn</div>
					<div class="card-body">
						<h4 class="card-title">Login to the Cinema</h4>
						<hr />
						<form @submit.prevent="onLogin()" class="card-text" id="loginForm">
							<fieldset>
								<div class="form-group">
									<label for="username" class="form-label mt-4">Username</label>
									<input
										type="text"
										autocomplete="username"
										v-model="form.username"
										class="form-control"
										placeholder="Enter Username"
									/>
								</div>
								<div class="form-group">
									<label for="password" class="form-label mt-4">Password</label>
									<input
										type="password"
										autocomplete="current-password"
										v-model="form.password"
										class="form-control"
										placeholder="Password"
									/>
								</div>
								<button type="submit" class="mt-4 btn btn-primary">Login</button>
							</fieldset>
						</form>
					</div>
				</div>
			</div>
			<div class="col-1"></div>
			<div class="col-4">
				<h2 class="text-muted text-center">
					If you got here by accident I would recommend you to go home! <br />
					This page is for known users only!
					<br />
					Which is why there is only a login and no registration!
				</h2>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState, mapActions } from 'vuex';
export default {
	data() {
		return {
			form: {
				username: '',
				password: '',
			},
		};
	},
	computed: {
		...mapState('auth', ['error']),
	},
	methods: {
		...mapActions('auth', ['login']),
		onLogin() {
			this.login(this.form);
			this.form = {
				username: '',
				password: '',
			};
		},
	},
};
</script>
<style lang=""></style>
