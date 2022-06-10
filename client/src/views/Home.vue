<template>
	<div>
		<button class="btn btn-outline-success" @click="toastTopEnd">Pop</button>
		<div class="container accordion accordion-flush" id="accordionFlushExample">
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
								:entity="entity"
								:key="entity.title"
							></EntityCard>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import EntityCard from '@/components/EntityCard.vue';
import { mapState } from 'vuex';
export default {
	components: { EntityCard },
	computed: {
		...mapState(['series']),
		categories() {
			const categories = {};
			this.series.forEach((i) => {
				if (categories[i.categorie] == undefined) {
					categories[i.categorie] = {
						title: i.categorie,
						entitys: [i],
					};
				} else {
					categories[i.categorie].entitys.push(i);
				}
			});
			return categories;
		},
	},
	methods: {
		toastTopEnd() {
			this.$swal({
				toast: true,
				position: 'top-end',
				showConfirmButton: false,
				timer: 1000,
				icon: 'success',
				title: 'Saved',
				timerProgressBar: true,
			});
		},
	},
};
</script>
<style lang=""></style>
