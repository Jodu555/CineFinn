<template>
	<div class="video-actor-container">
		<div v-for="group in characters" :key="group">
			<h2>{{ group[-1] }}</h2>
			<div v-for="char in group" :key="char.name" class="actress-container">
				<div class="row">
					<img class="actress-image col" :src="char.imageURL" alt="" />
					<div class="col align-middle" style="margin-top: 2%">
						<p style="margin-bottom: 0.1rem">{{ char.name }}</p>
						<p class="actress-speaker">
							<img
								class="actress-speaker-flag"
								src="/flag-langs/gersub.svg"
								alt="Deutsche Sprache, Flagge"
								title="Deutsch/German"
							/>
							Saori HAYAMI
						</p>
						<p class="actress-speaker">
							<img
								class="actress-speaker-flag"
								src="/flag-langs/gerdub.svg"
								alt="Deutsche Sprache, Flagge"
								title="Deutsch/German"
							/>
							Mia Diekow
						</p>
					</div>
				</div>
			</div>
			<hr style="width: 90%" />
		</div>
	</div>
</template>
<script>
export default {
	data() {
		return {
			characters: [],
		};
	},
	async created() {
		const response = await fetch('http://localhost:4896/chars');
		const json = await response.json();
		this.characters = [];
		console.log(json);
		Object.keys(json).forEach((key) => {
			const data = json[key];
			data[-1] = key;
			this.characters.push(data);
		});
		console.log(this.characters);
	},
};
</script>
<style scoped>
.actress-speaker {
	font-size: 1rem;
	margin-bottom: 0.2rem;
}
.actress-speaker-flag {
	width: 25px;
	margin-left: 10px;
}
.actress-container {
	max-width: 97%;
	background-color: rgba(0, 0, 0, 0.4);
	transition: box-shadow 0.4s ease-in-out;
	margin-bottom: 0.6rem;
}
.actress-container:hover {
	box-shadow: inset 0 0 0 2px #e2e4e5;
}

.actress-image {
	max-width: 6rem;
	max-height: 7rem;
	margin: 0.6rem;
}
.video-actor-container {
	pointer-events: auto;
	position: absolute;
	top: 4rem;
	left: 0.5rem;
	right: 0;
	color: white;
	z-index: 100;
	margin: 0.5rem;
	font-size: 22px;

	/* max-width: 20rem; */
	max-width: 30%;
	max-height: 77%;

	overflow-y: hidden;
	overflow-x: hidden;

	opacity: 0;
	transition: opacity 300ms ease-in-out;
}

.video-actor-container:hover {
	overflow-y: auto;
}

.video-actor-container::-webkit-scrollbar {
	width: 6px;
}
.video-actor-container::-webkit-scrollbar-thumb {
	background: #fcfdffba;
	border-radius: 10px;
}
.video-actor-container::-webkit-scrollbar-track {
	background: rgba(0, 0, 0, 0.7);
	box-shadow: inset 0 0 8px #666666;
}

.video-container:hover .video-actor-container,
.video-container:focus-within .video-actor-container,
.video-container.paused .video-actor-container {
	opacity: 0.9;
}
</style>
