<template lang="">
	<div>
		<div class="row justify-content-start">
			<h2 class="col-sm-2" style="width: 13.666667%">{{ title }}</h2>
			<h3 class="col">
				<button
					style="font-weight: 900; font-size: 1.18rem; padding: 0.3rem 0.6rem"
					type="button"
					:class="{
						btn: true,
						'text-white': true,
						'btn-primary': current !== i + 1,
						'btn-info': current == i + 1,
					}"
					v-for="(s, i) in array"
					:key="s"
					@click="chnageFN(i + 1)"
				>
					{{ i + 1 }}
				</button>
			</h3>
		</div>
	</div>
</template>
<script>
export default {
	props: ['title', 'array', 'current', 'chnageFN'],
};
</script>
<style lang=""></style>
