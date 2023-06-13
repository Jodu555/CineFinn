<template>
	<div>
		<div class="card text-start">
			<pre v-if="settings.developerMode.value">
				{{ { room: room, ago: ago, series: getSeries(room.seriesID) } }}
			</pre
			>
			<div class="card-body">
				<h4 class="card-title">{{ getSeries(room.seriesID)?.title }}</h4>
				<p class="card-text">Opend: {{ ago }} with {{ room.members.length }} users</p>
				<button class="btn btn-outline-success">Join</button>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState } from 'vuex';

export default {
	props: ['room'],
	data() {
		return {
			ago: '',
		};
	},
	mounted() {
		this.ago = this.timeAgo(new Date(this.room.created));
		setInterval(() => {
			this.ago = this.timeAgo(new Date(this.room.created));
		}, 1000);
	},
	computed: {
		...mapState(['series']),
		...mapState('auth', ['settings']),
	},
	methods: {
		timeAgo(timestamp, locale = 'en') {
			let value;
			const diff = (new Date().getTime() - timestamp.getTime()) / 1000;
			const minutes = Math.floor(diff / 60);
			const hours = Math.floor(minutes / 60);
			const days = Math.floor(hours / 24);
			const months = Math.floor(days / 30);
			const years = Math.floor(months / 12);
			const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

			if (years > 0) {
				value = rtf.format(0 - years, 'year');
			} else if (months > 0) {
				value = rtf.format(0 - months, 'month');
			} else if (days > 0) {
				value = rtf.format(0 - days, 'day');
			} else if (hours > 0) {
				value = rtf.format(0 - hours, 'hour');
			} else if (minutes > 0) {
				value = rtf.format(0 - minutes, 'minute');
			} else {
				value = rtf.format(0 - diff, 'second');
			}
			return value;
		},
		getSeries(ID) {
			return this.series.find((x) => x.ID == ID);
		},
	},
};
</script>
<style lang=""></style>
