import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const apiTarget = process.env.MONITOR_API_TARGET || 'http://127.0.0.1:8200'
const distributorApiTarget = process.env.DISTRIBUTOR_API_TARGET || 'http://127.0.0.1:8210'
const submitterApiTarget = process.env.SUBMITTER_API_TARGET || 'http://127.0.0.1:8500'
const minioTarget = process.env.MINIO_TARGET || 'http://120.53.92.66:9000'

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
      '/monitor/distributor-api': {
        target: distributorApiTarget,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor\/distributor-api/, '/api'),
      },
      '/monitor/submitter-api': {
        target: submitterApiTarget,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor\/submitter-api/, '/api'),
      },
      '/monitor/minio': {
        target: minioTarget,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/monitor\/minio/, ''),
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
