import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The API serves the build from its STATIC_DIR (presentation_api/public) and the socket on the same port
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: { '/socket.io': { target: 'http://localhost:9632', ws: true } },
  },
  build: { outDir: '../presentation_api/public', emptyOutDir: true },
})
