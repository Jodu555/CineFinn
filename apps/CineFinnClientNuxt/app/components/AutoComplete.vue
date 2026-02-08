<template>
	<div class="dropdown">
		<input
			ref="inputRef"
			@input="input"
			@keydown="keydown"
			type="text"
			class="form-control me-3 dropdown-toggle"
			:placeholder="options.placeholder || ''"
			:style="{ width: options.inputWidth || '18rem' }"
			autocomplete="off"
			data-bs-toggle="dropdown"
		/>
		<ul ref="dropdownMenuRef" v-show="recommendations.length >= 1" class="dropdown-menu">
			<button
				v-for="(recommendation, index) in recommendations"
				:key="index"
				@click="select(recommendation)"
				@mouseenter="prefetch(recommendation)"
				@focus="prefetch(recommendation)"
				type="button"
				class="dropdown-item"
			>
				<span v-for="(value, vIndex) in recommendation.values" :key="vIndex" :class="{ 'text-primary': value.h }">
					{{ value.value }}
				</span>
			</button>
		</ul>
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Dropdown as IBSDropdown } from 'bootstrap';

const props = defineProps<{
	data: InputItem[];
	options: {
		clearAfterSelect?: boolean;
		maximumItems?: number;
		placeholder?: string;
		prefetchAfterMinItems?: number;
		inputWidth?: string;
	};
	selectFn: (ID: string, value: any) => void;
	prefetchFn: (ID: string, value: any) => void;
}>();

interface InputItem {
	ID: string;
	value: string;
}

interface RecommendationItem {
	properties?: InputItem;
	taken?: boolean;
	precision?: number;
	values?: { value: string | undefined; h: boolean }[];
}

const recommendations = ref<RecommendationItem[]>([]);

const inputRef = ref<HTMLInputElement | null>(null);
const dropdownMenuRef = ref<HTMLUListElement | null>(null);
let dropdown: IDropdown | null = null;

interface IDropdown extends IBSDropdown {
	_menu: any;
}

onMounted(async () => {
	if (inputRef.value) {
		const Dropdown = (await import('bootstrap')).Dropdown;

		dropdown = new Dropdown(inputRef.value) as IDropdown;

		if (inputRef.value.value.trim() !== '') {
			//On Mount check if user typed before component loaded and run input function
			input();
		}
	}
});

function select(item: RecommendationItem) {
	if (item.properties == undefined) return;
	if (item.properties.ID == undefined) return;
	if (item.properties.value == undefined) return;

	props.selectFn(item.properties.ID, item.properties.value);
	if (props.options.clearAfterSelect || false) {
		if (inputRef.value) inputRef.value.value = '';
	}
}

function prefetch(item: RecommendationItem) {
	if (item?.properties?.ID && item?.properties?.value) {
		props.prefetchFn(item.properties.ID, item.properties.value);
	}
}

async function input() {
	try {
		if (!dropdown) return;

		dropdown.show();
		const maximumItems = props?.options?.maximumItems || 8;
		const lookup = inputRef.value?.value.toLowerCase();

		if (lookup?.trim() === '') {
			recommendations.value = [];
			return;
		}

		recommendations.value = props.data
			.sort((a, b) => Math.random() - 0.5)
			.map((key) => {
				const value = key.value;
				const idx = removeDiacritics(value)
					.toLowerCase()
					.indexOf(removeDiacritics(lookup || '').toLowerCase());
				if (idx >= 0) {
					const before = value.substring(0, idx);
					const after = value.substring(idx + (lookup?.length || 0), value.length);
					const matched = value.substring(idx, idx + (lookup?.length || 0));

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
			.filter((x) => x.taken)
			.sort((a, b) => {
				if ((a.precision || 0) > (b.precision || 0)) return -1;
				if ((a.precision || 0) < (b.precision || 0)) return 1;
				return 0;
			});
		recommendations.value.splice(maximumItems, recommendations.value.length);
		if (recommendations.value.length <= (props.options?.prefetchAfterMinItems || 2)) {
			//Prefetch top results
			for (const rec of recommendations.value) {
				prefetch(rec);
			}
		}
	} catch (error) {
		console.log(error);
	}
}

function keydown(e: KeyboardEvent) {
	if (!dropdown) return;

	console.log('Came');

	if (e.keyCode === 27) {
		dropdown.hide();
		return;
	}
	if (e.keyCode === 40) {
		e.preventDefault();
		dropdown._menu?.children[0]?.focus({ preventScroll: true });
		return;
	}

	// Prefetch on arrow down/up navigation
	if (e.keyCode === 40 || e.keyCode === 38) {
		const focusedElement = document.activeElement as HTMLElement;
		const focusedIndex = Array.from(dropdown._menu?.children || []).indexOf(focusedElement);
		if (focusedIndex >= 0 && recommendations.value[focusedIndex]) {
			prefetch(recommendations.value[focusedIndex]);
		}
	}

	// Prefetch on Enter key (before selection)
	if (e.keyCode === 13) {
		const focusedElement = document.activeElement as HTMLElement;
		const focusedIndex = Array.from(dropdown._menu?.children || []).indexOf(focusedElement);
		if (focusedIndex >= 0 && recommendations.value[focusedIndex]) {
			prefetch(recommendations.value[focusedIndex]);
		}
	}

	dropdown.update();
}

function removeDiacritics(str: string) {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
</script>
<style lang=""></style>
