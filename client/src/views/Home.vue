<template>
	<div>
		<div v-auto-animate style="z-index: 100">
			<a v-auto-animate v-if="backToTop" @click="scrollToTop()" id="backToTop" class="btn btn-primary btn-lg back-to-top" role="button"
				><font-awesome-icon icon="fa-solid fa-up-long" size="xl"
			/></a>
		</div>
		<div v-if="loading" class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
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
						<div class="row row-cols-1 row-cols-sm-2 row-cols-md-4 row-cols-xxl-5 g-4">
							<EntityCard v-for="entity in categorie.entitys" :entity="entity" :key="entity.title" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import EntityCard from '@/components/Home/EntityCard.vue';
import { mapState, mapActions } from 'vuex';
export default {
	components: { EntityCard },
	data() {
		return {
			backToTop: false,
		};
	},
	created() {
		window.addEventListener('scroll', this.handleScroll);
	},
	beforeUnmount() {
		window.removeEventListener('scroll', this.handleScroll);
	},
	methods: {
		handleScroll(e) {
			const height = document.documentElement.offsetHeight;

			const mapping = this.map(
				document.documentElement.scrollTop,
				[0, height],
				[0, window.innerHeight - document.querySelector('.footer').getBoundingClientRect().height - 25]
			);

			// console.log('SCROLL', height, document.documentElement.scrollTop);
			// console.log('MAPPING', Math.ceil(mapping));

			if (document.documentElement.scrollTop > 100) {
				this.backToTop = true;
				if (document.querySelector('#backToTop')) document.querySelector('#backToTop').style.top = `${Math.ceil(mapping)}px`;
			} else {
				this.backToTop = false;
			}
		},
		map(value, oldRange, newRange) {
			// console.log(value, oldRange, newRange);
			var newValue = ((value - oldRange[0]) * (newRange[1] - newRange[0])) / (oldRange[1] - oldRange[0]) + newRange[0];
			return Math.min(Math.max(newValue, newRange[0]), newRange[1]);
		},
		scrollToTop() {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		},
	},
	computed: {
		...mapState(['series', 'loading']),
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
};
</script>
<style lang="css">
.back-to-top {
	position: fixed;
	/* bottom: 64px; */
	right: 25px;
	/* display: none; */
}
</style>
