<template>
    <div class="container mt-5">
        <h1>Forgot Password</h1>
        <h4 class="mb-3">If you forgot your password, you can use this page to reset it!</h4>
        <div v-if="stage === 1">
            <p class="mb-2">Just enter your email address and we will send you a reset token!</p>
            <form @submit.prevent="onSubmitStage1()">
                <div class="form-group mb-2">
                    <label for="email">Email</label>
                    <input type="email" class="form-control" id="email" v-model="form.email"
                        placeholder="Enter your Email">
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
            </form>
        </div>
        <div v-if="stage === 2">
            <p class="text-success-emphasis mb-2">We sent you an email with a reset token to {{ form.email }}!</p>
            <form @submit.prevent="onSubmitStage2()">
                <div class="form- mb-2">
                    <label for="resetToken">Reset Token</label>
                    <input type="text" class="form-control" id="resetToken" v-model="form.resetToken"
                        placeholder="Enter the Reset Token">
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
            </form>
        </div>
        <div v-if="stage === 3">
            <p class="text-success-emphasis mb-2">The Reset Token was correct now you can set a new password!</p>
            <form @submit.prevent="onSubmitStage3()">
                <div class="form- mb-2">
                    <label for="newPassword">New Password</label>
                    <input type="password" class="form-control" id="newPassword" v-model="form.newPassword"
                        placeholder="Enter the New Password">
                </div>
                <button type="submit" class="btn btn-primary">Submit</button>
            </form>
        </div>
        <div v-if="stage === 4">
            <h5 class="text-success-emphasis mb-2">Your Password has been reset successfully!</h5>
            <p>You can now login with your new password!</p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import useAPIURL from '~/hooks/useAPIURL';


const stage = ref(1);

const form = ref({
    email: '',
    resetToken: '',
    newPassword: '',
});

const { $swal } = useNuxtApp();

async function onSubmitStage1() {
    //We Initiate the password reset here.
    console.log(form.value);
    const { data, error } = await tryCatch<Promise<void>, Error>(() => $fetch<void>(useAPIURL() + '/auth/forgotPassword', {
        method: 'POST',
        body: JSON.stringify({ email: form.value.email }),
        headers: {
            'auth-token': useAuthStore().authToken,
        },
    }));

    if (error) {
        console.log(error);
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
    //We Check for the correct reset token here.
    console.log(form.value);
    const { data, error } = await tryCatch<Promise<void>, Error>(() => $fetch<void>(useAPIURL() + '/auth/forgotPassword', {
        method: 'PUT',
        body: JSON.stringify({ email: form.value.email, token: form.value.resetToken }),
        headers: {
            'auth-token': useAuthStore().authToken,
        },
    }));

    if (error) {
        console.log(error);
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
    //We set the new password here.
    console.log(form.value);
    const { data, error } = await tryCatch<Promise<void>, Error>(() => $fetch<void>(useAPIURL() + '/auth/forgotPassword', {
        method: 'PATCH',
        body: JSON.stringify({ email: form.value.email, token: form.value.resetToken, newPassword: form.value.newPassword }),
        headers: {
            'auth-token': useAuthStore().authToken,
        },
    }));
    if (error) {
        console.log(error);
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

<style></style>