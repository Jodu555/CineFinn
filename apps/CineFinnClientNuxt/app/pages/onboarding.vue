<template>
    <div class="container shadow p-3 mb-5 rounded">
        <h1 class="d-flex justify-content-center">Onboarding</h1>
        <h4 class="d-flex justify-content-center">
            If you See this Page, you logged in, with an account from the v1 CineFinn to properly use this v2 CineFinn.
        </h4>
        <h4 class="d-flex justify-content-center">You need to fill in your email address to continue</h4>
        <!-- <div class="mb-3">
            <label for="mail" class="form-label fw-bold">Email</label>
            <input type="email" id="mail" class="form-control" aria-describedby="helpId" v-model="email" />
            <small id="helpId" class="form-text text-muted">Your email address</small>
        </div> -->
        <form @submit.prevent="submitForm">
            <InputValidator v-model="email" v-model:valid="emailValid" :disabled="stepTwo" type="email" id="email"
                name="Email" autocomplete="email" placeholder="Enter Email" :rules="emailRules" />

            <InputValidator v-if="stepTwo" v-model="verificationCode" v-model:valid="verificationCodeValid"
                :disabled="!stepTwo" type="verificationCode" id="verificationCode" name="Verification Code"
                autocomplete="Verification Code" placeholder="Enter Verification Code" :rules="verificationCodeRules" />
            <div class="d-flex justify-content-center mt-5">
                <button v-if="!stepTwo" type="submit" :disabled="!emailValid" class="btn btn-outline-success col-4">
                    Send Verification Email
                </button>
                <button v-else type="submit" :disabled="!verificationCodeValid" class="btn btn-outline-success col-4">
                    Submit Verification Code
                </button>
            </div>

        </form>

    </div>
</template>

<script lang="ts" setup>

definePageMeta({
    middleware: 'auth',
});

const email = ref<string>('');
const emailValid = ref(false);
const emailRules = [
    (value: string) => !!value || 'Cannot be empty.',
    (value: string) => !!validateEmail(value) || 'Must be a valid email address.',
];
const stepTwo = ref<boolean>(false);
const verificationCode = ref<string>('');
const verificationCodeValid = ref(false);
const verificationCodeRules = [
    (value: string) => !!value || 'Cannot be empty.',
    (value: string) => value.length >= 4 || 'Must be at least 4 Characters',
    (value: string) => value.length < 6 || 'Must be below 6 Characters',
];

function submitForm() {
    if (!stepTwo.value) {
        console.log('Send Verification Email', email.value);
        if (!emailValid.value) return;

        stepTwo.value = true;
        //Send Verification Email Logic here
    } else {
        console.log('Submit Verification Code', verificationCode.value);
        if (!verificationCodeValid.value) return;

        //Submit Verification Code Logic here

        if (false) {
            verificationCode.value = '';
            verificationCodeValid.value = false;
        }

    }
}

const validateEmail = (email: string) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

</script>

<style></style>