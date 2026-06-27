---
name: pwa-shell
description: Configure PWA with service worker for offline caching and installability.
version: '0.2.1'
template_version: '0.2.1'
---

# Pwa-shell Skill

Set up Progressive Web App with service worker for offline caching and installability.

## When to Use
- Initial PWA configuration, service worker setup, adding offline support, and optimizing for installability.

## Web App Manifest (public/manifest.json)
```json
{
  "name": "Gist Hub",
  "short_name": "GistHub",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

## Service Worker Strategy (src/sw.ts)
Use Workbox for precaching and runtime caching (NetworkFirst for pages, StaleWhileRevalidate for API, CacheFirst for images).

## Service Worker Registration (src/lib/pwa/register-sw.ts)
Register `/sw.js` and handle `updatefound` to notify users of updates.

## Vite PWA Plugin (vite.config.ts)
```typescript
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
    manifest: { /* manifest config */ },
    workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'] }
  })]
});
```

## Modern Web API Integrations
- **Install Prompt**: Capture `beforeinstallprompt` to surface custom install CTA.
- **Persistent Storage**: Request `navigator.storage.persist()` for IndexedDB durability.
- **App Badge**: Use `navigator.setAppBadge` for pending sync counts.
- **Web Share**: Use `navigator.share` with clipboard fallback.

## Gotchas
- Scope must cover entire app. HTTPS required (or localhost). IndexedDB is source of truth.

## Verification
```bash
npm run build && npm run preview
npx lighthouse http://localhost:4173
npm run test:offline
```

## References
- MDN PWA Guides, Capacitor Web PWA, Badging API, `AGENTS.md`.
