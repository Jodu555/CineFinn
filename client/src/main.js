import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import { io } from 'socket.io-client';

import 'bootstrap'

const serverURL = location.hostname == 'localhost' ? 'http://localhost:3100' : 'http://cinema-api.jodu555.de';


const socketPlugin = {
    install: (app, options) => {
        app.config.globalProperties.$socket = io(serverURL);
    }
}

const networkingPlugin = {
    install: (app, options) => {
        app.config.globalProperties.$networking = new Networking(serverURL, '');
    }
}

const app = createApp(App);

app.use(socketPlugin);

const socket = app.config.globalProperties.$socket;

socket.on('connect_error', async (err) => {
    console.log('Socket Connect Error: ', err.message); // prints the message associated with the error
    if (err.message.includes('Authentication'))
        await store.dispatch('auth/authenticate', true);
});

socket.on('connect', () => {
    console.log('Socket Connect Success');
})

app.use(VueSweetalert2);
app.use(autoAnimatePlugin);
app.use(networkingPlugin)
app.use(store);
app.use(router);

store.$networking = app.config.globalProperties.$networking;
store.$socket = app.config.globalProperties.$socket;
app.mount('#app');
