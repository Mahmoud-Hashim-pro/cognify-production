const CACHE_NAME = 'cognify-v13-clean-cache';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Strictly ignore all non-GET and cross-origin requests (fonts, analytics, CDN, APIs).
  // Letting the browser handle these natively avoids Service Worker Fetch CSP conflicts.
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 2. Skip internal backend endpoints
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Network-first for navigation requests with offline fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // 4. Cache-first for static immutable assets with strict HTML MIME guard
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        // Self-heal: If cached asset was corrupted with an HTML response, purge it immediately
        if (cached) {
          const contentType = cached.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            return cached;
          }
          const cache = await caches.open(CACHE_NAME);
          await cache.delete(request);
        }

        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const contentType = response.headers.get('content-type') || '';
            // Only cache valid assets, NEVER cache HTML fallback under /assets/
            if (!contentType.includes('text/html')) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
          }
          return response;
        }).catch(async () => {
          const fallback = await caches.match(request);
          return fallback || new Response('Asset unavailable', { status: 404, headers: { 'Content-Type': 'text/plain' } });
        });
      })
    );
    return;
  }

  // 5. Default network-falling-back-to-cache with guaranteed Response object
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response('Network unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    })
  );
});