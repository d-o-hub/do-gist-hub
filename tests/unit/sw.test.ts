/**
 * Unit tests for src/sw/sw.ts
 * Tests service worker event handlers (install, activate, fetch, message, sync)
 * Uses mocked ServiceWorkerGlobalScope via jsdom window
 *
 * Strategy: Set up mocks in beforeEach, import the module once in beforeAll
 * (which triggers top-level addEventListener), store captured listeners,
 * then call them directly in each test.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// Track event listeners registered by the sw module
const mockEventListeners = new Map<string, EventListener[]>();

// Mock caches API
const mockCacheStorage = {
  open: vi.fn(),
  keys: vi.fn(),
  delete: vi.fn(),
  match: vi.fn(),
  has: vi.fn(),
};

const mockCache = {
  addAll: vi.fn(),
  put: vi.fn(),
  match: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
};

const mockClients = {
  claim: vi.fn(),
  matchAll: vi.fn(() => Promise.resolve([])),
  openWindow: vi.fn(),
  postMessage: vi.fn(),
};

const mockSkipWaiting = vi.fn();

/** Helper to capture event listeners registered via addEventListener */
function createEventListenerSpy(store: Map<string, EventListener[]>): typeof window.addEventListener {
  return ((type: string, listener: EventListenerOrEventListenerObject) => {
    if (!store.has(type)) {
      store.set(type, []);
    }
    const fn = typeof listener === 'function'
      ? listener
      : (listener as EventListenerObject).handleEvent.bind(listener);
    store.get(type)!.push(fn);
  }) as typeof window.addEventListener;
}

beforeEach(() => {
  vi.clearAllMocks();

  // Setup mock caches
  vi.stubGlobal('caches', mockCacheStorage);
  vi.stubGlobal('clients', mockClients);
  mockCacheStorage.open.mockResolvedValue(mockCache);
  mockCacheStorage.keys.mockResolvedValue([]);
  mockCacheStorage.match.mockResolvedValue(undefined);

  // Setup mock clients
  mockClients.claim.mockReset();
  mockClients.matchAll.mockResolvedValue([]);

  // Mock skipWaiting on self (which is window in jsdom)
  Object.defineProperty(globalThis, 'skipWaiting', {
    value: mockSkipWaiting,
    writable: true,
    configurable: true,
  });

  // Mock fetch to prevent real network requests and unhandled rejections
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));

  mockCache.keys.mockResolvedValue([]);
  mockCache.match.mockResolvedValue(undefined);
  mockCache.put.mockResolvedValue(undefined);
  mockCache.addAll.mockResolvedValue(undefined);
  mockCacheStorage.match.mockResolvedValue(undefined);
});

