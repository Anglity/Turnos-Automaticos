import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3020,           // 1. PUERTO: Cambia aquí el puerto (3020, 5000, etc.)
    host: '0.0.0.0',      // 2. IP: '0.0.0.0' = todas las IPs, o pon IP específica como '192.168.1.100'
  }
})
