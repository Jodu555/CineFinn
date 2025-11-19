<template>
	<div>
		<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasSettings" aria-labelledby="offcanvasSettingsLabel">
			<div class="offcanvas-header">
				<h5 class="offcanvas-title" id="offcanvasSettingsLabel">Infos - Settings</h5>
				<button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
			</div>
			<div class="offcanvas-body">
				<h2>User Infos:</h2>
				<pre v-if="authStore.user.settings.deleveloperMode">{{ authStore.user }}</pre>
				<hr />
				<ul class="list-group list-group-flush mb-2" style="background: transparent">
					<li class="list-group-item">
						<h5>
							<b>Username:</b> <span class="text-secondary">{{ authStore.user.username }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>E-Mail:</b> <span class="text-secondary">{{ authStore.user.email }}</span>
						</h5>
					</li>
					<li class="list-group-item">
						<h5>
							<b>Rolle:</b> <span class="text-secondary">{{ roleIDToName(authStore.user.role) }}</span>
						</h5>
					</li>
				</ul>
				<template v-if="authStore.user.role > 1">
					<h2>Jobs</h2>
					<pre
						>{{ data }}
					</pre
					>
				</template>
			</div>
		</div>
	</div>
</template>
<script setup lang="ts">
import useAPIURL from '~/hooks/useAPIURL';

const authStore = useAuthStore();
onMounted(() => {
	console.log('SettingsDrawer mounted');
	console.log(authStore.user);
});

const { data, status, refresh, error } = useFetch(`${useAPIURL()}/managment/jobs/info`, {
	headers: {
		'auth-token': authStore.authToken,
	},
});

function roleIDToName(id: number) {
	switch (id) {
		case 1:
			return 'User';
		case 2:
			return 'Moderator';
		case 3:
			return 'Administrator';
		default:
			return 'Unknown Role';
	}
}
</script>
<style></style>
