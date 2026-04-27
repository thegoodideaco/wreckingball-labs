import '@/assets/styles.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

/**
 * import dev tools in development mode only
 * this will not be included in the production build
 * and will not affect performance in production
 */
if (import.meta.env.DEV) {
  import('./dev').then((module) => {
    app.config.globalProperties.$dev = module.default

    Object.assign(window, {
      dev: module.default,
    })
  })
}

app.use(createPinia())
app.use(router)

app.mount('#app')
