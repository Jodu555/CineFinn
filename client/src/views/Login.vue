<template lang="">
	<div class="container">
		<h1 class="text-center mb-3">Login - CineFinn</h1>
		<div v-if="error != null" class="alert alert-danger alert-dismissible">
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
			<strong
				>Error: <span>{{ error.error }}</span></strong
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
									:disabled="!(this.form.usernameValid && this.form.passwordValid)"
									class="mt-4 btn btn-primary"
								>
									Login
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
					Which is why there is only a login and no registration!
				</h2>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState, mapActions } from 'vuex';
import InputValidator from '@/components/InputValidator';
export default {
	components: {
		InputValidator,
	},
	data() {
		return {
			form: {
				username: '',
				usernameValid: null,
				password: '',
				passwordValid: null,
			},
			rules: {
				usernameRules: [
					(value) => !!value || 'Cannot be empty.',
					(value) => value.length >= 3 || 'Must be at least 3 Characters and can only be 20',
				],
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
	methods: {
		...mapActions('auth', ['login']),
		async onLogin() {
			if (this.form.usernameValid && this.form.passwordValid) {
				await this.login(this.form);
				this.form = {
					username: '',
					password: '',
				};
			}
		},
	},
};
</script>
<style lang=""></style>
