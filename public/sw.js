/**
 * Service Worker for PWA offline support
 * Uses cache-first strategy for app shell, network-first for navigation
 *
 * NOTE: Cache names are derived from src/config/app.config.ts.
 * When the app id changes, update CACHE_NAME, STATIC_CACHE, and API_CACHE
 * to match APP.cacheName, APP.staticCacheName, APP.apiCacheName.
 */

const CACHE_NAME = 'd-o-gist-hub-v1';
const STATIC_CACHE = 'd-o-gist-hub-static-v1';
const API_CACHE = 'd-o-gist-hub-api-v1';

// Assets to precache (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
];

/**
 * Install event - precache static assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Navigation requests - Network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for offline use
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // Fallback to cache when offline
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          
          // Return branded offline fallback page
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // GitHub API requests - Network first with cache fallback
  if (url.origin === 'https://api.github.com') {
    // Only cache GET requests
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Don't cache errors
            if (!response.ok) return response;
            
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
            return response;
          })
          .catch(async () => {
            return caches.match(request);
          })
      );
    }
    return;
  }

  // Static assets (CSS, JS, images) - Cache first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          return fetch(request)
            .then((response) => {
              // Don't cache non-successful responses
              if (!response.ok) return response;
              
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
              return response;
            });
        })
    );
    return;
  }

  // Default - Network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

/**
 * Message handler - allow cache clearing from client
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
