import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const stampServiceWorker = () => ({
  name: 'stamp-service-worker-cache',
  apply: 'build' as const,
  closeBundle() {
    const serviceWorkerPath = resolve('dist/sw.js')
    const source = readFileSync(serviceWorkerPath, 'utf8')
    const assets = readdirSync(resolve('dist/assets')).map((fileName) => `/assets/${fileName}`)
    const stamped = source
      .replaceAll('__BUILD_ID__', Date.now().toString())
      .replace('/* __PRECACHE_ASSETS__ */', assets.map((asset) => JSON.stringify(asset)).join(', '))
    writeFileSync(serviceWorkerPath, stamped, 'utf8')
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl(), stampServiceWorker()],
  server: {
    host: true, // 모바일 및 로컬 네트워크 접속 허용
    port: 5173,
    proxy: {
      '/api/translate': {
        target: 'https://translate.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/translate/, '/translate_a/single'),
      },
    },
  },
})
