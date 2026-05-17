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

// Cache entry TTL: 30 days in milliseconds
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function addTimestampToResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('x-cache-timestamp', Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isResponseExpired(response: Response): boolean {
  const timestamp = response.headers.get('x-cache-timestamp');
  if (!timestamp) return true;
  return Date.now() - Number(timestamp) > CACHE_MAX_AGE_MS;
}

async function cleanExpiredEntries(cacheName: string): Promise<void> {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();
  const deletePromises: Promise<boolean>[] = [];
  for (const request of requests) {
    const response = await cache.match(request);
    if (response && isResponseExpired(response)) {
      deletePromises.push(cache.delete(request));
    }
  }
  await Promise.all(deletePromises);
}

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
 * Activate event - clean up old caches and expired entries
 * - Deletes entire caches not matching the current STATIC_CACHE name
 * - Uses build-timestamp cache naming for version-based eviction
 * - Evicts individual entries older than 30 days (TTL-based cleanup)
 */
swSelf.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        const deleteOldCaches = cacheNames
          .filter((name) => name !== STATIC_CACHE)
          .map((name) => caches.delete(name));
        return Promise.all([...deleteOldCaches, cleanExpiredEntries(STATIC_CACHE)]);
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

  // CSP violation reports (plan 038 F2) — redact and return 204
  if (url.pathname === '/csp-report' && request.method === 'POST') {
    event.respondWith(
      request.text().then((body) => {
        try {
          const report = JSON.parse(body);
          const redacted = {
            'document-uri': report['csp-report']?.['document-uri']?.substring(0, 40),
            'violated-directive': report['csp-report']?.['violated-directive'],
            'blocked-uri': report['csp-report']?.['blocked-uri']?.substring(0, 40),
          };
          console.warn('[CSP Violation]', redacted);
        } catch {
          console.warn('[CSP Violation] <unparseable report>');
        }
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
          const timestampedResponse = addTimestampToResponse(responseClone);
          caches
            .open(STATIC_CACHE)
            .then((cache) => {
              cache.put(request, timestampedResponse).catch(() => {});
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
          const timestampedResponse = addTimestampToResponse(responseClone);
          caches
            .open(STATIC_CACHE)
            .then((cache) => {
              cache.put(request, timestampedResponse).catch(() => {});
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
