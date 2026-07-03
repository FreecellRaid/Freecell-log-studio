import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './styles/style.css';
import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
