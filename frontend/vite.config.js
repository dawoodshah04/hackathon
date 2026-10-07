import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Must match the backend's PORT (backend/.env). Defaults to the backend's default port.
  const { VITE_PROXY_TARGET } = loadEnv(mode, process.cwd())

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target: VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
      },
    },
  }
})
