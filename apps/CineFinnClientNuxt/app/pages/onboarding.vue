<template>
	<div class="onboarding-page min-vh-100 d-flex align-items-center justify-content-center py-4">
		<div class="container">
			<div class="row justify-content-center">
				<div class="col-md-8 col-lg-6">
					<div class="card shadow-lg border-0 rounded-4">
						<div class="card-header bg-transparent border-0 pt-4 pb-0">
							<div class="text-center">
								<font-awesome-icon icon="fa-solid fa-film" class="fa-3x text-primary mb-3" />
								<h1 class="fw-bold">CineFinn</h1>
								<p class="text-muted">Email Verification</p>
							</div>
						</div>
						<div class="card-body px-4 pb-4">
							<div v-if="errorMessage.length > 0" class="alert alert-danger alert-dismissible fade show" role="alert">
								<font-awesome-icon icon="fa-solid fa-circle-exclamation" class="me-2" />
								<strong>Error:</strong> {{ errorMessage }}
								<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
							</div>

							<div v-if="loading" class="d-flex justify-content-center my-4">
								<div class="spinner-border text-primary" role="status">
									<span class="visually-hidden">Loading...</span>
								</div>
							</div>

							<div v-if="!stepTwo" class="text-center mb-4">
								<font-awesome-icon icon="fa-solid fa-envelope" class="fa-2x text-muted mb-3" />
								<p class="text-muted">
									Verify your email address to complete registration. You'll receive a verification code via email.
								</p>
								<p class="text-muted small">This helps secure your account and enables password recovery.</p>
								<p class="text-muted small">
									<font-awesome-icon icon="fa-solid fa-clock" class="me-1" />
									Skip for 24 hours if you can't verify right now
								</p>
							</div>

							<div v-else class="text-center mb-4">
								<font-awesome-icon icon="fa-solid fa-key" class="fa-2x text-primary mb-3" />
								<p class="text-muted">
									We've sent a verification code to <strong>{{ email }}</strong>
								</p>
							</div>

							<form @submit.prevent="submitForm">
								<fieldset :disabled="loading">
									<div class="mb-3" v-if="!stepTwo">
										<label for="email" class="form-label">
											<font-awesome-icon icon="fa-solid fa-envelope" class="me-2" />
											Email Address
										</label>
										<InputValidator
											v-model="email"
											v-model:valid="emailValid"
											:disabled="stepTwo"
											type="email"
											id="email"
											name="Email"
											autocomplete="email"
											placeholder="Enter your email address"
											:rules="emailRules"
											:show-label="false" />
									</div>

									<div class="mb-3" v-if="stepTwo">
										<label for="verificationCode" class="form-label">
											<font-awesome-icon icon="fa-solid fa-key" class="me-2" />
											Verification Code
										</label>
										<InputValidator
											v-model="verificationCode"
											v-model:valid="verificationCodeValid"
											:disabled="!stepTwo"
											type="verificationCode"
											id="verificationCode"
											name="Verification Code"
											autocomplete="one-time-code"
											placeholder="Enter verification code"
											:rules="verificationCodeRules"
											:show-label="false" />
									</div>

									<div class="d-flex justify-content-center mt-4 gap-3">
										<button v-if="!stepTwo" type="button" class="btn btn-outline-secondary" @click="skipForOneDay">
											<font-awesome-icon icon="fa-solid fa-clock" class="me-2" />
											Remind Me Later
										</button>
										<button v-if="!stepTwo" type="submit" :disabled="!emailValid || loading" class="btn btn-primary">
											<font-awesome-icon icon="fa-solid fa-paper-plane" class="me-2" />
											Send Verification Email
										</button>
										<button v-else type="submit" :disabled="!verificationCodeValid || loading" class="btn btn-primary px-4">
											<font-awesome-icon icon="fa-solid fa-check" class="me-2" />
											Verify Code
										</button>
									</div>
								</fieldset>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { FetchError } from 'ofetch';

definePageMeta({
	middleware: 'auth',
});

const authStore = useAuthStore();
const loading = ref(false);

if (authStore.loggedIn && !authStore.user.email.includes('@nil.com')) {
	useRouter().push('/');
}

const errorMessage = ref<string>('');

const email = ref<string>('');
const emailValid = ref(false);
const emailRules = [(value: string) => !!value || 'Cannot be empty.', (value: string) => !!validateEmail(value) || 'Must be a valid email address.'];
const stepTwo = ref<boolean>(false);
const verificationCode = ref<string>('');
const verificationCodeValid = ref(false);
const verificationCodeRules = [
	(value: string) => !!value || 'Cannot be empty.',
	(value: string) => value.length >= 4 || 'Must be at least 4 Characters',
	(value: string) => value.length < 6 || 'Must be below 6 Characters',
];

function validateEmail(email: string): boolean {
	const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return re.test(email);
}

async function skipForOneDay() {
	const expiry = Date.now() + 24 * 60 * 60 * 1000;
	const onboardingSkipUntilCookie = useCookie('onboardingSkipUntil', {
		expires: new Date(expiry + 1000 * 30),
	});
	onboardingSkipUntilCookie.value = expiry.toString();
	useRouter().push('/');
}

async function submitForm() {
	if (!stepTwo.value) {
		console.log('Send Verification Email', email.value);
		if (!emailValid.value) return;

		loading.value = true;
		const { data, error } = await tryCatch<Promise<any>, FetchError>(() =>
			$fetch<any>(useAPIURL() + '/auth/onboarding/stepOne', {
				method: 'POST',
				headers: {
					'auth-token': authStore.authToken,
				},
				body: JSON.stringify({
					email: email.value,
				}),
			}),
		);
		loading.value = false;

		if (error) {
			errorMessage.value = error.data || 'An unknown error occurred.';
			email.value = '';
			emailValid.value = false;
			return;
		}
		stepTwo.value = true;
	} else {
		if (!verificationCodeValid.value) return;

		loading.value = true;
		const { data, error } = await tryCatch<Promise<any>, FetchError>(() =>
			$fetch<Promise<any>>(useAPIURL() + '/auth/onboarding/stepTwo', {
				method: 'POST',
				headers: {
					'auth-token': authStore.authToken,
				},
				body: JSON.stringify({
					email: email.value,
					verificationCode: verificationCode.value,
				}),
			}),
		);
		loading.value = false;

		if (error) {
			errorMessage.value = error.data || 'An unknown error occurred.';
			verificationCode.value = '';
			verificationCodeValid.value = false;
			return;
		}
		//Reload user info so the check actually passes in the onboarding middleware
		await authStore.authenticate();
		useRouter().push('/');
	}
}
</script>

<style lang="scss" scoped>
.onboarding-page {
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
	.onboarding-page {
		background-color: oklch(0.15 0 0);
	}
}
</style>
