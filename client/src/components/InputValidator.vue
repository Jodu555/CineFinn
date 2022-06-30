<template lang="">
	<div>
		<label :for="id" class="form-label mt-4">{{ name }}</label>
		<input
			:type="type"
			:id="id"
			:autocomplete="autocomplete"
			:value="modelValue"
			@input="$emit('update:modelValue', $event.target.value)"
			:class="{
				'form-control': true,
				'is-invalid': internalValid == false,
				'is-valid': internalValid == true,
			}"
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
			internalValid: null,
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
				this.internalValid = false;
				this.invalidMessage = falsey[0];
			} else {
				this.internalValid = true;
				this.invalidMessage = '';
			}
			this.$emit('update:valid', this.internalValid);
			return falsey.length == 0;
		},
	},
};
</script>
<style lang=""></style>
