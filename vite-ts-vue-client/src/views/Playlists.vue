<template>
	<div class="container">
		<div class="row mt-3 g-3">
			<div class="col" v-for="playlist in playlists">
				<!-- <div class="card mb-3" style="max-width: 540px; padding: 1rem" :style="{ height: `${13 + 0.4 + playlist.children.length * 0.2}rem` }"> -->
				<div
					v-auto-animate
					class="card mb-3"
					style="max-width: 540px; padding: 1rem"
					:style="{ height: true ? '' : `${expand ? 58 : 20 + 2 + playlist.children.length * 1}vh` }">
					<div v-if="!expand" class="row g-5">
						<div class="col-md-5">
							<div class="image-wrapper" :style="{ height: `${9 + playlist.children.length * 0.2}rem` }">
								<img
									v-for="(child, idx) in playlist.children.slice(0, 5)"
									class="playlist-image rounded"
									:style="{ 'margin-left': `${idx * 1.1}rem`, 'margin-top': `${idx * 0.2}rem`, 'z-index': playlist.children.length - idx }"
									:src="`http://cinema-api.jodu555.de/images/${child}/cover.jpg?auth-token=samytoken`"
									alt="Title" />
							</div>
						</div>
						<div class="col-md-7">
							<div class="card-body">
								<div class="d-flex flex-row">
									<div class="me-auto">
										<h3 class="card-title">{{ playlist.name }}</h3>
									</div>
									<div>
										<button @click="expand = true" type="button" class="btn btn-primary">&rtri;</button>
									</div>
								</div>
								<div class="card-text">
									<p class="text-body-secondary">
										Created: {{ new Date().toLocaleDateString() }} <br />
										Items: {{ playlist.children.length }}
									</p>
								</div>
							</div>
						</div>
					</div>
					<div v-else>
						<div class="card-body" style="padding: 0">
							<div class="d-flex justify-content-between">
								<div>
									<h3 class="card-title">{{ playlist.name }}</h3>
								</div>
								<div>
									<button @click="expand = false" type="button" class="btn btn-primary">&ltri;</button>
								</div>
							</div>
						</div>
						<div v-auto-animate class="d-flex mt-4 justify-content-between">
							<div style="margin-top: 15%; margin-right: 5%">
								<button @click="prev" type="button" class="btn btn-primary">&lt;</button>
							</div>
							<div v-auto-animate class="card-img-bottom image-wrapper" style="height: 35vh">
								<img
									v-for="(child, idx) in playlist.children.slice(start % playlist.children.length, end)"
									:key="child.ID"
									@mouseover="selected = child"
									@click="$router.push({ path: '/watch', query: { id: child.ID } })"
									class="playlist-image playlist-bottom-image rounded"
									style="cursor: pointer"
									:style="{ 'margin-left': `${idx * 2}rem`, 'z-index': playlist.children.length - idx }"
									:src="`http://cinema-api.jodu555.de/images/${child}/cover.jpg?auth-token=samytoken`"
									:alt="child.ID"
									:text="child" />
							</div>
							<div style="margin-top: 15%; margin-right: 5%">
								<button @click="next(playlist)" type="button" class="btn btn-primary">></button>
							</div>
						</div>
						<div class="d-flex mt-2 justify-content-center">
							<h3 class="text-truncate">{{ selected.title }}</h3>
						</div>
					</div>
				</div>
			</div>
			<!-- <h1>NETFLIX</h1>
			<div class="wrapper">
				<section id="section1">
					<a href="#section3" class="arrow__btn">‹</a>
					<div class="item">
						<img
							src="https://occ-0-1567-1123.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABRvngexxF8H1-OzRWFSj6ddD-aB93tTBP9kMNz3cIVfuIfLEP1E_0saiNAwOtrM6xSOXvoiSCMsihWSkW0dq808-R7_lBnr6WHbjkKBX6I3sD0uCcS8kSPbRjEDdG8CeeVXEAEV6spQ.webp"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABZEK-7pZ1H5FD4cTyUb9qB_KeyJGz5p-kfPhCFv4GU_3mbdm8Xfsy4IBchlG9PFNdGff8cBNPaeMra72VFnot41nt0y3e8RLgaVwwh3UvyM2H2_MkmadWbQUeGuf811K7-cxJJh7gA.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABQCoK53qihwVPLRxPEDX98nyYpGbxgi5cc0ZOM4iHQu7KQvtgNyaNM5PsgI0vy5g3rLPZdjGCFr1EggrCPXpL77p2H08jV0tNEmIfs_e8KUfvBJ6Ay5nM4UM1dl-58xA6t1swmautOM.webp"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABdYtAqj8CyaJTWq5taD8Ro_UgwH3nne9QpFGVps-2J3IG-leqrfqXFii4jzZn48nPYTkrlwKQEV0R7_cEKlYBPRzdKqNODc-Oz26IL3LlLgFboXibIWXwxzeYxzuqn0I9TpARjeByw.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABbcCX42tsqGbBvO2y9CQv5-7QvYbCfoHtXsuc6NPCtZaKa4l4fBX3XWvUwG9F2A3CTsNpHVmulxBbdXKwK8Q6xGjejd9FoadGkZ7CnGrSl601TOQjzSHJ23NuIPC8j0QMGORL4uRIA.jpg"
							alt="Describe Image"
						/>
					</div>
					<a href="#section2" class="arrow__btn">›</a>
				</section>
				<section id="section2">
					<a href="#section1" class="arrow__btn">‹</a>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABVopDZ5Fy9_fk_HO5WxHTXKKjKhtWFupbSjuvPwfLK_vytzon4EwRUdGgYJ34JwPxOTK_NkV3aXfkULMB0Dcct-FyfqzH-X44VXuRMp4QeBHlvKwWeZFpZlGdItPzmmg4scmwhG7SQ.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABTOj1-116yVcgKWMU2dI3GFR4x0fSkiGsqtLLeLUxRR7STaksjAqBTrYlTfrB8nIGnGvXksi0ewXAhVGg6-pLxpFOIfcpjK-pf8D5xehFZo5a6vJbo4L0AGbrzglbyUoq255QBJgRQ.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABd3IBDpxbRcHXvRMFCZeKa2aHLU1P4SJtrACMS9om3yhLjqPlvNlmR_fypPxjtbsbnKaC4JZhPSpDG4r_kdxSHHAltWguMcCB-1Y1OShr2zWfUv7Whf_39fNH5ZJ3_0gxQrs0akmQjQz44_LT7jXH5LMZ7iMBAzac5IEj4m7Fn_5OWEGYnVsDsKG-QTommDooULMDF9bEw.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABXSd7bhDddcwkq9XpksoQFCHVx29Sxl_h4hb2n3F2GIt32a4XWcOnctQfgnT5qdolv8UML6_xNB5CJ89h56wueb13mYmEBr0sx5e9iLPdtVcOQAOmKXKWHHXwFvJuCUwuNnL3s8eAQwqLXPVMHMEsujM684rUGrZNF2btN2GRy5-RyEslsxZO93V2Q_H2bWs8A8oayt1h5M.webp"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABbXWODpAWqVXcmmjMA7K-2mPkQpvwCLfSdeyhVXzR8A3MSpdSEnnjf4HEJJTYC-TnktU6njTUGAxmzWEYCaJbk4v_ZeL-7QGzmkvYBjg_N-evr2XmcX-Fanoyvu_nimFP4iigPe4O3Vr_WcgplhwkDrJwPUJa84wRLrNAx3TufN5V7cWRP4indqu5HQahvgFEqfL9zjp4g.jpg"
							alt="Describe Image"
						/>
					</div>
					<a href="#section3" class="arrow__btn">›</a>
				</section>
				<section id="section3">
					<a href="#section2" class="arrow__btn">‹</a>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABRr4YxdaABuAuH_3FmSQZn7BCvLp-UUPsXE9MiYpvFP3CSUHV2zOew5oVqKqqdaOd3tbFVS0Uf67uIs7_eZydlCghg4nK0nMatRpPImABwTOhnNzCLCxdKrua7pPIcPCZqBYTeAO5g.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/412e4119fb212e3ca9f1add558e2e7fed42f8fb4/AAAABTyWK1MKaw8GcObtz47R2Tj7wkLJ7qQu9tk6TVpcoyxpzD4B-zZ569bQ5vGrREBL-MWFkGilXUwy7tCDaj2XOGkUB4RsbbFAmp9NgSr6lygMpUGNHSlyfrFbUORsRkrxSIoh_ggOvg.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABY7NwkWEJIfXsn6t3Li4bGSCQ1nEErPisI5ZZtXlC-_VRBZOUrhWK5X3vt3t6SR_cpgVhCwxgQqFFDJhk62Kk8hawOnYGZMr0LKeLczMFV2zalCFjkcdLksvT4HB2LEi6LFyruyk3Uu0LmNGsHfC2A8Bly60smr_3sDbz4RruXcklPOG1qYq9wUVu3zfaiwNvqmG4b8aFA.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABemXHOga9feFnOux6I2YyACBD94wvM7N3vcTGIfMpQ_BcaXeoeM9XyzdVdamKtxt0SHXZfvsl6czcp3E48tXMLtHBxuQsh1BjHtPGgJDZ81je_FjItINiqzLtir0A30s_e4KR8G3d7AYAPDjZVOY97bNpzNqtkcHcGp7fGnJByVCps1uLfG9U9tK3Ma1A_3JbRt0NiT2_Q.jpg"
							alt="Describe Image"
						/>
					</div>
					<div class="item">
						<img
							src="https://occ-0-243-299.1.nflxso.net/dnm/api/v5/rendition/a76057bcfd003711a76fb3985b1f2cf74beee3b8/AAAABVxuRB932hvre-XP0gh6ar5ztoR3Oe3QjKHkyvcDnRak2MKXOrx5H7mFQSvggefMFOppwEs7ZCCpiqrJ_CYGvtvYB9NpU4SWUtNO6uV2u-DTID267AcHjHcGvGBQJ1ufddDkxcGOZyi5MlOQ5QUmBun4652FbYUnib3zMYQDgcna_Pvz8y_HO5fbokxezrRR1JZAAiqFSQ.jpg"
							alt="Describe Image"
						/>
					</div>
					<a href="#section1" class="arrow__btn">›</a>
				</section>
			</div> -->
		</div>
	</div>
