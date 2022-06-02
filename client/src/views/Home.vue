<template>
	<div class="accordion accordion-flush" id="accordionFlushExample">
		<div v-for="categorie of categories" :key="categorie.title" class="accordion-item">
			<h2 class="accordion-header">
				<button
					class="accordion-button collapsed"
					type="button"
					data-bs-toggle="collapse"
					:data-bs-target="'#flush-' + categorie.title"
					aria-expanded="false"
					:aria-controls="'flush-' + categorie.title"
				>
					{{ categorie.title }} / {{ categorie.entitys.length }}
				</button>
			</h2>
			<div :id="'flush-' + categorie.title" class="accordion-collapse collapse">
				<div class="accordion-body">
					<div class="row row-cols-1 row-cols-md-3 g-4">
						<EntityCard
							v-for="entity in categorie.entitys"
							:title="entity.title"
							:seasons="entity.seasons"
							:key="entity.title"
						></EntityCard>
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
			categories: {},
		};
	},
	async mounted() {
		const response = await fetch('http://localhost:3100/index');
		const json = await response.json();

		json.forEach((i) => {
			if (this.categories[i.categorie] == undefined) {
				this.categories[i.categorie] = {
					title: i.categorie,
					entitys: [{ title: i.title, seasons: i.seasons }],
				};
			} else {
				this.categories[i.categorie].entitys.push({ title: i.title, seasons: i.seasons });
			}
		});
	},
};
</script>
<style lang=""></style>
