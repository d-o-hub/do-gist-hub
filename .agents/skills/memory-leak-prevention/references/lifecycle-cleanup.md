# Lifecycle Cleanup Patterns

Comprehensive guide to preventing memory leaks through systematic resource cleanup in the Gist Hub application.

## Cleanup Lifecycle Model

Every component and service in the app follows a three-phase lifecycle:

```
mount() → [active] → destroy()
```

During `mount()`, resources are acquired. During `destroy()`, every acquired resource must be released.

---

## Pattern 1: Disposable Interface

Define a common contract for anything that holds resources.

```typescript
// src/lib/cleanup/disposable.ts
export interface Disposable {
  destroy(): void;
}

// Registry for route-scoped disposables
class DisposableRegistry {
  private items: Disposable[] = [];

  register(item: Disposable): void {
    this.items.push(item);
  }

  destroyAll(): void {
    // Destroy in reverse order (LIFO)
    for (let i = this.items.length - 1; i >= 0; i--) {
      try {
        this.items[i].destroy();
      } catch (error) {
        // Log but continue destroying others
        console.error('[DisposableRegistry] Error during cleanup:', error);
      }
    }
    this.items = [];
  }

  get count(): number {
    return this.items.length;
  }
}

export const routeDisposables = new DisposableRegistry();
```

### Usage on Route Change

```typescript
// src/router.ts
async function navigateTo(path: string): Promise<void> {
  // 1. Clean up previous route's resources
  routeDisposables.destroyAll();

  // 2. Clear UI
  clearRouteContent();

  // 3. Load new route
  await loadRoute(path);
}
```

---

## Pattern 2: Event Listener Cleanup

### Class-Based Handler

```typescript
// src/lib/cleanup/event-listener.ts
export class EventListenerManager implements Disposable {
  private listeners: Array<{
    target: EventTarget;
    type: string;
    handler: EventListenerOrEventListenerObject;
    options?: AddEventListenerOptions;
  }> = [];

  add(
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, handler, options);
    this.listeners.push({ target, type, handler, options });
  }

  destroy(): void {
    for (const { target, type, handler, options } of this.listeners) {
      target.removeEventListener(type, handler, options);
    }
    this.listeners = [];
  }
}
```

### Usage

```typescript
// In a component
const listeners = new EventListenerManager();
routeDisposables.register(listeners);

listeners.add(window, 'resize', handleResize);
listeners.add(document, 'keydown', handleKeyDown);
listeners.add(button, 'click', handleClick);

// All cleaned up automatically on route change
```

### Common Pitfall: Inline Arrow Functions

```typescript
// BAD: Cannot remove -- new function reference each time
window.addEventListener('resize', () => handleResize());

// BAD: bind() creates a new reference each call
window.addEventListener('resize', this.handleResize.bind(this));

// GOOD: Store bound handler reference
class MyComponent implements Disposable {
  private boundResize: () => void;

  constructor() {
    this.boundResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.boundResize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.boundResize);
  }

  private handleResize(): void {
    // ...
  }
}
```

---

## Pattern 3: Timer Cleanup

```typescript
// src/lib/cleanup/timers.ts
export class TimerManager implements Disposable {
  private timeouts: number[] = [];
  private intervals: number[] = [];
  private animationFrames: number[] = [];

  setTimeout(fn: () => void, delay: number): void {
    const id = window.setTimeout(() => {
      fn();
      // Auto-remove from tracking when fired
      this.timeouts = this.timeouts.filter(t => t !== id);
    }, delay);
    this.timeouts.push(id);
  }

  setInterval(fn: () => void, delay: number): void {
    const id = window.setInterval(fn, delay);
    this.intervals.push(id);
  }

  requestAnimationFrame(fn: (time: number) => void): void {
    const id = window.requestAnimationFrame((time) => {
      fn(time);
      this.animationFrames = this.animationFrames.filter(a => a !== id);
    });
    this.animationFrames.push(id);
  }

  clearTimeouts(): void {
    this.timeouts.forEach(id => window.clearTimeout(id));
    this.timeouts = [];
  }

  clearIntervals(): void {
    this.intervals.forEach(id => window.clearInterval(id));
    this.intervals = [];
  }

  clearAnimationFrames(): void {
    this.animationFrames.forEach(id => window.cancelAnimationFrame(id));
    this.animationFrames = [];
  }

  destroy(): void {
    this.clearTimeouts();
    this.clearIntervals();
    this.clearAnimationFrames();
  }
}
```

### Usage

```typescript
const timers = new TimerManager();
routeDisposables.register(timers);

// Poll for sync every 30 seconds
timers.setInterval(() => syncQueue.processQueue(), 30_000);

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
function onSearchInput(query: string) {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => performSearch(query), 300);
}

// All timers cleaned up on route change
```

---

## Pattern 4: Observer Cleanup

### IntersectionObserver

```typescript
// src/lib/cleanup/intersection-observer.ts
export class ManagedIntersectionObserver implements Disposable {
  private observer: IntersectionObserver;
  private observedElements = new Set<Element>();

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.observer = new IntersectionObserver(callback, options);
  }

  observe(element: Element): void {
    this.observer.observe(element);
    this.observedElements.add(element);
  }

  unobserve(element: Element): void {
    this.observer.unobserve(element);
    this.observedElements.delete(element);
  }

  destroy(): void {
    this.observedElements.forEach(el => this.observer.unobserve(el));
    this.observedElements.clear();
    this.observer.disconnect();
  }
}
```

