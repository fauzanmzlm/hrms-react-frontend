import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// The Go backend sends no CORS headers, so the browser only ever talks to the
// Vite origin and these paths are forwarded to the API.
const proxiedPaths = ['/api', '/healthz', '/readyz']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:8080'
  const proxy = Object.fromEntries(
    proxiedPaths.map((path) => [path, { target, changeOrigin: true }]),
  )

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  }
})
