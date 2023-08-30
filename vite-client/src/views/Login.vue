<template>
	<div class="container">
		<h1 class="text-center mb-3">Login - CineFinn</h1>
		<div v-if="error != null && !(this.form.usernameValid && this.form.passwordValid)" class="alert alert-danger alert-dismissible">
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
			<strong
				>Error: <span>{{ error.error }}</span></strong
			>
		</div>
		<div class="row">
			<div class="col-1"></div>
			<div class="col-5">
				<div class="d-flex justify-content-evenly">
					<button
						type="button"
						:disabled="loggingin"
						class="btn btn-lg"
						:class="{ 'btn-secondary': loggingin, 'btn-primary': !loggingin }"
						@click="loggingin = true"
					>
						Login
					</button>
					<button
						type="button"
						:disabled="!loggingin"
						class="btn btn-lg"
						:class="{ 'btn-secondary': !loggingin, 'btn-primary': loggingin }"
						@click="loggingin = false"
					>
						Register
					</button>
				</div>
				<div v-if="loggingin" class="card mt-2">
					<div class="card-header">Login - CineFinn</div>
					<div class="card-body">
						<h4 class="card-title">Login to the Cinema</h4>
						<hr />
						<div v-if="loading" class="d-flex justify-content-center">
							<div class="spinner-border" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
						</div>
						<form @submit.prevent="onLogin()" class="card-text" id="loginForm">
							<fieldset>
								<div class="form-group">
									<InputValidator
										v-model="form.username"
										v-model:valid="form.usernameValid"
										type="text"
										id="username"
										name="Username"
										autocomplete="username"
										placeholder="Enter Username"
										:rules="rules.usernameRules"
									/>
								</div>
								<div class="form-group">
									<InputValidator
										v-model="form.password"
										v-model:valid="form.passwordValid"
										type="password"
										id="password"
										name="Password"
										autocomplete="current-password"
										placeholder="Enter Password"
										:rules="rules.passwordRules"
									/>
								</div>
								<button type="submit" :disabled="!(this.form.usernameValid && this.form.passwordValid)" class="mt-4 btn btn-primary">Login</button>
							</fieldset>
						</form>
					</div>
				</div>
				<div v-if="!loggingin" class="card mt-2">
					<div class="card-header">Register - CineFinn</div>
					<div class="card-body">
						<h4 class="card-title">Register to the Cinema</h4>
						<hr />
						<div v-if="loading" class="d-flex justify-content-center">
							<div class="spinner-border" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
						</div>
						<form @submit.prevent="onRegister()" class="card-text" id="loginForm">
							<fieldset>
								<div class="form-group">
									<InputValidator
										v-model="form.token"
										v-model:valid="form.tokenValid"
										type="text"
										id="token"
										name="Token"
										autocomplete="registertoken"
										placeholder="Enter your Registration Token"
										:rules="rules.tokenRules"
									/>
								</div>
								<div class="form-group">
									<InputValidator
										v-model="form.username"
										v-model:valid="form.usernameValid"
										type="text"
										id="username"
										name="Username"
										autocomplete="username"
										placeholder="Enter Username"
										:rules="rules.usernameRules"
									/>
								</div>
								<div class="form-group">
									<InputValidator
										v-model="form.password"
										v-model:valid="form.passwordValid"
										type="password"
										id="password"
										name="Password"
										autocomplete="current-password"
										placeholder="Enter Password"
										:rules="rules.passwordRules"
									/>
								</div>
								<button
									type="submit"
									:disabled="!(this.form.usernameValid && this.form.passwordValid && this.form.tokenValid)"
									class="mt-4 btn btn-primary"
								>
									Register
								</button>
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
					Which is why there is only a registration with a proprietary token!
				</h2>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState, mapActions } from 'vuex';
import InputValidator from '@/components/InputValidator.vue';
export default {
	components: {
		InputValidator,
	},
	data() {
		return {
			loggingin: true,
			loading: false,
			form: {
				username: '',
				usernameValid: null,
				password: '',
				passwordValid: null,
				token: '',
				tokenValid: null,
			},
			rules: {
				tokenRules: [
					(value) => !!value || 'Cannot be empty.',
					(value) => value.length >= 10 || 'Must be at least 10 Characters',
					(value) => value.length <= 15 || 'Must be below 15 Characters',
				],
				usernameRules: [(value) => !!value || 'Cannot be empty.', (value) => value.length >= 3 || 'Must be at least 3 Characters and can only be 20'],
				passwordRules: [
					(value) => !!value || 'Cannot be empty.',
					(value) => value.length >= 3 || 'Must be at least 3 Characters and can only be 100',
				],
			},
		};
	},
	computed: {
		...mapState('auth', ['error']),
	},
	mounted() {
		this.authenticate(true);
	},
	methods: {
		...mapActions('auth', ['login', 'register', 'authenticate']),
		async onLogin() {
			if (this.form.usernameValid && this.form.passwordValid) {
				this.loading = true;
				await this.login({ username: this.form.username, password: this.form.password });
				this.form = {
					username: '',
					usernameValid: null,
					password: '',
					passwordValid: null,
				};
				this.loading = false;
			}
		},
		async onRegister() {
			if (this.form.usernameValid && this.form.passwordValid && this.form.tokenValid) {
				this.loading = true;
				await this.register({
					username: this.form.username,
					password: this.form.password,
					token: this.form.token,
				});
				this.form = {
					username: '',
					usernameValid: null,
					password: '',
					passwordValid: null,
					token: '',
					tokenValid: null,
				};
				this.loading = false;
			}
		},
	},
};
</script>
<style></style>
