import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/forecast': 'http://127.0.0.1:8000',
      '/dates': 'http://127.0.0.1:8000',
      '/weights': 'http://127.0.0.1:8000',
      '/skill-scores': 'http://127.0.0.1:8000',
      '/extreme-guidance': 'http://127.0.0.1:8000',
      '/simulate-dropout': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})

