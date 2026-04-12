# AbortController Guide

Systematic usage of AbortController for cancelable fetch requests and async operations in Gist Hub.

## Why AbortController

Every fetch request in Gist Hub must be cancelable for three reasons:

1. **Navigation**: User navigates away before request completes -- cancel to free resources
2. **Race conditions**: User types search query, new request should cancel the previous one
3. **Component lifecycle**: Route unmounts, pending requests must be aborted

Without AbortController, abandoned fetch requests:
- Continue consuming bandwidth
- May update state on unmounted components
- Accumulate in the browser's connection pool
- Can cause memory leaks through retained response bodies

---

## Pattern 1: Single Request

The simplest pattern -- one controller per request.

```typescript
// src/services/github/fetch-with-auth.ts
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  signal?: AbortSignal,
): Promise<Response> {
  const token = getStoredPat();
  if (!token) {
    throw new AppError(
      ErrorCode.AUTH_INVALID_TOKEN,
      'No authentication token found',
    );
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal, // <-- Forward the signal
  });

  return response;
}
```

### Usage

```typescript
async function fetchGist(gistId: string, signal?: AbortSignal): Promise<GistRecord> {
  const response = await fetchWithAuth(
    `https://api.github.com/gists/${gistId}`,
    { method: 'GET' },
    signal,
  );

  if (!response.ok) {
    throw await mapHttpError(response);
  }

  return await response.json();
}

// Caller creates the controller
const controller = new AbortController();

try {
  const gist = await fetchGist('abc123', controller.signal);
  renderGist(gist);
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    // Silently ignore -- request was cancelled
    return;
  }
  handleError(error);
}

// Cancel if needed
controller.abort();
```

---

## Pattern 2: Route-Scoped Requests

All requests made during a route's lifetime share a single AbortController. When the route changes, all pending requests are cancelled.

```typescript
// src/lib/http/route-http-client.ts
export class RouteHttpClient implements Disposable {
  private controller: AbortController;

  constructor() {
    this.controller = new AbortController();
  }

  private get signal(): AbortSignal {
    return this.controller.signal;
  }

  // Gist operations
  async fetchGist(gistId: string): Promise<GistRecord> {
    const response = await fetchWithAuth(
      `https://api.github.com/gists/${gistId}`,
      undefined,
      this.signal,
    );
    if (!response.ok) throw await mapHttpError(response);
    return response.json();
  }

  async fetchUserGists(
    page = 1,
    perPage = 30,
  ): Promise<{ gists: GistRecord[]; hasNext: boolean }> {
    const response = await fetchWithAuth(
      `https://api.github.com/gists?page=${page}&per_page=${perPage}`,
      undefined,
      this.signal,
    );
    if (!response.ok) throw await mapHttpError(response);
    const hasNext = parseLinkHeader(response.headers.get('link'));
    return { gists: await response.json(), hasNext };
  }

  async fetchStarredGists(): Promise<GistRecord[]> {
    const response = await fetchWithAuth(
      'https://api.github.com/gists/starred',
      undefined,
      this.signal,
    );
    if (!response.ok) throw await mapHttpError(response);
    return response.json();
  }

  async checkStar(gistId: string): Promise<boolean> {
    const response = await fetchWithAuth(
      `https://api.github.com/gists/${gistId}/star`,
      { method: 'GET' },
      this.signal,
    );
    return response.status === 204;
  }

  async fetchRevisions(gistId: string): Promise<GistRevision[]> {
    const response = await fetchWithAuth(
      `https://api.github.com/gists/${gistId}/commits`,
      undefined,
      this.signal,
    );
    if (!response.ok) throw await mapHttpError(response);
    return response.json();
  }

  // Cancel all pending requests
  destroy(): void {
    this.controller.abort();
    this.controller = new AbortController(); // Reset for potential reuse
  }
}
```

### Router Integration

```typescript
// src/router.ts
let currentClient: RouteHttpClient | null = null;

