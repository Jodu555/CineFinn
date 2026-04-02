<template>
	<div class="login-page min-vh-100 d-flex align-items-center justify-content-center py-4">
		<div class="container">
			<div class="row justify-content-center">
				<div class="col-md-8 col-lg-6">
					<div class="card shadow-lg border-0 rounded-4">
						<div class="card-header bg-transparent border-0 pt-4 pb-0">
							<div class="text-center">
								<font-awesome-icon icon="fa-solid fa-film" class="fa-3x text-primary mb-3" />
								<h1 class="fw-bold">CineFinn</h1>
								<p class="text-muted">Your personal streaming companion</p>
							</div>
						</div>
						<div class="card-body px-4 pb-4">
							<div
								v-if="authStore.error != '' && !(form.usernameValid && form.passwordValid)"
								class="alert alert-danger alert-dismissible fade show"
								role="alert"
							>
								<font-awesome-icon icon="fa-solid fa-circle-exclamation" class="me-2" />
								<strong>Error:</strong> {{ authStore.error }}
								<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
							</div>

							<div class="d-flex justify-content-center gap-2 mb-4">
								<button type="button" class="btn" :class="state === 'login' ? 'btn-primary' : 'btn-outline-primary'" @click="state = 'login'">
									<font-awesome-icon icon="fa-solid fa-right-to-bracket" class="me-2" />
									Login
								</button>
								<button type="button" class="btn" :class="state === 'register' ? 'btn-primary' : 'btn-outline-primary'" @click="state = 'register'">
									<font-awesome-icon icon="fa-solid fa-user-plus" class="me-2" />
									Register
								</button>
							</div>

							<div v-if="loading" class="d-flex justify-content-center my-4">
								<div class="spinner-border text-primary" role="status">
									<span class="visually-hidden">Loading...</span>
								</div>
							</div>

							<div v-if="state === 'login'">
								<form @submit.prevent="onLogin()" id="loginForm">
									<fieldset :disabled="loading">
										<div class="mb-3">
											<label for="username" class="form-label">
												<font-awesome-icon icon="fa-solid fa-user" class="me-2" />
												Username
											</label>
											<InputValidator
												v-model="form.username"
												v-model:valid="form.usernameValid"
												type="text"
												id="username"
												name="Username"
												autocomplete="username"
												placeholder="Enter your username"
												:rules="rules.usernameRules"
												:show-label="false"
											/>
										</div>
										<div class="mb-3">
											<label for="password" class="form-label">
												<font-awesome-icon icon="fa-solid fa-lock" class="me-2" />
												Password
											</label>
											<InputValidator
												v-model="form.password"
												v-model:valid="form.passwordValid"
												type="password"
												id="password"
												name="Password"
												autocomplete="current-password"
												placeholder="Enter your password"
												:rules="rules.passwordRules"
												:show-label="false"
											/>
										</div>
										<div class="d-flex justify-content-between align-items-center">
											<button type="submit" :disabled="!(form.usernameValid && form.passwordValid)" class="btn btn-primary px-4">
												<font-awesome-icon icon="fa-solid fa-right-to-bracket" class="me-2" />
												Login
											</button>
											<nuxtLink to="/forgotPassword" class="text-muted text-decoration-none small">
												<font-awesome-icon icon="fa-solid fa-key" class="me-1" />
												Forgot Password?
											</nuxtLink>
										</div>
									</fieldset>
								</form>
							</div>

							<div v-if="state === 'register'">
								<div v-if="registerEnabled?.enabled">
									<form @submit.prevent="onRegister()" id="registerForm">
										<fieldset :disabled="loading">
											<div class="mb-3">
												<label for="token" class="form-label">
													<font-awesome-icon icon="fa-solid fa-key" class="me-2" />
													Registration Token
												</label>
												<InputValidator
													v-model="form.token"
													v-model:valid="form.tokenValid"
													type="text"
													id="token"
													name="Token"
													autocomplete="registertoken"
													placeholder="Enter your registration token"
													:rules="rules.registerTokenRules"
													:show-label="false"
												/>
											</div>
											<div class="mb-3">
												<label for="regUsername" class="form-label">
													<font-awesome-icon icon="fa-solid fa-user" class="me-2" />
													Username
												</label>
												<InputValidator
													v-model="form.username"
													v-model:valid="form.usernameValid"
													type="text"
													id="regUsername"
													name="Username"
													autocomplete="username"
													placeholder="Choose a username"
													:rules="rules.usernameRules"
													:show-label="false"
												/>
											</div>
											<div class="mb-3">
												<label for="regPassword" class="form-label">
													<font-awesome-icon icon="fa-solid fa-lock" class="me-2" />
													Password
												</label>
												<InputValidator
													v-model="form.password"
													v-model:valid="form.passwordValid"
													type="password"
													id="regPassword"
													name="Password"
													autocomplete="new-password"
													placeholder="Choose a password"
													:rules="rules.passwordRules"
													:show-label="false"
												/>
											</div>
											<button type="submit" :disabled="!(form.usernameValid && form.passwordValid && form.tokenValid)" class="btn btn-primary w-100">
												<font-awesome-icon icon="fa-solid fa-user-plus" class="me-2" />
												Create Account
											</button>
										</fieldset>
									</form>
								</div>
								<div v-else class="text-center py-4">
									<font-awesome-icon icon="fa-solid fa-user-slash" class="fa-3x text-danger mb-3" />
									<h4 class="text-danger">Registration Closed</h4>
									<p class="text-muted">Registration is currently disabled. Please contact an administrator to request access.</p>
								</div>
							</div>
						</div>
					</div>

					<div class="text-center mt-4">
						<p class="text-muted small mb-2">
							<font-awesome-icon icon="fa-solid fa-lock" class="me-1" />
							This area is restricted to authorized users only
						</p>
						<p class="text-warning small">
							<font-awesome-icon icon="fa-solid fa-triangle-exclamation" class="me-1" />
							New users require a valid registration token
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
useSeoMeta({
	title: 'Cinema | Login',
});

