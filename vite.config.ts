import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Forward API calls to the backend that holds the Daikin tokens.
      '/api': 'http://localhost:3001',
    },
  },
})
