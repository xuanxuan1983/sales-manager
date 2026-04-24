import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import VxeTable from 'vxe-table'
import 'vxe-table/lib/style.css'

import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)

// Element Plus with Chinese locale
app.use(ElementPlus, { locale: zhCn })

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}

// Pinia
app.use(createPinia())

// Router
app.use(router)

// VxeTable
app.use(VxeTable)

app.mount('#app')
