<template>
	<div
		class="modal fade"
		v-on="{ 'hide.bs.modal': () => changeShow(false), 'show.bs.modal': () => changeShow(true) }"
		:id="id"
		tabindex="-1"
		aria-labelledby=""
		aria-hidden="true"
		ref="modalElement"
	>
		<div class="modal-dialog" :class="`modal-${size}`">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" :id="id + 'Label'">
						<slot name="title"> </slot>
					</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<slot name="body" />
				</div>
				<div class="modal-footer">
					<slot name="footer">
						<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
					</slot>
				</div>
			</div>
		</div>
	</div>
</template>
<script setup>
import { onMounted, ref, watch } from 'vue';
import { Modal } from 'bootstrap';
const props = defineProps({
	id: {
		type: String,
		default: 'exampleModal',
	},
	show: {
		type: Boolean,
	},
	handleClose: {
		type: Function,
	},
	size: {
		type: String,
		default: '',
	},
});
const emit = defineEmits(['update:show']);
let modalElement = ref(null);
let thisModalObj = null;

onMounted(() => {
	thisModalObj = new Modal(modalElement.value);
});

const changeShow = (v) => {
	emit('update:show', v);
};

watch(
	() => props.show,
	(newX) => {
		newX && thisModalObj.show();
		!newX && thisModalObj.hide();
	}
);
</script>
