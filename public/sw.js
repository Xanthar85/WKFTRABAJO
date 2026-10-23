// public/sw.js
// WKF — Service Worker para instalación PWA y funcionamiento offline.
// v1.047: cache bumpeada, manifest en network-first, offline fallback.
const CACHE_NAME = 'wkf-v5';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/wkf-icon.svg',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Ignorar fallos de precache para no bloquear la instalación
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Manifest: network-first para que Samsung vea siempre el último.
  if (url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copia));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Navegación (documentos HTML): network-first con fallback a cache.
  // Garantiza que al abrir la PWA instalada se sirve el index actualizado
  // si hay red, y el cacheado si no.
  if (
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      event.request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // NO cacheamos el index.html. Solo lo servimos de red.
          // Así nunca se sirve un index.html con hashes de assets
          // que ya no existen en el servidor.
          return res;
        })
        .catch(() =>
          caches.match('/index.html').then((r) => r || Response.error())
        )
    );
    return;
  }

  // APIs externas: red directa con fallback a cache si existe
  if (
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('nominatim')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell / recursos estáticos: Cache con stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
// public/sw.js