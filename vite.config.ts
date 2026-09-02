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
    // Keep the large, rarely used billing guide lazy on mobile. Once visited,
    // the service worker's normal runtime cache still makes the chunk available
    // offline without downloading it during every first install or update.
    const assets = readdirSync(resolve('dist/assets'))
      .filter((fileName) => !fileName.startsWith('BillingPlanPage-'))
      .map((fileName) => `/assets/${fileName}`)
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
      '/api/azure-translate': {
        target: 'https://api.cognitive.microsofttranslator.com',
        changeOrigin: true,
        rewrite: (path) => {
          const incoming = new URL(path, 'https://likeparrot.local');
          const toAzureLanguage = (language: string | null) => {
            const normalized = language?.toLowerCase();
            if (normalized === 'zh-tw' || normalized === 'zh-hant') return 'zh-Hant';
            if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans') {
              return 'zh-Hans';
            }
            return language?.split('-')[0] ?? '';
          };
          const query = new URLSearchParams({
            'api-version': '3.0',
            from: toAzureLanguage(incoming.searchParams.get('from')),
            to: toAzureLanguage(incoming.searchParams.get('to')),
          });
          return `/translate?${query.toString()}`;
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyRequest, request) => {
            const authorization = String(request.headers.authorization ?? '');
            const apiKey = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
            if (apiKey) proxyRequest.setHeader('Ocp-Apim-Subscription-Key', apiKey);
            proxyRequest.removeHeader('authorization');
            const incoming = new URL(request.url ?? '', 'https://likeparrot.local');
            const region = incoming.searchParams.get('region')?.trim();
            if (region && region.toLowerCase() !== 'global') {
              proxyRequest.setHeader('Ocp-Apim-Subscription-Region', region);
            }
          });
        },
      },
    },
  },
})
