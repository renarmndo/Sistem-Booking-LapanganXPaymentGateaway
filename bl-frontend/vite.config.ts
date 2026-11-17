import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindCss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindCss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
    },
  },
})
