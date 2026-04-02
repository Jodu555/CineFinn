<template>
	<div class="forgot-password-page min-vh-100 d-flex align-items-center justify-content-center py-4">
		<div class="container">
			<div class="row justify-content-center">
				<div class="col-md-8 col-lg-6">
					<div class="card shadow-lg border-0 rounded-4">
						<div class="card-header bg-transparent border-0 pt-4 pb-0">
							<div class="text-center">
								<font-awesome-icon icon="fa-solid fa-film" class="fa-3x text-primary mb-3" />
								<h1 class="fw-bold">CineFinn</h1>
								<p class="text-muted">Password Recovery</p>
							</div>
						</div>
						<div class="card-body px-4 pb-4">
							<div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
								<font-awesome-icon icon="fa-solid fa-circle-exclamation" class="me-2" />
								<strong>Error:</strong> {{ error }}
								<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
							</div>

							<div v-if="loading" class="d-flex justify-content-center my-4">
								<div class="spinner-border text-primary" role="status">
									<span class="visually-hidden">Loading...</span>
								</div>
							</div>

							<div v-if="stage === 1">
								<div class="text-center mb-4">
									<font-awesome-icon icon="fa-solid fa-envelope" class="fa-2x text-muted mb-3" />
									<p class="text-muted">Enter your email address and we'll send you a reset token.</p>
								</div>
								<form @submit.prevent="onSubmitStage1()">
									<fieldset :disabled="loading">
										<div class="mb-3">
											<label for="email" class="form-label">
												<font-awesome-icon icon="fa-solid fa-envelope" class="me-2" />
												Email Address
											</label>
											<input type="email" class="form-control" id="email" v-model="form.email" placeholder="Enter your email address" />
										</div>
										<div class="d-flex justify-content-between align-items-center">
											<nuxtLink to="/login" class="text-muted text-decoration-none small">
												<font-awesome-icon icon="fa-solid fa-arrow-left" class="me-1" />
												Back to Login
											</nuxtLink>
											<button type="submit" class="btn btn-primary px-4">
												<font-awesome-icon icon="fa-solid fa-paper-plane" class="me-2" />
												Send Reset Token
											</button>
										</div>
									</fieldset>
								</form>
							</div>

							<div v-if="stage === 2">
								<div class="text-center mb-4">
									<font-awesome-icon icon="fa-solid fa-key" class="fa-2x text-primary mb-3" />
									<p class="text-muted">
										We've sent a reset token to <strong>{{ form.email }}</strong>
									</p>
								</div>
								<form @submit.prevent="onSubmitStage2()">
									<fieldset :disabled="loading">
										<div class="mb-3">
											<label for="resetToken" class="form-label">
												<font-awesome-icon icon="fa-solid fa-key" class="me-2" />
												Reset Token
											</label>
											<input
												type="text"
												class="form-control"
												id="resetToken"
												v-model="form.resetToken"
												placeholder="Enter the reset token from your email"
											/>
										</div>
										<div class="d-flex justify-content-between align-items-center">
											<button
												type="button"
												class="btn btn-outline-secondary"
												@click="
													stage = 1;
													error = '';
												"
											>
												<font-awesome-icon icon="fa-solid fa-arrow-left" class="me-2" />
												Back
											</button>
											<button type="submit" class="btn btn-primary px-4">
												<font-awesome-icon icon="fa-solid fa-check" class="me-2" />
												Verify Token
											</button>
										</div>
									</fieldset>
								</form>
							</div>

							<div v-if="stage === 3">
								<div class="text-center mb-4">
									<font-awesome-icon icon="fa-solid fa-lock" class="fa-2x text-success mb-3" />
									<p class="text-muted">Token verified! Now set your new password.</p>
								</div>
								<form @submit.prevent="onSubmitStage3()">
									<fieldset :disabled="loading">
										<div class="mb-3">
											<label for="newPassword" class="form-label">
												<font-awesome-icon icon="fa-solid fa-lock" class="me-2" />
												New Password
											</label>
											<InputValidator
												v-model="form.newPassword"
												v-model:valid="validNewPassword"
												type="password"
												id="newPassword"
												name="Password"
												autocomplete="current-password"
												placeholder="Enter your new password"
												:rules="passwordRules"
												:show-label="false"
											/>
										</div>
										<button type="submit" class="btn btn-primary w-100">
											<font-awesome-icon icon="fa-solid fa-floppy-disk" class="me-2" />
											Save New Password
										</button>
									</fieldset>
								</form>
							</div>

							<div v-if="stage === 4" class="text-center py-4">
								<font-awesome-icon icon="fa-solid fa-check-circle" class="fa-3x text-success mb-3" />
								<h4 class="text-success">Password Reset Complete!</h4>
								<p class="text-muted mb-4">Your password has been successfully reset.</p>
								<nuxtLink to="/login" class="btn btn-primary px-4">
									<font-awesome-icon icon="fa-solid fa-right-to-bracket" class="me-2" />
									Go to Login
								</nuxtLink>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
