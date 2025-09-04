import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forzar puerto único en 3000. Evita que otros scripts cambien el puerto.
    port: 3000,
    host: '0.0.0.0'
  }
})
