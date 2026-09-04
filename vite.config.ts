import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, type Plugin } from 'vite'
import { createReadStream, copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const BERGAMOT_WORKER_DIR = resolve('node_modules/@browsermt/bergamot-translator/worker')
const BERGAMOT_WORKER_FILES = [
  'translator-worker.js',
  'bergamot-translator-worker.js',
  'bergamot-translator-worker.wasm',
] as const

const bergamotContentType = (fileName: string): string => {
  if (fileName.endsWith('.wasm')) return 'application/wasm'
  return 'text/javascript'
}

const serveBergamotWorkers = (): Plugin => ({
  name: 'serve-bergamot-workers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const fileName = BERGAMOT_WORKER_FILES.find((name) => req.url?.split('?')[0] === `/bergamot/${name}`)
      if (!fileName) {
        next()
        return
      }
      res.setHeader('Content-Type', bergamotContentType(fileName))
      createReadStream(join(BERGAMOT_WORKER_DIR, fileName)).on('error', () => {
        res.statusCode = 404
        res.end('Not found')
      }).pipe(res)
    })
  },
  closeBundle() {
    const destination = resolve('dist/bergamot')
    mkdirSync(destination, { recursive: true })
    for (const fileName of BERGAMOT_WORKER_FILES) {
      copyFileSync(join(BERGAMOT_WORKER_DIR, fileName), join(destination, fileName))
    }
  },
})

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
  plugins: [react(), tailwindcss(), basicSsl(), serveBergamotWorkers(), stampServiceWorker()],
  optimizeDeps: {
    include: ['microsoft-cognitiveservices-speech-sdk'],
  },
  server: {
    host: true, // 모바일 및 로컬 네트워크 접속 허용
    port: 5173,
    proxy: {
      '/api/bergamot-models': {
        target: 'https://storage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(
          /^\/api\/bergamot-models/,
          '/moz-fx-translations-data--303e-prod-translations-data'
        ),
      },
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