</template>
<script lang="ts">
import { mapWritableState } from 'pinia';
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';

interface PlaylistItem {
	ID: string;
	title: string;
}

interface Playlist {
	name: string;
	children: PlaylistItem[];
}

export default {
	data() {
		return {
			expand: false,
			start: 0,
			end: 8,
			selected: {} as PlaylistItem,
			playlists: [] as Playlist[],
			dummyPlaylists: [
				{
					name: 'Legend Tier',
					children: [
						'814f331c',
						'325ec6e5',
						'7dbb748a',
						'ee28ef23',
						'baeaf204',
						'49381178',
						'dbc0aa61',
						'00ba2a50',
						'bc3ed45e',
						'48ccd6f0',
						'64cd2545',
						'6a8720f5',
						'14580e05',
						'e2708912',
						'dda00ebc',
						'dd921d8f',
						'125e06d6',
						'34f7f256',
						'8b76d630',
						'314966cb',
						'c734e9c1',
						'bd8b45d0',
						'8922a4f0',
						'a570c73c', //Last: The Dawn of the witch
					],
				},
				// { name: 'Noice', children: ['42bd8f65', '310a3546'] },
			],
		};
	},
	computed: {
		...mapWritableState(useAuthStore, ['settings']),
		...mapWritableState(useIndexStore, ['series', 'loading']),
	},
	watch: {
		loading(newval) {
			!newval && this.handleData();
		},
	},
	methods: {
		next(playlist: Playlist) {
			this.end += 8;
			this.start += 8;

			if (this.end > playlist.children.length) {
				this.end = playlist.children.length;
				this.start -= 8;
			}
		},
		prev() {
			this.end -= 8;
			this.start -= 8;
			if (this.end < 8) this.end = 8;
			if (this.start < 0) this.start = 0;
		},
		async loadData() {
			//TODO: Do the get playlist stuff here
			// this.loading = true;
			// const response = await this.$networking.get('/playlists');
			// if (response.success) {
			// 	this.playlists = response.json;
			// }
			// this.loading = false;
			if (this.loading == false) this.handleData();
		},
		handleData() {
			this.playlists = this.dummyPlaylists.map((x) => {
				return {
					name: x.name,
					children: x.children.map((y) => {
						return { ID: y, title: this.series.find((s) => s.ID == y)?.title || 'NOT FOUND' };
					}),
				};
			});
		},
	},
	async created() {
		await this.loadData();
		document.title = `Cinema | News`;
	},
	beforeUnmount() {
		document.title = `Cinema | Jodu555`;
	},
};
</script>
<style scoped lang="scss">
.image-wrapper {
	position: relative;
	/* height: 35vh; */
}
.playlist-image {
	height: 35vh;
	width: auto;
	position: absolute;
	top: 0;
	left: 0;
	opacity: 0.9;
	transition: all 200ms ease-in-out;
}

