import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Same-origin API calls in development so the auth cookie is first-party.
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
      },
    },
  }
})
