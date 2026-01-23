import './assets/styles/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { notificationService } from './services/notificationService'

const app = createApp(App)
app.use(router)
app.mount('#app')

router.isReady().then(() => {
    notificationService.initializeIfLoggedIn().catch(error => {
        console.error(error);
    })
})