.playlist-bottom-image:hover {
	margin-top: -10vh !important;
	transform: scale(1.2);
	opacity: 1;
}

$itemGrow: 1.2;
$duration: 250ms;

html {
	scroll-behavior: smooth;
}

body {
	margin: 0;
	background-color: #000;
}

h1 {
	font-family: Arial;
	color: red;
	text-align: center;
}

.wrapper {
	display: grid;
	grid-template-columns: repeat(3, 100%);
	overflow: hidden;
	scroll-behavior: smooth;

	section {
		width: 100%;
		position: relative;
		display: grid;
		grid-template-columns: repeat(5, auto);
		margin: 20px 0;

		.item {
			padding: 0 2px;
			transition: $duration all;

			&:hover {
				margin: 0 40px;
				transform: scale(1.2);
			}
		}

		a {
			position: absolute;
			color: #fff;
			text-decoration: none;
			font-size: 6em;
			background: rgb(0, 0, 0);
			width: 80px;
			padding: 20px;
			text-align: center;
			z-index: 1;

			&:nth-of-type(1) {
				top: 0;
				bottom: 0;
				left: 0;
				background: linear-gradient(-90deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
			}
			&:nth-of-type(2) {
				top: 0;
				bottom: 0;
				right: 0;
				background: linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%);
			}
		}
	}
}

// Remove the arrow for Mobile
@media only screen and (max-width: 600px) {
	a.arrow__btn {
		display: none;
	}
}
</style>