async function navigateTo(path: string): Promise<void> {
  // 1. Cancel all pending requests from previous route
  currentClient?.destroy();

  // 2. Clean up other route resources
  routeDisposables.destroyAll();
  clearRouteContent();
  dismissAllToasts();

  // 3. Create new HTTP client for this route
  currentClient = new RouteHttpClient();
  routeDisposables.register(currentClient);

  // 4. Load route with the new client
  await loadRoute(path, currentClient);
}
```

---

## Pattern 3: Search Debounce with Cancellation

When the user types in a search box, cancel the previous search request.

```typescript
// src/services/github/search.ts
export class GistSearch implements Disposable {
  private controller: AbortController | null = null;

  async search(query: string): Promise<GistRecord[]> {
    // Cancel any in-flight search
    this.controller?.abort();
    this.controller = new AbortController();

    if (!query.trim()) {
      return [];
    }

    const response = await fetchWithAuth(
      `https://api.github.com/gists?q=${encodeURIComponent(query)}`,
      undefined,
      this.controller.signal,
    );

    if (!response.ok) {
      if (this.controller.signal.aborted) {
        return []; // Cancelled, not an error
      }
      throw await mapHttpError(response);
    }

    return response.json();
  }

  destroy(): void {
    this.controller?.abort();
    this.controller = null;
  }
}
```

### Usage in Component

```typescript
// In search component
const search = new GistSearch();
routeDisposables.register(search);

const searchInput = document.querySelector('#search-input');
let debounceTimer: number | null = null;

searchInput.addEventListener('input', (e) => {
  const query = (e.target as HTMLInputElement).value;

  // Debounce input
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      const results = await search.search(query);
      renderResults(results);
    } catch (error) {
      if (!(error instanceof AppError && error.code === ErrorCode.REQUEST_ABORTED)) {
        handleError(error);
      }
    }
  }, 300);
});
```

---

## Pattern 4: Timeout with AbortController

Add a timeout to fetch requests using AbortController.

```typescript
// src/lib/http/timeout.ts
export function withTimeout(
  signal: AbortSignal,
  timeoutMs: number,
): AbortSignal {
  const controller = new AbortController();

  // If the original signal is already aborted, abort immediately
  if (signal.aborted) {
    controller.abort(signal.reason);
    return controller.signal;
  }

  // Set up timeout
  const timerId = setTimeout(() => {
    controller.abort(new AppError(
      ErrorCode.REQUEST_TIMEOUT,
      `Request timed out after ${timeoutMs}ms`,
    ));
  }, timeoutMs);

  // If original signal aborts, propagate to the timeout controller
  signal.addEventListener('abort', () => {
    clearTimeout(timerId);
    controller.abort(signal.reason);
  }, { once: true });

  return controller.signal;
}
```

### Usage

```typescript
const controller = new AbortController();
const timeoutSignal = withTimeout(controller.signal, 15_000); // 15s timeout

try {
  const response = await fetchWithAuth(url, undefined, timeoutSignal);
  // ...
} catch (error) {
  if (error instanceof AppError && error.code === ErrorCode.REQUEST_TIMEOUT) {
    showToast({
      message: 'Request timed out. Please try again.',
      action: { label: 'Retry', handler: () => retry() },
    });
    return;
  }
  throw error;
}
```

---

## Pattern 5: Parallel Requests with Selective Cancellation

Fetch multiple resources in parallel, but cancel all if any fails.

```typescript
// src/lib/http/parallel.ts
export async function fetchAllWithAbort<T>(
  requests: Array<() => Promise<T>>,
  signal: AbortSignal,
): Promise<T[]> {
  const wrapped = requests.map(async (fn) => {
    // Check if already aborted before starting
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    return fn();
  });

  return Promise.all(wrapped);
}
```

### Usage: Load Gist + Star Status + Revisions

```typescript
const controller = new AbortController();

const [gist, isStarred, revisions] = await fetchAllWithAbort(
  [
    () => fetchGist(gistId, controller.signal),
    () => checkStar(gistId, controller.signal),
    () => fetchRevisions(gistId, controller.signal),
  ],
  controller.signal,
);
```

---

## Pattern 6: AbortController with IndexedDB

IndexedDB operations are not directly abortable via AbortController, but you can use it for logical cancellation.

```typescript
// src/services/storage/abortable-idb.ts
export class AbortableIDBOperation<T> implements Disposable {
  private aborted = false;
  private controller: AbortController;

