<template>
	<div class="container">
		<h2 class="text-center">Vote which anime get's uploaded next</h2>

		<div v-if="!isVotingPhase">
			<h3 class="text-center text-danger">There is currently no active voting</h3>
		</div>

		<div class="mt-5" v-else>
			<div v-if="hasAlreadyVoted">
				<!-- Show Results -->
				<div class="mb-4" v-for="cand in state.candidates">
					<h4>- {{ state.todoList.find((x) => x.ID == cand.todoID)?.name }} - {{ cand.todoID }}</h4>
					<div
						class="progress"
						role="progressbar"
						aria-label="Animated striped example"
						aria-valuenow="75"
						aria-valuemin="0"
						aria-valuemax="100">
						<div
							class="progress-bar progress-bar-striped progress-bar-animated"
							:style="{ width: Math.round((cand.currentVotes / allVotes) * 100) + '%' }"></div>
					</div>
					<h5 class="mt-1 text-center">{{ Math.round((cand.currentVotes / allVotes) * 100) }}%</h5>
				</div>
			</div>
			<div v-else>
				<!-- Voting -->
				<div class="row mb-2 row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xxl-4 g-4">
					<div class="col" v-for="(cand, i) in state.candidates">
						<div class="card">
							<img
								:src="decideImageURL(state.todoList.find((x) => x.ID == cand.todoID))"
								class="img-fluid rounded-top me-4 dp-img"
								alt="..." />
							<div class="card-body">
								<h5 class="card-title">{{ i + 1 }} - {{ state.todoList.find((x) => x.ID == cand.todoID)?.name }}</h5>
							</div>
						</div>
					</div>
				</div>

				<form @submit.prevent="vote()" class="mt-5">
					<div class="d-flex justify-content-center">
						<div v-for="(cand, i) in state.candidates" class="form-check form-check-inline">
							<input
								v-model="decision"
								class="form-check-input"
								type="radio"
								name="inlineRadioOptions"
								id="inlineRadio1"
								:value="cand.todoID" />
							<label class="form-check-label" for="inlineRadio1">{{ i + 1 }}</label>
						</div>
					</div>
					<div class="d-grid gap-3">
						<button type="submit" :disabled="decision.trim().length == 0" class="btn btn-outline-primary">Vote!</button>
					</div>
					<div class="d-flex justify-content-center mt-3">
						<small class="text-center">- Note Every User can only vote once</small>
					</div>
				</form>
			</div>
		</div>
		<pre>
			{{ state.candidates }}
		</pre
		>
		<pre>
			Decision: {{ decision }}
			IsVotingPhase: {{ isVotingPhase }}
			HasAlreadyVoted: {{ hasAlreadyVoted }}	
		</pre
		>
	</div>
</template>
<script setup lang="ts">
import { useAxios, useSwal } from '@/utils';
import type { DatabaseParsedTodoItem } from '@Types/database';
import { computed, onMounted, reactive, ref } from 'vue';

const isVotingPhase = ref(true);
const hasAlreadyVoted = ref(false);

const decision = ref('');

const state = reactive({
	todoList: [] as DatabaseParsedTodoItem[],
	candidates: [
		{
			todoID: '985320',
			currentVotes: 2,
		},
		{
			todoID: '369007',
			currentVotes: 5,
		},
		{
			todoID: '135915',
			currentVotes: 9,
		},
		{
			todoID: '933145',
			currentVotes: 3,
		},
	],
});

const allVotes = computed(() => {
	return state.candidates.reduce((p, c) => p + c.currentVotes, 0);
});

async function vote() {
	//DO Stuff
	hasAlreadyVoted.value = true;
	const response = await useAxios().post('/vote', {
		todoID: decision.value,
		time: Date.now(),
	});

	if (response.status == 200) {
		//Vote Success
	} else {
		//Vote Failed maybe cause already voted
		useSwal({
			toast: true,
			position: 'top-end',
			showConfirmButton: false,
			timer: 3000,
			icon: 'error',
			title: `You already voted, every user can vote only once`,
			timerProgressBar: true,
		});
	}
}

function decideImageURL(element: DatabaseParsedTodoItem | undefined) {
	if (element == undefined) return '';
	if (
		element.scraped != undefined &&
		element.scraped !== true &&
		element.scraped.informations.image &&
		typeof element.scraped.informations.image == 'string'
	) {
		return element.scraped.informations.image;
	}
	if (
		element.scrapednewZoro != undefined &&
		element.scrapednewZoro !== true &&
		element.scrapednewZoro.image &&
		typeof element.scrapednewZoro.image == 'string'
	) {
		return element.scrapednewZoro.image;
	}

	if (
		element.scrapedAnix != undefined &&
		element.scrapedAnix !== true &&
		element.scrapedAnix.image &&
		typeof element.scrapedAnix.image == 'string'
	) {
		return element.scrapedAnix.image;
	}
	return '';
}

onMounted(async () => {
	const response = await useAxios().get<DatabaseParsedTodoItem[]>('/todo/');
	if (response.status == 200) {
		state.todoList = response?.data?.sort((a, b) => a.order - b.order);
	}
});
</script>
<style lang="scss" scoped>
.dp-img {
	max-width: 18rem;
	min-width: 17rem;
	min-height: 24rem;
	max-height: 20rem;
	width: 100%;
	object-fit: cover;
	border-radius: 25px;
}
</style>
