<template lang="">
	<div>
		<h1>{{ $router.currentRoute._value.query.id }}</h1>
	</div>
</template>
<script>
export default {
	created() {
		console.log(this.$router.currentRoute._value.query.id);
	},
};
</script>
<style lang=""></style>
