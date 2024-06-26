import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core';

import {
	faUpLong,
	faDownLong,
	faInfo,
	faForwardStep,
	faBackwardStep,
	faRightFromBracket,
	faGears,
	faChevronUp,
	faChevronDown,
	faForward,
	faBackward,
	faPen,
	faShare,
	faPlay,
	faPause,
	faNetworkWired,
	faTrash,
	faCheck,
	faChevronLeft,
	faChevronRight,
	faHighlighter,
} from '@fortawesome/free-solid-svg-icons';
import { faKeyboard } from '@fortawesome/free-regular-svg-icons';

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import { autoAnimatePlugin } from '@formkit/auto-animate/vue';

import 'bootstrap';

const app = createApp(App);
app.use(createPinia());
app.use(router);

library.add(
	faDownLong,
	faUpLong,
	faInfo,
	faForwardStep,
	faBackwardStep,
	faRightFromBracket,
	faGears,
	faChevronUp,
	faChevronDown,
	faForward,
	faBackward,
	faPen,
	faShare,
	faNetworkWired,
	faPlay,
	faPause,
	faTrash,
	faCheck,
	faChevronLeft,
	faChevronRight,
	faHighlighter
); // solid
library.add(faKeyboard); // regular

app.component('font-awesome-icon', FontAwesomeIcon);

app.use(VueSweetalert2);

import { type SweetAlertOptions } from 'sweetalert2';
import { socketPlugin, useSocket } from './utils/socket';
import { useAuthStore } from './stores/auth.store';
import { setApp } from './utils';

declare module 'vue' {
	interface ComponentCustomProperties {
		$swal: (options: SweetAlertOptions) => any;
	}
}
app.use(autoAnimatePlugin);

app.use(socketPlugin);
const socket = useSocket();

socket.on('connect_error', async (err) => {
	const auth = useAuthStore();
	console.log('Socket Connect Error: ', err.message); // prints the message associated with the error
	if (err.message.includes('Authentication') && socket.auth.type !== 'rmvc-emitter') await auth.authenticate(true);
});

socket.on('connect', () => {
	const auth = useAuthStore();
	console.log('Socket Connect Success');
	if (socket.auth.type == 'client') auth.authenticate();
});

app.mount('#app');

setApp(app);
