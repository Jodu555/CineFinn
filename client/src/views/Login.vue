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
										type="text"
										id="username"
										name="Username"
										autocomplete="username"
										placeholder="Enter Username"
										:rules="usernameRules"
									/>
								</div>
								<div class="form-group">
									<label for="password" class="form-label mt-4">Password</label>
									<input
										id="password"
										type="password"
										autocomplete="current-password"
										v-model="form.password"
										class="form-control"
										placeholder="Password"
									/>
									<div id="password" class="invalid-feedback"></div>
								</div>
								<button type="submit" class="mt-4 btn btn-primary">Login</button>
								<pre>{{ form }}</pre>
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
				password: '',
			},
			rules: {
				usernameRules: [
					(value) => !!value || 'Cannot be empty.',
					(value) => value.length >= 3 || 'Must be at least 3 Characters and can only be 20',
				],
			},
		};
	},
	computed: {
		...mapState('auth', ['error']),
	},
	watch: {
		form: {
			handler(newValue, oldValue) {
				console.log(newValue);
				this.validateForm();
			},
			deep: true,
		},
	},
	methods: {
		...mapActions('auth', ['login']),
		validateForm() {
			// return (
			// 	this.deepValidate('username', [
			// 		(value) => !!value || 'Cannot be empty.',
			// 		(value) => value.length >= 3 || 'Must be at least 3 Characters and can only be 20',
			// 	]) &&
			// 	this.deepValidate('password', [
			// 		(value) => !!value || 'Cannot be empty.',
			// 		(value) => value.length >= 3 || 'Must be at least 3 Characters and can only be 100',
			// 	])
			// );
		},
		deepValidate(id, rules) {
			const input = document.querySelector(`.form-control#${id}`);
			const valid = document.querySelector(`.invalid-feedback#${id}`);
			const falsey = [];
			for (const rule of rules) {
				if (rule(input.value) != true) {
					falsey.push(rule(input.value));
				}
			}
			if (falsey.length > 0) {
				valid.innerHTML = falsey[0];
				input.classList.remove('is-valid');
				input.classList.add('is-invalid');
			} else {
				input.classList.remove('is-invalid');
				input.classList.add('is-valid');
			}
			return falsey.length == 0;
		},
		onLogin() {
			if (this.validateForm()) {
				this.login(this.form);
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
