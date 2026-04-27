import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
          'vendor-ui': ['element-plus', '@element-plus/icons-vue'],
          'vendor-table': ['vxe-table', 'xe-utils'],
          'vendor-charts': ['echarts', 'vue-echarts'],
          'vendor-excel': ['xlsx', 'file-saver'],
          // View chunks (large views)
          'view-indicator': ['./src/views/IndicatorCenter.vue'],
          'view-target': ['./src/views/TargetManagement.vue'],
          'view-import': ['./src/views/DataImport.vue']
        }
      }
    }
  }
})
