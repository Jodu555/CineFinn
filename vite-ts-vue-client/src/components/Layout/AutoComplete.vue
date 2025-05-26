<template>
	<div class="dropdown">
		<input ref="inputRef" @input="input" @keydown="keydown" type="text" class="form-control me-3 dropdown-toggle"
			:placeholder="options.placeholder || ''" style="width: 18rem" autocomplete="off"
			data-bs-toggle="dropdown" />
		<ul ref="dropdownMenuRef" :id="id" v-show="recommendations.length >= 1" class="dropdown-menu">
			<button v-for="recommendation in recommendations" @click="select(recommendation)" type="button"
				class="dropdown-item">
				<span v-for="value in recommendation.values" :class="{ 'text-primary': value.h }">
					{{ value.value }}
				</span>
			</button>
		</ul>
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Dropdown } from 'bootstrap';

const props = defineProps<{
	data: InputItem[];
	options: {
		clearAfterSelect?: boolean;
		maximumItems?: number;
		placeholder?: string;
	};
	selectFn: (ID: string, value: any) => void;
}>();

interface InputItem {
	ID: string;
	value: string;
}

interface RecommendationItem {
	properties?: InputItem;
	taken?: boolean;
	values?: { value: string | undefined; h: boolean; }[];
}

const recommendations = ref<RecommendationItem[]>([]);

const id = ref(String(Math.ceil(Math.random() * 100000)));

const inputRef = ref<HTMLInputElement | null>(null);
const dropdownMenuRef = ref<HTMLUListElement | null>(null);
let dropdown: IDropdown;

interface IDropdown extends Dropdown {
	_menu: any;
}

onMounted(() => {
	if (inputRef.value) {
		dropdown = new Dropdown(inputRef.value) as IDropdown;
	}
});

function select(item: RecommendationItem) {
	if (item?.properties?.ID && item?.properties?.value) {
		props.selectFn(item.properties.ID, item.properties.value);
		if (props?.options?.clearAfterSelect || false) {
			if (inputRef.value) inputRef.value.value = '';
		}
	}
}

async function input() {
	try {
		dropdown.show();
		const maximumItems = props?.options?.maximumItems || 8;
		const lookup = inputRef.value?.value.toLowerCase();

		if (lookup?.trim() === '') {
			recommendations.value = [];
			return;
		}

		recommendations.value = props.data.sort((a, b) => Math.random() - 0.5)
			.map((key) => {
				const value = key.value;
				const idx = removeDiacritics(value)
					.toLowerCase()
					.indexOf(removeDiacritics(lookup || '').toLowerCase());
				if (idx >= 0) {
					const before = value.substring(0, idx);
					const after = value.substring(idx + (lookup?.length || 0), value.length);
					const matched = value.substring(idx, idx + (lookup?.length || 0));

					// const matchPercent = (matched.length / value.length);
					// const matchPercent = matched.length / value.length;
					const matchPercent = 0;

					return {
						properties: key,
						taken: true,
						precision: after == '' && before == '' ? 1 : matchPercent,
						values: [
							{ value: before, h: false },
							{ value: matched, h: true },
							{ value: after, h: false },
						],
					};
				} else {
					return {
						taken: false,
						precision: 0,
					};
				}
			})
			.filter((x) => x.taken).sort((a, b) => {
				if (a.precision > b.precision) return -1;
				if (a.precision < b.precision) return 1;
				return 0;
			});
		recommendations.value.splice(maximumItems, recommendations.value.length);
	} catch (error) {
		console.log(error);
	}
}

function keydown(e: KeyboardEvent) {
	console.log('Came');

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

function removeDiacritics(str: string) {
	// console.log('removeDiacritics', str);

	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
</script>
<style lang=""></style>
