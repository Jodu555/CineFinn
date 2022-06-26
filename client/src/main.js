import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

const app = createApp(App);
app.use(VueSweetalert2);
app.use(autoAnimatePlugin);
app.use(store);
app.use(router);

store.$app = app;
store.$networking = app.config.globalProperties.$networking;

app.mount('#app');
