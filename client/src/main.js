import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

const networkingPlugin = {
    install: (app, options) => {
        const aBase = location.hostname == 'localhost' ? 'http://localhost:3100' : 'http://0dba-2003-df-8742-fec9-2996-e4f7-5ceb-629a.ngrok.io'
        app.config.globalProperties.$networking = new Networking(aBase, '');
    }
}

const app = createApp(App);
app.use(VueSweetalert2);
app.use(autoAnimatePlugin);
app.use(networkingPlugin)
app.use(store);
app.use(router);

store.$networking = app.config.globalProperties.$networking;
app.mount('#app');