  constructor() {
    this.controller = new AbortController();
  }

  async execute(fn: () => Promise<T>): Promise<T> {
    if (this.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    // Race between the IDB operation and abort signal
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        this.controller.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      }),
    ]);
  }

  abort(): void {
    this.aborted = true;
    this.controller.abort();
  }

  destroy(): void {
    this.abort();
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }
}
```

### Usage

```typescript
const operation = new AbortableIDBOperation<GistRecord[]>();
routeDisposables.register(operation);

const gists = await operation.execute(() => db.getAllGists());
```

---

## Pattern 7: AbortController in Service Worker Sync

When the service worker processes the sync queue, use AbortController to cancel on network errors.

```typescript
// src/services/sync/sw-sync.ts
export class SyncProcessor implements Disposable {
  private controller: AbortController | null = null;

  async processQueue(): Promise<void> {
    if (this.controller) {
      // Already processing, don't start another sync
      return;
    }

    this.controller = new AbortController();

    const items = await db.getPendingQueueItems();

    for (const item of items) {
      if (this.controller.signal.aborted) break;

      try {
        await this.syncItem(item, this.controller.signal);
        await db.removeQueueItem(item.id);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          break; // Stopped intentionally
        }
        await this.handleSyncError(item, error);
      }
    }

    this.controller = null;
  }

  stop(): void {
    this.controller?.abort();
    this.controller = null;
  }

  destroy(): void {
    this.stop();
  }
}
```

---

## Anti-Patterns to Avoid

### 1. Forgetting to Forward Signal

```typescript
// BAD: Signal passed to wrapper but not to fetch
async function badFetch(url: string, signal?: AbortSignal): Promise<Response> {
  return fetch(url); // signal not forwarded!
}

// GOOD
async function goodFetch(url: string, signal?: AbortSignal): Promise<Response> {
  return fetch(url, { signal });
}
```

### 2. Reusing Aborted Controller

```typescript
// BAD: An aborted controller cannot be reused
const controller = new AbortController();
controller.abort();
await fetch(url, { signal: controller.signal }); // Throws AbortError immediately

// GOOD: Create new controller for each request
function makeRequest() {
  const controller = new AbortController();
  return fetch(url, { signal: controller.signal });
}
```

### 3. Not Handling AbortError

```typescript
// BAD: Treat AbortError like any other error
try {
  await fetch(url, { signal });
} catch (error) {
  showToast({ message: 'Request failed' }); // Shows toast even on abort!
}

// GOOD: Silence abort errors
try {
  await fetch(url, { signal });
} catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') return;
  showToast({ message: 'Request failed' });
}
```

### 4. Creating Controller in Loop

```typescript
// BAD: Creates new controller for each item, no cancellation of previous
for (const gist of gists) {
  const controller = new AbortController();
  fetchGist(gist.id, controller.signal);
}

// GOOD: Single controller for batch, cancel all on error
const controller = new AbortController();
const promises = gists.map(gist =>
  fetchGist(gist.id, controller.signal).catch(error => {
    if (error.code !== ErrorCode.REQUEST_ABORTED) {
      controller.abort(); // Cancel remaining requests
    }
    throw error;
  }),
);
await Promise.all(promises);
```

---

## AbortController Checklist

For every async operation:

- [ ] Accept an optional `AbortSignal` parameter
- [ ] Forward the signal to `fetch()` calls
- [ ] Handle `AbortError` silently (do not show to user)
- [ ] Create a controller at the appropriate scope (route, component, action)
- [ ] Call `controller.abort()` in `destroy()`/cleanup
- [ ] Check `signal.aborted` before starting expensive work
- [ ] Use `withTimeout()` for user-facing requests (default 15s)
- [ ] Do not reuse aborted controllers
- [ ] Register controllers with `routeDisposables` for automatic cleanup
