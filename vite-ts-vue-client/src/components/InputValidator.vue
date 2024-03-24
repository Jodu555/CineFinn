<template>
	<div>
		<label :for="id" class="form-label mt-4">{{ name }}</label>
		<input
			:type="type"
			:id="id"
			:autocomplete="autocomplete"
			:value="modelValue"
			@input="$emit('update:modelValue', ($event!.target! as any).value)"
			:class="{
				'form-control': true,
				'is-invalid': internalValid == false,
				'is-valid': internalValid == true,
			}"
			:placeholder="placeholder" />
		<div :id="id" class="invalid-feedback">
			{{ invalidMessage }}
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		type: { type: String, required: true },
		id: { type: String, required: true },
		name: { type: String, required: true },
		autocomplete: { type: String, required: true },
		placeholder: { type: String, required: true },
		rules: { type: Array, required: true },
		modelValue: { type: String, required: true },
		valid: { type: Boolean, required: true },
	},
	data() {
		return {
			internalValid: false,
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
			const falsey: string[] = [];
			type RuleFunction = (value: string) => true | string;
			for (const rule of this.rules as RuleFunction[]) {
				const res = rule(this.modelValue);
				if (res != true) {
					falsey.push(res);
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
});
</script>
<style></style>
