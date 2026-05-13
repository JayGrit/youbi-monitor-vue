import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const apiTarget = process.env.MONITOR_API_TARGET || 'http://127.0.0.1:8200'

export default defineConfig({
  plugins: [vue()],
  base: '/monitor/',
  build: { outDir: 'dist/monitor' },
  server: {
    host: '0.0.0.0',
    port: 8300,
    proxy: {
      '/monitor/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor\/api/, '/api'),
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