const authStore = useAuthStore();

const state = ref<'login' | 'register'>('login');
const loading = ref(false);

const { data: registerEnabled, refresh } = await useFetch<{
	enabled: boolean;
}>(`${useAPIURL()}/auth/registerEnabled`);

const rules = {
	registerTokenRules: [
		(value: string) => !!value || 'Cannot be empty.',
		(value: string) => value.length >= 10 || 'Must be at least 10 Characters',
		(value: string) => value.length <= 15 || 'Must be below 15 Characters',
	],
	usernameRules: [
		(value: string) => !!value || 'Cannot be empty.',
		(value: string) => !!value.match(/^[a-zA-Z0-9]+$/) || 'Must be alphanumeric',
		(value: string) => value.length >= 4 || 'Must be at least 4 Characters and can only be 20',
		(value: string) => value.length <= 20 || 'Must be below 15 Characters',
	],
	passwordRules: [
		(value: string) => !!value || 'Cannot be empty.',
		(value: string) => value.length >= 4 || 'Must be at least 4 Characters and can only be 100',
		(value: string) => value.length <= 100 || 'Must be below 100 Characters',
	],
};

let timer: NodeJS.Timeout;

watch(state, (newValue) => {
	if (newValue === 'register') {
		refresh();
	}
});

onMounted(async () => {
	timer = setInterval(async () => {
		if (state.value === 'register') {
			refresh();
		}
	}, 30 * 1000);
});

onUnmounted(() => {
	clearInterval(timer);
});

const form = ref({
	username: '',
	usernameValid: false,
	password: '',
	passwordValid: false,
	token: '',
	tokenValid: false,
});

async function onLogin() {
	if (form.value.usernameValid && form.value.passwordValid) {
		loading.value = true;
		const { error } = await tryCatch(() => authStore.login({ username: form.value.username, password: form.value.password }));

		if (error) {
			loading.value = false;
			return;
		}

		form.value = {
			username: '',
			usernameValid: false,
			password: '',
			passwordValid: false,
			token: '',
			tokenValid: false,
		};
		loading.value = false;
		useRouter().push('/');
	}
}

async function onRegister() {
	if (form.value.usernameValid && form.value.passwordValid && form.value.tokenValid) {
		loading.value = true;
		await authStore.register({
			username: form.value.username,
			password: form.value.password,
			token: form.value.token,
		});
		form.value = {
			username: '',
			usernameValid: false,
			password: '',
			passwordValid: false,
			token: '',
			tokenValid: false,
		};
		loading.value = false;
		useRouter().push('/');
	}
}
</script>

<style lang="scss" scoped>
.login-page {
	background-color: var(--bs-body-bg);
}

.card {
	background-color: var(--bs-body-bg);
}

.btn-primary {
	&:hover,
	&:focus {
		background-color: color-mix(in oklab, var(--bs-primary) 85%, black);
		border-color: color-mix(in oklab, var(--bs-primary) 85%, black);
	}
}

[data-bs-theme='experimental'] {
	.login-page {
		background-color: oklch(0.15 0 0);
	}
}
</style>