### Usage: Lazy-Load Gist Thumbnails

```typescript
// In gist-list component
const imageObserver = new ManagedIntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src!;
        imageObserver.unobserve(entry.target);
      }
    }
  },
  { rootMargin: '200px' },
);
routeDisposables.register(imageObserver);

// Observe all lazy images
document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

### ResizeObserver

```typescript
// src/lib/cleanup/resize-observer.ts
export class ManagedResizeObserver implements Disposable {
  private observer: ResizeObserver;
  private observedElements = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.observer = new ResizeObserver(callback);
  }

  observe(element: Element): void {
    this.observer.observe(element);
    this.observedElements.add(element);
  }

  destroy(): void {
    this.observedElements.forEach(el => this.observer.unobserve(el));
    this.observedElements.clear();
    this.observer.disconnect();
  }
}
```

---

## Pattern 5: Blob URL Management

```typescript
// src/lib/cleanup/blob-urls.ts
export class BlobURLManager implements Disposable {
  private urls = new Set<string>();

  create(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.urls.add(url);
    return url;
  }

  revoke(url: string): void {
    URL.revokeObjectURL(url);
    this.urls.delete(url);
  }

  destroy(): void {
    this.urls.forEach(url => URL.revokeObjectURL(url));
    this.urls.clear();
  }

  get activeCount(): number {
    return this.urls.size;
  }
}
```

### Usage: Download Gist as ZIP

```typescript
const blobManager = new BlobURLManager();
routeDisposables.register(blobManager);

async function downloadGistAsZip(gist: GistRecord): Promise<void> {
  const zip = await createGistZip(gist);
  const url = blobManager.create(zip);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${gist.description || gist.id}.zip`;
  a.click();

  // Revoke after download starts (browser has already read the blob)
  setTimeout(() => blobManager.revoke(url), 1000);
}
```

---

## Pattern 6: Cache Management

### Bounded LRU Cache

```typescript
// src/lib/cleanup/bounded-cache.ts
export class BoundedCache<T> implements Disposable {
  private cache = new Map<string, { value: T; timestamp: number; size: number }>();
  private maxEntries: number;
  private maxMemoryBytes: number;
  private currentMemoryBytes = 0;

  constructor(options?: { maxEntries?: number; maxMemoryBytes?: number }) {
    this.maxEntries = options?.maxEntries ?? 50;
    this.maxMemoryBytes = options?.maxMemoryBytes ?? 50 * 1024 * 1024; // 50MB
  }

  set(key: string, value: T, sizeBytes?: number): void {
    // Evict oldest if at capacity
    while (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    // Evict if memory limit exceeded
    const entrySize = sizeBytes ?? estimateSize(value);
    while (this.currentMemoryBytes + entrySize > this.maxMemoryBytes && this.cache.size > 0) {
      this.evictOldest();
    }

    const existing = this.cache.get(key);
    if (existing) {
      this.currentMemoryBytes -= existing.size;
    }

    this.cache.set(key, { value, timestamp: Date.now(), size: entrySize });
    this.currentMemoryBytes += entrySize;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Refresh timestamp (move to end for LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  private evictOldest(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      const entry = this.cache.get(firstKey)!;
      this.currentMemoryBytes -= entry.size;
      this.cache.delete(firstKey);
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemoryBytes -= entry.size;
    }
    this.cache.delete(key);
  }

  destroy(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  get memoryBytes(): number {
    return this.currentMemoryBytes;
  }
}

function estimateSize(value: unknown): number {
  if (typeof value === 'string') return value.length * 2; // UTF-16
  if (typeof value === 'object' && value !== null) {
    return new Blob([JSON.stringify(value)]).size;
  }
  return 64; // default
}
```

### Usage: Gist Content Cache

```typescript
// src/services/cache/gist-cache.ts
export const gistCache = new BoundedCache<GistRecord>({
  maxEntries: 50,
  maxMemoryBytes: 20 * 1024 * 1024, // 20MB for gist content
});

// Register for cleanup on route change (clear cache when leaving gist detail)
routeDisposables.register({
  destroy: () => gistCache.destroy(),
});
```

---

## Pattern 7: Service Worker Message Cleanup

```typescript
// src/lib/cleanup/sw-messages.ts
export class ServiceWorkerMessageHandler implements Disposable {
  private boundHandler: (event: MessageEvent) => void;

  constructor(handler: (event: MessageEvent) => void) {
    this.boundHandler = handler;
    navigator.serviceWorker.addEventListener('message', this.boundHandler);
  }

  postMessage(message: unknown): void {
    navigator.serviceWorker.controller?.postMessage(message);
  }

  destroy(): void {
    navigator.serviceWorker.removeEventListener('message', this.boundHandler);
  }
}
```

---

## Cleanup Checklist

When creating a new component or service:

- [ ] Implements `Disposable` interface with `destroy()` method
- [ ] All event listeners tracked and removed in `destroy()`
- [ ] All timers (setTimeout, setInterval, requestAnimationFrame) cleared
- [ ] All observers (Intersection, Resize, Mutation) disconnected
- [ ] All AbortControllers aborted
- [ ] All Blob URLs revoked
- [ ] All caches cleared or bounded
- [ ] Registered with `routeDisposables` if route-scoped
- [ ] No retained references to large objects (gist file content)
- [ ] No cyclic references (break cycles in `destroy()`)
