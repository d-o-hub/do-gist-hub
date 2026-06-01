---
name: pwa-shell
description: Configure PWA with service worker for offline caching, installability, and reliable offline-first behavior.
version: '0.1.0'
template_version: '0.1.0'
---

# Pwa-shell Skill

Set up Progressive Web App with service worker for offline caching and installability.

## When to Use

- Initial PWA configuration
- Service worker setup
- Adding offline support
- Configuring app manifest
- Optimizing for installability

## Web App Manifest

```json
// public/manifest.json
{
  "name": "Gist Hub",
  "short_name": "GistHub",
  "description": "A production-ready GitHub Gist CRUD app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "developer tools"],
  "shortcuts": [
    {
      "name": "New Gist",
      "short_name": "New",
      "description": "Create a new gist",
      "url": "/new",
      "icons": [{ "src": "/icons/new-gist.png", "sizes": "96x96" }]
    }
  ]
}
```

## Service Worker Strategy

```typescript
// src/sw.ts - Using Workbox
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache shell - Network First with cache fallback
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

// Cache API responses - Stale While Revalidate
registerRoute(
  ({ url }) => url.origin === 'https://api.github.com',
  new StaleWhileRevalidate({
    cacheName: 'api-responses',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  }),
);

// Cache icons and images - Cache First
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);
```

## Service Worker Registration

```typescript
// src/lib/pwa/register-sw.ts
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available, prompt user to refresh
          notifyUpdateAvailable();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}
```

## Vite PWA Plugin

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Gist Hub',
        short_name: 'GistHub',
        description: 'A production-ready GitHub Gist CRUD app',
        theme_color: '#2563eb',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    }),
  ],
});
```

## Gotchas

- **Cache Strategy**: Shell = Network First, API = Stale While Revalidate, Images = Cache First
- **Update Flow**: Prompt user when new service worker is available
- **Offline Fallback**: Provide offline page when network unavailable
- **Scope**: Service worker scope must cover entire app
- **HTTPS Required**: Service workers only work on HTTPS or localhost
- **IndexedDB First**: PWA cache is secondary to IndexedDB source of truth
- **Clear Cache**: Provide mechanism to clear cache and re-sync

## Required Outputs

- `public/manifest.json` - Web app manifest
- `src/sw.ts` or `public/sw.js` - Service worker
- `src/lib/pwa/register-sw.ts` - Registration logic
- `vite.config.ts` - Vite PWA plugin configuration
- `public/icons/` - App icons (192x192, 512x512 minimum)

## Verification

```bash
# Build and preview
npm run build
npm run preview

# Check PWA in Lighthouse
npx lighthouse http://localhost:4173 --output=json

# Test offline behavior
npm run test:offline
```

## Modern Web API Integrations

Beyond the service worker, a 2026 PWA can adopt several browser APIs to feel native. Reference implementation: `src/services/pwa/capabilities.ts` in this repo.

### Install Prompt (`beforeinstallprompt`)

Capture the event at app init and surface a deferred install CTA. Honor a 7-day dismissal cooldown.

```typescript
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  // Show install CTA in your nav
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  // Hide install CTA
});

async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome;
}
```

### Persistent Storage (`navigator.storage.persist`)

Critical for offline-first apps so IndexedDB isn't evicted under storage pressure. Request after first IndexedDB write.

```typescript
async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
```

### App Badge (`navigator.setAppBadge`)

Mirror pending operation counts (sync queue, notifications) to the PWA app icon.

```typescript
async function setSyncBadge(count: number): Promise<void> {
  if (!('setAppBadge' in navigator)) return;
  if (count <= 0) {
    await navigator.clearAppBadge?.();
  } else {
    await navigator.setAppBadge(count);
  }
}
```

### Web Share (`navigator.share`)

Mobile share-sheet integration. Always provide a clipboard fallback for unsupported browsers.

```typescript
async function share(data: ShareData): Promise<void> {
  if ('share' in navigator) {
    try {
      await navigator.share(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      await navigator.clipboard.writeText(data.url ?? '');
    }
  } else {
    await navigator.clipboard.writeText(data.url ?? '');
  }
}
```

## References

- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices
- https://capacitorjs.com/docs/web/progressive-web-apps - PWA + Capacitor
- https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API - persistent storage
- https://developer.mozilla.org/en-US/docs/Web/API/Badging_API
- `AGENTS.md` - PWA and offline-first rules
- `offline-indexeddb` skill - Primary offline storage
