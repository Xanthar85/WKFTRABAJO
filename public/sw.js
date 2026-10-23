// public/sw.js
// WKF — Service Worker para instalación PWA y funcionamiento offline.
// v1.052: precache robusto del index.html, fail-safe en fetch,
// sin Response.error(). Aviso de actualización vía postMessage.

const CACHE_NAME = 'wkf-v6';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/wkf-icon.svg',
  '/icons/apple-touch-icon.png',
];

// HTML mínimo de fallback. Nunca se queda en negro.
const OFFLINE_HTML = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0A0A0A">
<title>WKF — Sin conexión</title>
<style>
  html,body{margin:0;height:100%;background:#0A0A0A;color:#E8E8E8;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
  .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;
    padding:24px;text-align:center;flex-direction:column;gap:16px;}
  h1{font-size:1.2rem;margin:0;color:#00E56A;}
  p{margin:0;font-size:.95rem;color:#9A9A9A;max-width:320px;line-height:1.5;}
  button{background:#00E56A;color:#0A0A0A;border:0;border-radius:8px;
    padding:12px 20px;font-weight:600;font-size:1rem;cursor:pointer;}
</style></head>
<body><div class="wrap">
  <h1>WKF</h1>
  <p>No hay conexión y la app no tiene copia en caché todavía.
     Conéctate una vez para que WKF se guarde y funcione offline.</p>
  <button onclick="location.reload()">Reintentar</button>
</div></body></html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precacheamos uno a uno para que un fallo de un icono
      // no bloquee el resto. El index.html es OBLIGATORIO.
      const criticos = ['/', '/index.html', '/manifest.webmanifest'];
      for (const url of PRECACHE_ASSETS) {
        try {
          await cache.add(url);
        } catch (err) {
          if (criticos.includes(url)) {
            // Si falla un crítico, la instalación falla y el SW
            // no se activa. Así el siguiente intento lo reintenta.
            throw err;
          }
          // Un icono que falla no rompe la PWA.
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
      )
    )
  );
  self.clients.claim();
});

// Aviso a las pestañas abiertas de que hay una versión nueva lista.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Manifest: network-first.
  if (url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copia));
          return res;
        })
        .catch(() => caches.match(event.request).then((r) => r || new Response('{}', { headers: { 'Content-Type': 'application/manifest+json' } })))
    );
    return;
  }

  // Navegación (documentos HTML): network-first con fallback a caché
  // y, si no hay caché, al HTML de "Sin conexión". NUNCA Response.error().
  if (
    event.request.mode === 'navigate' ||
    (event.request.method === 'GET' &&
      event.request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => res)
        .catch(async () => {
          const cached = await caches.match('/index.html');
          if (cached) return cached;
          return new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // APIs externas: red directa con fallback a caché si existe.
  if (
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('nominatim')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((r) => r || new Response('', { status: 504 }))
      )
    );
    return;
  }

  // App shell / recursos estáticos: stale-while-revalidate.
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