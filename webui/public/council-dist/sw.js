// AI Council Chamber — Service Worker
// Provides offline support via cache-first for assets, network-first for API

const CACHE_NAME = 'ai-council-v1';
const STATIC_CACHE = 'ai-council-static-v1';
const DYNAMIC_CACHE = 'ai-council-dynamic-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        return cache.addAll(PRECACHE_ASSETS).catch(err => {
          console.warn('[SW] Precache failed, continuing:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - Cache-first for static assets (JS, CSS, fonts, images, icons)
// - Network-first for API calls and navigation
// - Stale-while-revalidate for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except CDN assets)
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('cdn') &&
      !url.hostname.includes('fonts.googleapis') &&
      !url.hostname.includes('fonts.gstatic')) {
    return;
  }

  // Navigation requests → network-first (always try to get fresh HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache fresh copy
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('/index.html')
          )
        )
    );
    return;
  }

  // Static assets (JS, CSS, fonts, images, icons) → cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|webp|svg|ico|webmanifest)$/) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => {
          // Fallback for images
          if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
            return new Response('', { status: 200 });
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // API calls → network-first with stale-while-revalidate fallback
  if (url.pathname.startsWith('/api/') || url.hostname.includes('gemini') || url.hostname.includes('google')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Everything else → stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.delete(STATIC_CACHE).then(() => caches.delete(DYNAMIC_CACHE));
  }
});

// Background sync for offline deliberation queue (future)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-deliberations') {
    event.waitUntil(
      // Re-play queued deliberations when back online
      Promise.resolve()
        .then(() => console.log('[SW] Syncing offline deliberations...'))
    );
  }
});
