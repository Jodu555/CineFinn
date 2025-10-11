<template>
	<div>
		<h1>Login</h1>
		<button @click="login">Login</button>
	</div>
</template>

<script lang="ts" setup>
const authStore = useAuthStore();

function login() {
	authStore.login({
		username: 'Jodu',
		password: 'Test',
	});
}
</script>

<style scoped></style>
