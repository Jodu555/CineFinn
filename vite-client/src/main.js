import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';

/* import the fontawesome core */
import { library } from '@fortawesome/fontawesome-svg-core';

/* import font awesome icon component */
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import { autoAnimatePlugin } from '@formkit/auto-animate/vue';

import { io } from 'socket.io-client';

import 'bootstrap';

// const serverURL =
// 	location.hostname == 'localhost'
// 		? 'http://localhost:3100'
// 		: location.hostname == '192.168.178.26'
// 		? 'http://192.168.178.26:3100'
// 		: 'http://cinema-api.jodu555.de';

let serverURL;

if (location.hostname == 'localhost' || location.hostname.includes('192.168')) {
	serverURL = `http://${location.hostname}:3100`;
} else {
	serverURL = 'http://cinema-api.jodu555.de';
}

const socketPlugin = {
	install: (app, options) => {
		app.config.globalProperties.$socket = io(serverURL, { autoConnect: false });
	},
};

const networkingPlugin = {
	install: (app, options) => {
		app.config.globalProperties.$networking = new Networking(serverURL, '');
	},
};

const app = createApp(App);

app.use(socketPlugin);

const socket = app.config.globalProperties.$socket;

socket.on('connect_error', async (err) => {
	console.log('Socket Connect Error: ', err.message); // prints the message associated with the error
	if (err.message.includes('Authentication') && socket.auth.type !== 'rmvc-emitter') await store.dispatch('auth/authenticate', true);
});

socket.on('connect', () => {
	console.log('Socket Connect Success');
	if (socket.auth.type == 'client') store.dispatch('auth/authenticate');
});

import {
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
	faPlay,
	faPause,
	faNetworkWired,
} from '@fortawesome/free-solid-svg-icons';
import { faKeyboard } from '@fortawesome/free-regular-svg-icons';

library.add(
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
	faPause
); // solid
library.add(faKeyboard); // regular

app.component('font-awesome-icon', FontAwesomeIcon);

app.use(VueSweetalert2);
app.use(autoAnimatePlugin);
app.use(networkingPlugin);
app.use(store);
app.use(router);

store.$networking = app.config.globalProperties.$networking;
store.$socket = app.config.globalProperties.$socket;
app.mount('#app');
