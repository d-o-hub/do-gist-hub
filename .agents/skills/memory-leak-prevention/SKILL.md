---
name: memory-leak-prevention
description: Prevent memory leaks via AbortController, lifecycle cleanup, bounded listeners, and proper resource disposal.
version: '0.1.0'
template_version: '0.1.0'
---

# Memory-leak-prevention Skill

Prevent memory leaks through systematic cleanup of all resources.

## When to Use

- Implementing async operations
- Adding event listeners or timers
- Creating observers (IntersectionObserver, ResizeObserver)
- Building route components
- Managing caches

## Memory Leak Patterns

### 1. Uncleaned Event Listeners

```typescript
// BAD: Listener never removed
window.addEventListener('resize', handleResize);

// GOOD: Proper cleanup
class ResizeHandler {
  private boundHandler: () => void;

  constructor() {
    this.boundHandler = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundHandler);
  }

  destroy() {
    window.removeEventListener('resize', this.boundHandler);
  }
}
```

### 2. Abandoned AbortControllers

```typescript
// BAD: Fetch cannot be cancelled
const response = await fetch(url);

// GOOD: Cancelable fetch
class FetchService {
  private controller: AbortController | null = null;

  async fetch(url: string): Promise<Response> {
    this.controller?.abort();
    this.controller = new AbortController();

    return fetch(url, { signal: this.controller.signal });
  }

  cancel() {
    this.controller?.abort();
    this.controller = null;
  }
}
```

### 3. Timer Leaks

```typescript
// BAD: Interval never cleared
setInterval(poll, 5000);

// GOOD: Managed timer
class Poller {
  private intervalId: number | null = null;

  start() {
    this.stop(); // Clear existing
    this.intervalId = window.setInterval(this.poll.bind(this), 5000);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  destroy() {
    this.stop();
  }
}
```

### 4. Retained Large Objects

```typescript
// BAD: Keeping large file bodies in memory
const gistCache = new Map<string, Gist>();

// GOOD: Bounded cache with eviction
class BoundedCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: string): T | undefined {
    return this.cache.get(key)?.value;
  }

  clear(): void {
    this.cache.clear();
  }
}
```

## Route Lifecycle Cleanup

```typescript
// src/lib/cleanup/route-cleanup.ts
interface Disposable {
  destroy(): void;
}

const disposables: Disposable[] = [];

export function registerDisposable(disposable: Disposable): void {
  disposables.push(disposable);
}

export function onRouteLeave(): void {
  disposables.forEach(d => d.destroy());
  disposables.length = 0;
}
```

## Observer Cleanup

```typescript
// BAD: Observer never disconnected
const observer = new IntersectionObserver(callback);
observer.observe(element);

// GOOD: Managed observer
class ManagedObserver {
  private observer: IntersectionObserver;
  private observedElements = new Map<Element, () => void>();

  constructor(callback: IntersectionObserverCallback) {
    this.observer = new IntersectionObserver(callback);
  }

  observe(element: Element) {
    this.observer.observe(element);
    this.observedElements.set(element, () => {
      this.observer.unobserve(element);
    });
  }

  destroy() {
    this.observedElements.forEach((cleanup) => cleanup());
    this.observedElements.clear();
    this.observer.disconnect();
  }
}
```

## Blob URL Revocation

```typescript
// src/lib/cleanup/blob-urls.ts
const blobUrls = new Set<string>();

export function createBlobURL(blob: Blob): string {
  const url = URL.createObjectURL(blob);
  blobUrls.add(url);
  return url;
}

export function revokeBlobURL(url: string): void {
  URL.revokeObjectURL(url);
  blobUrls.delete(url);
}

export function revokeAllBlobURLs(): void {
  blobUrls.forEach(url => URL.revokeObjectURL(url));
  blobUrls.clear();
}
```

## Gotchas

- **No Retained Bodies**: Clear gist file content when navigating away
- **Single Cache**: Avoid duplicate caches for same content
- **Bounded Listeners**: No unbounded event listener accumulation
- **Editor Cleanup**: Clear syntax highlighter and editor model instances
- **Service Worker Messaging**: Clean up message channels
- **Weak References**: Use WeakMap/WeakRef when appropriate
- **Cyclic References**: Break cycles in destroy() methods

## Required Outputs

- `src/lib/cleanup/route-cleanup.ts` - Route lifecycle manager
- `src/lib/cleanup/blob-urls.ts` - Blob URL tracker
- `src/services/github/fetch-with-auth.ts` - Cancelable fetch
- Bounded cache implementation
- Observer cleanup utilities
- Component destroy() methods

## Verification

```bash
# Memory profile in DevTools
# Check for detached DOM nodes
# Verify no growing heap in Performance tab

# Run memory leak tests
npm run test

# Check for unclosed resources
npm run lint
```

## References

- https://developer.mozilla.org/en-US/docs/Web/API/AbortController - AbortController API
- https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver - IntersectionObserver
- `AGENTS.md` - Memory leak prevention rules
- `offline-indexeddb` skill - IndexedDB connection management
