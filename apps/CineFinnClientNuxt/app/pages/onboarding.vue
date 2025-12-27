<template>
	<div class="container shadow p-3 mb-5 rounded">
		<h1 class="d-flex justify-content-center">Onboarding</h1>
		<h4 class="d-flex justify-content-center">You need to Verify your E-Mail Address to Continue</h4>
		<h6 class="d-flex justify-content-center">
			You will receive an E-Mail with a Verification Code this is neccessary to complete the Registration and helps with a forgotten password
		</h6>
		<div class="alert alert-danger" role="alert" v-if="errorMessage.length > 0"><strong>Error:</strong> {{ errorMessage }}</div>

		<form @submit.prevent="submitForm">
			<InputValidator
				v-model="email"
				v-model:valid="emailValid"
				:disabled="stepTwo"
				type="email"
				id="email"
				name="Email"
				autocomplete="email"
				placeholder="Enter Email"
				:rules="emailRules" />

			<InputValidator
				v-if="stepTwo"
				v-model="verificationCode"
				v-model:valid="verificationCodeValid"
				:disabled="!stepTwo"
				type="verificationCode"
				id="verificationCode"
				name="Verification Code"
				autocomplete="Verification Code"
				placeholder="Enter Verification Code"
				:rules="verificationCodeRules" />
			<div class="d-flex justify-content-center mt-5">
				<button v-if="!stepTwo" type="submit" :disabled="!emailValid" class="btn btn-outline-success col-4">Send Verification Email</button>
				<button v-else type="submit" :disabled="!verificationCodeValid" class="btn btn-outline-success col-4">
					Submit Verification Code
				</button>
			</div>
		</form>
	</div>
</template>

<script lang="ts" setup>
import useAPIURL from '~/hooks/useAPIURL';
import type { FetchError } from 'ofetch';
definePageMeta({
	middleware: 'auth',
});

const authStore = useAuthStore();

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

async function submitForm() {
	if (!stepTwo.value) {
		console.log('Send Verification Email', email.value);
		if (!emailValid.value) return;

		const { data, error } = await tryCatch<Promise<any>, FetchError>(() =>
			$fetch<any>(useAPIURL() + '/auth/onboarding/stepOne', {
				method: 'POST',
				headers: {
					'auth-token': authStore.authToken,
				},
				body: JSON.stringify({
					email: email.value,
				}),
			})
		);

		if (error) {
			errorMessage.value = error.data || 'An unknown error occurred.';
			email.value = '';
			emailValid.value = false;
			return;
		}
		stepTwo.value = true;
	} else {
		if (!verificationCodeValid.value) return;

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
			})
		);

		if (error) {
			errorMessage.value = error.data || 'An unknown error occurred.';
			verificationCode.value = '';
			verificationCodeValid.value = false;
			return;
		}
		useRouter().push('/');
	}
}
</script>

<style></style>
