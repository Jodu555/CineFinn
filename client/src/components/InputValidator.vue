<template lang="">
	<div>
		<label :for="id" class="form-label mt-4">{{ name }}</label>
		<input
			:type="type"
			:id="id"
			:autocomplete="autocomplete"
			:value="modelValue"
			@input="$emit('update:modelValue', $event.target.value)"
			:class="{ 'form-control': true, 'is-invalid': valid == false, 'is-valid': valid == true }"
			:placeholder="placeholder"
		/>
		<div :id="id" class="invalid-feedback">
			{{ invalidMessage }}
		</div>
	</div>
</template>
<script>
export default {
	props: ['type', 'id', 'name', 'autocomplete', 'placeholder', 'rules', 'modelValue', 'valid'],
	data() {
		return {
			valid: null,
			input: '',
			invalidMessage: '',
		};
	},
	watch: {
		modelValue() {
			this.validate();
		},
	},
	methods: {
		validate() {
			const falsey = [];
			for (const rule of this.rules) {
				if (rule(this.modelValue) != true) {
					falsey.push(rule(this.modelValue));
				}
			}
			if (falsey.length > 0) {
				this.valid = false;
				this.invalidMessage = falsey[0];
			} else {
				this.valid = true;
				this.invalidMessage = '';
			}
			this.$emit('update:valid', this.valid);
			return falsey.length == 0;
		},
	},
};
</script>
<style lang=""></style>
