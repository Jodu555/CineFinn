import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

const networkingPlugin = {
    install: (app, options) => {
        // app.config.globalProperties.$networking = new Networking('http://localhost:3100', '');
        app.config.globalProperties.$networking = new Networking('http://adad-2003-df-873d-f984-a870-b3cc-c44b-b4ef.ngrok.io', '');
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
