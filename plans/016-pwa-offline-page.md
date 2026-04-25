<!-- Last Audit: 2026-04-25 -->
# Plan-016: PWA Offline Fallback Page

**Status**: Proposed
**Date**: 2026-04-25
**Deciders**: Architect, PWA Agent

## Objective

Create a branded offline fallback page instead of serving the generic app shell when offline.

## Current State

In `public/sw.js`, navigation fetch failures fall back to `/index.html`:
```javascript
.catch(async () => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  return caches.match('/index.html'); // Generic fallback
})
```

This causes:
- App shell renders without data
- Confusing empty states
- No clear "you are offline" messaging

## Proposed Solution

Create `public/offline.html` — a standalone, self-contained offline page.

### Design Requirements

- **No external dependencies**: All CSS inline, no JS modules
- **Branded**: Uses app colors and logo from `app.config.ts`
- **Informative**: Clear offline message + last sync time (if available)
- **Actionable**: "Retry" button to attempt reconnect
- **Lightweight**: < 5KB total

### Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>d.o. Gist Hub — Offline</title>
  <style>
    /* Inline critical CSS */
    :root { --primary: #2563eb; --bg: #f8fafc; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0f172a; --text: #f1f5f9; }
    }
    /* ... minimal styles ... */
  </style>
</head>
<body>
  <main>
    <h1>d.o. Gist Hub</h1>
    <p>You are currently offline.</p>
    <p id="last-sync">Last synced: <span>Unknown</span></p>
    <button onclick="location.reload()">Retry</button>
  </main>
  <script>
    // Read last sync time from IndexedDB if possible
    // Otherwise show "Unknown"
  </script>
</body>
</html>
```

### Service Worker Integration

Update `sw.js` navigation handler:
```javascript
.catch(async () => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;
  return caches.match('/offline.html'); // Branded fallback
})
```

### Precache

Add `offline.html` to `PRECACHE_ASSETS`:
```javascript
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html', // NEW
  '/manifest.webmanifest',
  // ...
];
```

## Tradeoffs

### Pros
- Clearer user experience when offline
- Branded experience maintains trust
- Minimal size impact (~2KB)
- Works without any JS framework

### Cons
- Additional file to maintain
- Style drift risk (must stay consistent with app)
- Cannot access IndexedDB for last sync (cross-origin restrictions in some contexts)

## Implementation Steps

1. Create `public/offline.html` with inline styles
2. Extract theme color from `app.config.ts` at build time
3. Update `sw.js` to fallback to `offline.html`
4. Add `offline.html` to precache list
5. Test offline behavior in Chrome DevTools

## Rollback Triggers

- Offline page causes caching issues
- Users prefer the app shell fallback
- Maintenance burden exceeds value

## References

- `public/sw.js` — current service worker
- `src/config/app.config.ts` — theme color source
- Google Web Fundamentals: [The Offline Cookbook](https://web.dev/offline-cookbook/)

---

*Created: 2026-04-25. Status: Proposed.*