useSeoMeta({
	title: 'Cinema | Forgot Password',
});

const stage = ref(1);
const loading = ref(false);
const error = ref('');

const form = ref({
	email: '',
	resetToken: '',
	newPassword: '',
});

const validNewPassword = ref(false);

const passwordRules = [
	(value: string) => !!value || 'Cannot be empty.',
	(value: string) => value.length >= 4 || 'Must be at least 4 Characters and can only be 100',
	(value: string) => value.length <= 100 || 'Must be below 100 Characters',
];

const { $swal } = useNuxtApp();

async function onSubmitStage1() {
	if (!form.value.email) {
		error.value = 'Please enter your email address';
		return;
	}
	loading.value = true;
	error.value = '';

	const { data, error: fetchError } = await tryCatch<Promise<void>, Error>(() =>
		$fetch<void>(useAPIURL() + '/auth/forgotPassword', {
			method: 'POST',
			body: JSON.stringify({ email: form.value.email }),
			headers: {
				'auth-token': useAuthStore().authToken,
			},
		}),
	);

	loading.value = false;

	if (fetchError) {
		console.log(fetchError);
		error.value = 'An error occurred while sending the reset token';
		$swal.fire({
			title: 'Error',
			text: 'An error occurred while resetting your password',
			icon: 'error',
			confirmButtonText: 'Ok',
		});
		return;
	}

	stage.value = 2;
}

async function onSubmitStage2() {
	if (!form.value.resetToken) {
		error.value = 'Please enter the reset token';
		return;
	}
	loading.value = true;
	error.value = '';

	const { data, error: fetchError } = await tryCatch<Promise<void>, Error>(() =>
		$fetch<void>(useAPIURL() + '/auth/forgotPassword', {
			method: 'PUT',
			body: JSON.stringify({ email: form.value.email, token: form.value.resetToken }),
			headers: {
				'auth-token': useAuthStore().authToken,
			},
		}),
	);

	loading.value = false;

	if (fetchError) {
		console.log(fetchError);
		error.value = 'Invalid reset token';
		$swal.fire({
			title: 'Error',
			text: 'An error occurred while verifying your reset token! Please make sure you entered the correct token.',
			icon: 'error',
			confirmButtonText: 'Ok',
		});
		return;
	}
	stage.value = 3;
}

async function onSubmitStage3() {
	if (!form.value.newPassword) {
		error.value = 'Please enter a new password';
		return;
	}
	loading.value = true;
	error.value = '';

	const { data, error: fetchError } = await tryCatch<Promise<void>, Error>(() =>
		$fetch<void>(useAPIURL() + '/auth/forgotPassword', {
			method: 'PATCH',
			body: JSON.stringify({ email: form.value.email, token: form.value.resetToken, newPassword: form.value.newPassword }),
			headers: {
				'auth-token': useAuthStore().authToken,
			},
		}),
	);

	loading.value = false;

	if (fetchError) {
		console.log(fetchError);
		error.value = 'Failed to set new password';
		$swal.fire({
			title: 'Error',
			text: 'An error occurred while setting your new password!',
			icon: 'error',
			confirmButtonText: 'Ok',
		});
		return;
	}
	stage.value = 4;
}
</script>

<style lang="scss" scoped>
.forgot-password-page {
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
	.forgot-password-page {
		background-color: oklch(0.15 0 0);
	}
}
</style>
