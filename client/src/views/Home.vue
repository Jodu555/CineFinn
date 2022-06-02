<template>
	<div class="container mt-2">
		<div class="accordion accordion-flush" id="accordionFlushExample">
			<div v-for="categorie of categories" :key="categorie.title" class="accordion-item">
				<h2 class="accordion-header" id="flush-headingOne">
					<button
						class="accordion-button collapsed"
						type="button"
						data-bs-toggle="collapse"
						data-bs-target="#flush-collapseOne"
						aria-expanded="false"
						aria-controls="flush-collapseOne"
					>
						{{ categorie.title }} / {{ categorie.entitys.length }}
					</button>
				</h2>
				<div
					id="flush-collapseOne"
					class="accordion-collapse collapse"
					aria-labelledby="flush-headingOne"
					data-bs-parent="#accordionFlushExample"
				>
					<div class="accordion-body">
						<div class="row row-cols-1 row-cols-md-3 g-4">
							<EntityCard v-for="entity in categorie.entitys" :key="entity.title"></EntityCard>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import EntityCard from '@/components/EntityCard.vue';
export default {
	components: { EntityCard },
	data() {
		return {
			categories: {
				STO: { title: 'STO', entitys: [{ title: 'Remington Steel', seasons: 5, episodes: 256 }] },
				Aniworld: {
					title: 'Aniworld',
					entitys: [{ title: 'The Irregular at Magic Highshool', seasons: 3, episodes: 50 }],
				},
			},
		};
	},
};
</script>
<style lang=""></style>
