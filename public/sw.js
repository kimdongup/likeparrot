const CACHE_PREFIX = 'likeparrot-';
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_ID__`;
const BUILD_ASSETS = [/* __PRECACHE_ASSETS__ */];
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app-icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/audio-capture-worklet.js',
  ...BUILD_ASSETS,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/index.html', response.clone());
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/index.html')) || Response.error();
        })
    );
    return;
  }

  const cacheableDestination = [
    'script',
    'audioworklet',
    'worker',
    'style',
    'image',
    'font',
    'manifest',
  ].includes(
    request.destination
  );
  if (!cacheableDestination) return;

  const update = fetch(request).then(async (response) => {
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  });
  event.waitUntil(update.then(() => undefined).catch(() => undefined));

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return update;
    })
  );
});
