<template>
	<div class="dropdown">
		<input
			ref="inputRef"
			@click="click"
			@input="input"
			@keydown="keydown"
			type="text"
			class="form-control me-3 dropdown-toggle"
			:placeholder="options.placeholder || ''"
			style="width: 18rem"
			autocomplete="off"
			data-bs-toggle="dropdown"
		/>
		<ul ref="dropdownMenuRef" :id="id" v-show="recommendations.length >= 1" class="dropdown-menu">
			<button v-for="recommendation in recommendations" @click="select(recommendation)" type="button" class="dropdown-item">
				<span v-for="value in recommendation.values" :class="{ 'text-primary': value.h }">
					{{ value.value }}
				</span>
			</button>
		</ul>
	</div>
</template>
<script setup>
import { onMounted, ref, nextTick } from 'vue';
import { Dropdown } from 'bootstrap';

const props = defineProps(['options', 'data', 'selectFn']);

const recommendations = ref([]);

const id = ref(Math.ceil(Math.random() * 100000));

const inputRef = ref(null);
const dropdownMenuRef = ref(null);
let dropdown;

onMounted(() => {
	dropdown = new Dropdown(inputRef.value);
});

function select({ properties: { ID, value } }) {
	props.selectFn(ID, value);
	if (props?.options?.clearAfterSelect || false) {
		inputRef.value.value = '';
	}
}

async function input() {
	dropdown.show();
	const maximumItems = props?.options?.maximumItems || 5;
	const lookup = inputRef.value.value.toLowerCase();
	if (lookup.trim() === '') {
		recommendations.value = [];
		return;
	}

	recommendations.value = props.data
		.map((key) => {
			const value = key.value;
			const idx = removeDiacritics(value).toLowerCase().indexOf(removeDiacritics(lookup).toLowerCase());
			if (idx >= 0) {
				return {
					properties: key,
					taken: true,
					values: [
						{ value: value.substring(0, idx), h: false },
						{ value: value.substring(idx, idx + lookup.length), h: true },
						{ value: value.substring(idx + lookup.length, value.length), h: false },
					],
				};
			} else {
				return {
					taken: false,
				};
			}
		})
		.filter((x) => x.taken);
	recommendations.value.splice(maximumItems, recommendations.value.length);
}

function keydown(e) {
	if (e.keyCode === 27) {
		dropdown.hide();
		return;
	}
	if (e.keyCode === 40) {
		e.preventDefault();
		dropdown._menu.children[0]?.focus({ preventScroll: true });
		return;
	}
	dropdown.update();
}

function removeDiacritics(str) {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
</script>
<style lang=""></style>
