<template lang="">
	<div>
		<label :for="id" class="form-label mt-4">{{ name }}</label>
		<input
			:type="type"
			:id="id"
			:autocomplete="autocomplete"
			:value="modelValue"
			@input="$emit('update:modelValue', $event.target.value)"
			:class="{ 'form-control': true, 'is-invalid': !valid, 'is-valid': valid }"
			:placeholder="placeholder"
		/>
		<div :id="id" class="invalid-feedback">
			{{ invalidMessage }}
		</div>
	</div>
</template>
<script>
export default {
	props: ['type', 'id', 'name', 'autocomplete', 'placeholder', 'rules', 'modelValue'],
	data() {
		return {
			valid: false,
			input: '',
			invalidMessage: 'test',
		};
	},
};
</script>
<style lang=""></style>
