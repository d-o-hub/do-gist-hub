/// <reference lib="webworker" />
/**
 * Service Worker for PWA offline support
 * Uses cache-first strategy for app shell, network-first for navigation
 *
 * Generated at build time from TypeScript template.
 * Cache names are derived from src/config/app.config.ts.
 */

import { APP } from '../config/app.config';

const STATIC_CACHE = `${APP.staticCacheName}-__BUILD_TIMESTAMP__`;

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

// Type assertions for service worker global scope
const swSelf = self as unknown as ServiceWorkerGlobalScope;

/**
 * Install event - precache static assets
 */
swSelf.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => swSelf.skipWaiting())
  );
});

/**
 * Activate event - clean up old caches
 */
swSelf.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((name) => name !== STATIC_CACHE).map((name) => caches.delete(name))
        );
      })
      .then(() => swSelf.clients.claim())
  );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
swSelf.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // CSP violation reports (plan 038 F2) — log and return 204
  if (url.pathname === '/csp-report' && request.method === 'POST') {
    event.respondWith(
      request.text().then((body) => {
        console.warn('[CSP Violation]', body);
        return new Response(null, { status: 204 });
      })
    );
    return;
  }

  // Navigation requests - Network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            })
            .catch(() => {});
          return response;
        })
        .catch(async () => {
          // Serve offline fallback first when offline
          const offlineResponse = await caches.match('/offline.html');
          if (offlineResponse) return offlineResponse;

          // Fallback to cached response if offline.html not available
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;

          // Ultimate fallback
          return new Response('You are offline', { headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // GitHub API requests — never cache; always go to network
  if (url.origin === 'https://api.github.com') {
    event.respondWith(fetch(request));
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
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((response) => {
          if (!response.ok) return response;

          const responseClone = response.clone();
          caches
            .open(STATIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone).catch(() => {});
            })
            .catch(() => {});
          return response;
        });
      })
    );
    return;
  }

  // Default - Network first
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      return cached || new Response('Not found', { status: 404 });
    })
  );
});

/**
 * Message handler - allow cache clearing from client
 */
swSelf.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    void caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
      .then(() => {
        (event.ports[0] as MessagePort).postMessage({ success: true });
      });
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    void swSelf.skipWaiting();
  }
});

/**
 * Background Sync event - trigger sync when connection restored
 */
interface SyncEvent extends ExtendableEvent {
  tag: string;
}

swSelf.addEventListener('sync', ((event: Event) => {
  const syncEvent = event as unknown as SyncEvent;
  if (syncEvent.tag === 'sync-gists') {
    syncEvent.waitUntil(
      swSelf.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_GISTS' });
        });
      })
    );
  }
}) as EventListener);
