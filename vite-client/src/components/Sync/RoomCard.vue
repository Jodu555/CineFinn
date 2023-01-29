<template>
	<div>
		<div class="card text-start">
			<div class="card-body">
				<h4 class="card-title">{{ getSeriesName(room.seriesID) }}</h4>
				<p class="card-text">Opend: {{ timeAgo(new Date(room.created)) }} with {{ Object.keys(room.members).length }} users</p>
				<button class="btn btn-outline-success">Join</button>
			</div>
		</div>
	</div>
</template>
<script>
import { mapState } from 'vuex';

export default {
	props: ['room'],
	computed: {
		...mapState(['series']),
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
		getSeriesName(ID) {
			return this.series.find((x) => x.ID == ID).title;
		},
	},
};
</script>
<style lang=""></style>
