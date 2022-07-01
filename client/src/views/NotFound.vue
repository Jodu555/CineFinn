<template lang="">
	<div class="container">
		<div class="row" style="overflow-y: hidden">
			<div class="col text-center">
				<h1>
					<span style="font-size: 3.5rem">404 - Not Found</span> <br />
					The site your looking for,<br />
					seems to doesnt exist.
				</h1>
				<div class="d-grid gap-2 pt-3">
					<router-link class="btn btn-lg btn-outline-info" :to="{ name: 'Login' }"
						>Go to Login</router-link
					>
				</div>
			</div>
			<div class="col">
				<div class="text-center"><img src="https://jodu555.de/errors/404.gif" alt="" /></div>
			</div>
		</div>
	</div>
</template>
<script>
export default {};
</script>
<style lang=""></style>
