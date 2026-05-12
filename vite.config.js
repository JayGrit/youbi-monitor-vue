import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/monitor/',
  build: { outDir: 'dist/monitor' },
  server: {
    host: '0.0.0.0',
    port: 8300,
    proxy: {
      '/monitor/api': {
        target: 'http://127.0.0.1:8200',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor\/api/, '/api'),
      },
      '/health': {
        target: 'http://127.0.0.1:8200',
        changeOrigin: true,
      },
    },
  },
})
