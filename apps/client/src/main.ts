import { createApp } from 'vue'
import { createPinia } from 'pinia';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/900.css';
import 'virtual:svg-icons-register';
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.use(createPinia());
app.mount('#app')
