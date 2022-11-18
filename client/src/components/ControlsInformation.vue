<template>
	<div class="modal fade" aria-modal="true" id="controlsModal" tabindex="-1" aria-labelledby="controlsModal" aria-hidden="true">
		<div class="modal-dialog modal-lg">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="controlsModalLabel">Controls Informations</h5>
					<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
				</div>
				<div class="modal-body">
					<div class="row h-100">
						<div class="col border-left-vr">
							<div class="vstack gap-3">
								<div v-for="control in controls.slice(0, half)" :key="control.key">
									<div class="hstack">
										<span class="h6 me-auto">{{ control.desc }}</span>
										<span class="h7">
											{{ Array.isArray(control.key) ? control.key.join(', ') : control.key }}
										</span>
									</div>
									<hr />
								</div>
							</div>
						</div>
						<div class="col">
							<div class="vstack gap-3">
								<div v-for="control in controls.slice(half)" :key="control.key">
									<div class="hstack">
										<span class="h6 me-auto">{{ control.desc }}</span>
										<span class="h7">
											{{ Array.isArray(control.key) ? control.key.join(', ') : control.key }}
										</span>
									</div>
									<hr />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script setup>
import { ref } from 'vue';

const controls = ref([
	{ key: 'k', desc: 'Play/Pause Toggle' },
	{ key: 'f', desc: 'Vollbild Toggle' },
	{ key: 't', desc: 'Theater Mode Toggle' },
	{ key: 'i', desc: 'Mini Player Toggle' },
	{ key: 'm', desc: 'Mute Toggle' },
	{ key: ['j', 'links pfeil'], desc: 'Skip 5 Sekunden zurück' },
	{ key: ['l', 'rechts pfeil'], desc: 'Skip 5 Sekunden vorwärts' },
	{ key: 'pfeil hoch', desc: 'Lautstärke hoch' },
	{ key: 'pfeil runter', desc: 'Lautstärke runter' },
	{ key: 'n', desc: 'nächste episode' },
	{ key: 'p', desc: 'vorherige episode' },
	{ key: '.', desc: 'Skip 1 Frame zurück' },
	{ key: ',', desc: 'Skip 1 Frame vorwärts' },
	{ key: '0..9', desc: 'Skippt zu dem jeweiligen Prozentualen video Fortschritt' },
	{ key: 'j', desc: 'wenn bei der such leiste mit der tastatur navigiert wird, kann j gedrück werde, um die serie im neuen tab zu öffnen' },
]);

const half = Math.ceil(controls.value.length / 2);

// const firstHalf = list.slice(0, half);
// const secondHalf = list.slice(half);
</script>
<style scoped>
.border-left-vr {
	color: inherit;
	border-right: 1px solid rgba(33, 37, 41, 0.25);
}
</style>