beforeAll(async () => {
  // Capture addEventListener (needs to happen before module import)
  vi.spyOn(window, 'addEventListener').mockImplementation(
    createEventListenerSpy(mockEventListeners)
  );

  // Import the module once — top-level addEventListener calls fire here
  await import('../../src/sw/sw');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Helper to safely extract listeners */
function getListener(type: string): EventListener | undefined {
  return mockEventListeners?.get(type)?.[0];
}

describe('ServiceWorker (sw.ts)', () => {
  it('registers install event listener', () => {
    expect(mockEventListeners.has('install')).toBe(true);
  });

  it('registers activate event listener', () => {
    expect(mockEventListeners.has('activate')).toBe(true);
  });

  it('registers fetch event listener', () => {
    expect(mockEventListeners.has('fetch')).toBe(true);
  });

  it('registers message event listener', () => {
    expect(mockEventListeners.has('message')).toBe(true);
  });

  it('registers sync event listener', () => {
    expect(mockEventListeners.has('sync')).toBe(true);
  });

  it('precaches assets on install event', async () => {
    const listener = getListener('install');
    expect(listener).toBeDefined();

    const waitUntilFn = vi.fn();
    const event = { type: 'install', waitUntil: waitUntilFn };

    (listener as (e: Event) => void)(event as unknown as Event);

    await vi.waitFor(() => {
      expect(mockCacheStorage.open).toHaveBeenCalled();
      expect(waitUntilFn).toHaveBeenCalled();
    });
  });

  it('cleans up old caches on activate', async () => {
    mockCacheStorage.keys.mockResolvedValue(['old-cache-v1', 'do-gist-hub-static-__BUILD_TIMESTAMP__']);

    const listener = getListener('activate');
    expect(listener).toBeDefined();

    const waitUntilFn = vi.fn();
    const event = { type: 'activate', waitUntil: waitUntilFn };

    (listener as (e: Event) => void)(event as unknown as Event);

    await vi.waitFor(() => {
      expect(mockCacheStorage.keys).toHaveBeenCalled();
      expect(waitUntilFn).toHaveBeenCalled();
    });
  });

  it('handles CLEAR_CACHE message', async () => {
    const listener = getListener('message');
    expect(listener).toBeDefined();

    const mockPort = { postMessage: vi.fn() };

    (listener as (e: Event) => void)(
      new MessageEvent('message', {
        data: { type: 'CLEAR_CACHE' },
        ports: [mockPort],
      }) as unknown as Event
    );

    await vi.waitFor(() => {
      expect(mockCacheStorage.keys).toHaveBeenCalled();
    });
  });

  it('handles SKIP_WAITING message', () => {
    const listener = getListener('message');
    expect(listener).toBeDefined();

    (listener as (e: Event) => void)(
      new MessageEvent('message', {
        data: { type: 'SKIP_WAITING' },
        ports: [],
      }) as unknown as Event
    );

    expect(mockSkipWaiting).toHaveBeenCalled();
  });

  it('responds to navigation fetch events', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    // jsdom doesn't support mode: 'navigate', so create a base request and override mode
    const request = new Request('http://localhost:3000/');
    Object.defineProperty(request, 'mode', { value: 'navigate' });

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('updates cache on successful navigation fetch', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/');
    Object.defineProperty(request, 'mode', { value: 'navigate' });

    // Mock fetch to return a successful response
    const responseBody = '<html>test</html>';
    const mockResponse = new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });

    // The response should eventually trigger cache.put for the updated response
    await vi.waitFor(() => {
      expect(mockCacheStorage.open).toHaveBeenCalled();
    });
  });

  it('serves offline.html on navigation fetch failure', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/');
    Object.defineProperty(request, 'mode', { value: 'navigate' });

    // Fetch fails (offline)
    vi.mocked(fetch).mockRejectedValue(new Error('Network offline'));
    // offline.html is cached
    mockCacheStorage.match.mockResolvedValue(new Response('<html>offline</html>'));

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(mockCacheStorage.match).toHaveBeenCalledWith('/offline.html');
    });
  });

  it('serves cached fallback when offline and no offline.html', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/');
    Object.defineProperty(request, 'mode', { value: 'navigate' });

    // Fetch fails (offline)
    vi.mocked(fetch).mockRejectedValue(new Error('Network offline'));
    // offline.html not cached, but request itself is cached
    mockCacheStorage.match
      .mockResolvedValueOnce(undefined) // First call: offline.html not found
      .mockResolvedValueOnce(new Response('cached content')); // Second call: cached request

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(mockCacheStorage.match).toHaveBeenCalledWith('/offline.html');
    });
  });

  it('provides plain text fallback when completely offline', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/');
    Object.defineProperty(request, 'mode', { value: 'navigate' });

    // Fetch fails (offline)
    vi.mocked(fetch).mockRejectedValue(new Error('Network offline'));
    // Nothing cached
    mockCacheStorage.match.mockResolvedValue(undefined);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(mockCacheStorage.match).toHaveBeenCalledTimes(2);
    });
  });

  it('bypasses cache for GitHub API requests', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('https://api.github.com/gists');

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    expect(respondWithSpy).toHaveBeenCalled();
  });

  it('uses cache-first strategy for static assets (style)', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/style.css');
    // Override destination for style
    Object.defineProperty(request, 'destination', { value: 'style' });

    // Cache hit
    mockCacheStorage.match.mockResolvedValue(new Response('cached css'));

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(mockCacheStorage.match).toHaveBeenCalledWith(request);
    });
  });

  it('fetches and caches static asset on cache miss', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/app.js');
    Object.defineProperty(request, 'destination', { value: 'script' });

    // Cache miss
    mockCacheStorage.match.mockResolvedValue(undefined);
    // Fetch succeeds
    const mockResponse = new Response('console.log("ok")', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(request);
    });
  });

  it('uses network-first strategy for non-navigate, non-static requests', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/some-data.json');
    Object.defineProperty(request, 'destination', { value: '' });

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('falls back to cache for network-first when fetch fails', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost:3000/some-data.json');
    Object.defineProperty(request, 'destination', { value: '' });

    // Fetch fails
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    // Cache hit
    mockCacheStorage.match.mockResolvedValue(new Response('cached data'));

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(mockCacheStorage.match).toHaveBeenCalledWith(request);
    });
  });

  it('handles sync event for sync-gists tag', async () => {
    const listener = getListener('sync');
    expect(listener).toBeDefined();

    const waitUntilSpy = vi.fn();

    (listener as (e: Event) => void)({
      type: 'sync',
      tag: 'sync-gists',
      waitUntil: waitUntilSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(waitUntilSpy).toHaveBeenCalled();
    });
  });

  it('does not respond to non-sync-gists sync event', () => {
    const listener = getListener('sync');
    expect(listener).toBeDefined();

    const waitUntilSpy = vi.fn();

    (listener as (e: Event) => void)({
      type: 'sync',
      tag: 'other-tag',
      waitUntil: waitUntilSpy,
    } as unknown as Event);

    expect(waitUntilSpy).not.toHaveBeenCalled();
  });
});
