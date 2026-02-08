<template>
	<div class="container">
		<h1 class="text-center mb-3">Login - CineFinn</h1>
		<div v-if="authStore.error != '' && !(form.usernameValid && form.passwordValid)"
			class="alert alert-danger alert-dismissible">
			<button type="button" class="btn-close" data-bs-dismiss="alert"></button>
			<strong>Error: <span>{{ authStore.error }}</span></strong>
		</div>
		<div class="row">
			<div class="col-1"></div>
			<div class="col-5">
				<div class="d-flex justify-content-evenly">
					<button type="button" class="btn btn-lg"
						:class="{ 'btn-secondary': state === 'register', 'btn-primary': state === 'login' }"
						@click="state = 'login'">
						Login
					</button>
					<button type="button" class="btn btn-lg"
						:class="{ 'btn-secondary': state === 'login', 'btn-primary': state === 'register' }"
						@click="state = 'register'">
						Register
					</button>
				</div>
				<div v-if="state === 'login'" class="card mt-2">
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
									<InputValidator v-model="form.username" v-model:valid="form.usernameValid"
										type="text" id="username" name="Username" autocomplete="username"
										placeholder="Enter Username" :rules="rules.usernameRules" />
								</div>
								<div class="form-group">
									<InputValidator v-model="form.password" v-model:valid="form.passwordValid"
										type="password" id="password" name="Password" autocomplete="current-password"
										placeholder="Enter Password" :rules="rules.passwordRules" />
								</div>
								<div class="d-flex justify-content-between">
									<button type="submit" :disabled="!(form.usernameValid && form.passwordValid)"
										class="mt-4 btn btn-primary">
										Login
									</button>
									<nuxt-link to="/forgotPassword" class="mt-4">Fogot
										Password?</nuxt-link>
								</div>
							</fieldset>
						</form>
					</div>
				</div>
				<div v-if="state === 'register'" class="card mt-2">
					<div class="card-header">Register - CineFinn</div>
					<div v-if="registerEnabled?.enabled" class="card-body">
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
									<InputValidator v-model="form.token" v-model:valid="form.tokenValid" type="text"
										id="token" name="Token" autocomplete="registertoken"
										placeholder="Enter your Registration Token" :rules="rules.tokenRules" />
								</div>
								<div class="form-group">
									<InputValidator v-model="form.username" v-model:valid="form.usernameValid"
										type="text" id="username" name="Username" autocomplete="username"
										placeholder="Enter Username" :rules="rules.usernameRules" />
								</div>
								<div class="form-group">
									<InputValidator v-model="form.password" v-model:valid="form.passwordValid"
										type="password" id="password" name="Password" autocomplete="current-password"
										placeholder="Enter Password" :rules="rules.passwordRules" />
								</div>
								<button type="submit"
									:disabled="!(form.usernameValid && form.passwordValid && form.tokenValid)"
									class="mt-4 btn btn-primary">
									Register
								</button>
							</fieldset>
						</form>
					</div>
					<div v-else class="card-body">
						<h4 class="card-title">Registration Disabled</h4>
						<hr />
						<div v-if="loading" class="d-flex justify-content-center">
							<div class="spinner-border" role="status">
								<span class="visually-hidden">Loading...</span>
							</div>
						</div>
						<p class="text-danger h5">
							Registration is currently disabled, please contact the administrator to get access.
						</p>
					</div>
				</div>
			</div>
			<div class="col-1"></div>
			<div class="col-4">
				<h2 class="text-secondary text-center">
					If you got here by accident I would recommend you to go home! <br />
					This page is for known users only!
					<br />
					Which is why there is only a registration with a proprietary token!
				</h2>
			</div>
		</div>
	</div>
</template>
<script setup lang="ts">
import useAPIURL from '~/hooks/useAPIURL';

const authStore = useAuthStore();

const state = ref<'login' | 'register'>('login');
const loading = ref(false);

const { data: registerEnabled, refresh } = await useFetch<{
	enabled: boolean;
}>(`${useAPIURL()}/auth/registerEnabled`);

const rules = {
	tokenRules: [
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
		// await authStore.login({ username: form.value.username, password: form.value.password });
		const { error } = await tryCatch(() => authStore.login({ username: form.value.username, password: form.value.password }))

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
<style></style>
