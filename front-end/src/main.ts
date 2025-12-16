import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { pinia } from './stores';
import './style.css';
import { useAuthStore } from './stores/authStore';
import { GraphQLProvider } from './apollo';
import vuetify from './plugins/vuetify';
import 'vuetify/styles';


const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(vuetify);

// Initialize data storage
const authStore = useAuthStore();
authStore.initAuth();

// Wrap application with Apollo Provider
app.use(GraphQLProvider);

app.mount('#app');

// Removed local storage initialization, now using GraphQL