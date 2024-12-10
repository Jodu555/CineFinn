<template>
	<div>
		<div class="card text-start">
			<pre v-if="settings.developerMode.value">
				{{ { room: room, ago: ago, series: getSeries(room.seriesID) } }}
			</pre
			>
			<div class="card-body">
				<h4 class="card-title">{{ getSeries(room.seriesID)?.title }}</h4>
				<p class="card-text">Opend: {{ ago }} with {{ room.members?.length || 0 }} {{ room.members?.length == 1 ? 'user' : 'users' }}</p>
				<button class="btn btn-outline-success" @click="joinRoom(room.ID)">Join</button>
			</div>
		</div>
	</div>
</template>
<script lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useIndexStore } from '@/stores/index.store';
import { useSyncStore } from '@/stores/sync.store';
import type { DatabaseParsedSyncRoomItem } from '@Types/database';
import { mapWritableState, mapActions } from 'pinia';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		room: { type: Object as PropType<DatabaseParsedSyncRoomItem>, required: true },
	},
	data() {
		return {
			ago: '',
			interval: null as unknown as NodeJS.Timeout,
		};
	},
	mounted() {
		this.ago = this.timeAgo(new Date(Number(this.room.created_at)));
		this.interval = setInterval(() => {
			this.ago = this.timeAgo(new Date(Number(this.room.created_at)));
		}, 5000);
	},
	unmounted() {
		clearInterval(this.interval);
	},
	computed: {
		...mapWritableState(useIndexStore, ['series']),
		...mapWritableState(useAuthStore, ['settings']),
	},
	methods: {
		...mapActions(useSyncStore, ['joinRoom']),
		timeAgo(timestamp: Date, locale = 'en') {
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
				value = rtf.format(parseInt(String(0 - diff)), 'second');
			}
			return value;
		},
		getSeries(ID: string) {
			return this.series.find((x) => x.ID == ID);
		},
	},
});
</script>
<style lang=""></style>
