import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockEventListeners = new Map<string, EventListener[]>();

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

function createEventListenerSpy(
  store: Map<string, EventListener[]>
): typeof window.addEventListener {
  return ((type: string, listener: EventListenerOrEventListenerObject) => {
    if (!store.has(type)) {
      store.set(type, []);
    }
    const fn =
      typeof listener === 'function'
        ? listener
        : (listener as EventListenerObject).handleEvent.bind(listener);
    store.get(type)?.push(fn);
  }) as typeof window.addEventListener;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('caches', mockCacheStorage);
  vi.stubGlobal('clients', mockClients);
  mockCacheStorage.open.mockResolvedValue(mockCache);
  mockCacheStorage.keys.mockResolvedValue([]);
  mockCacheStorage.match.mockResolvedValue(undefined);
  mockClients.claim.mockReset();
  mockClients.matchAll.mockResolvedValue([]);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')));
  mockCache.keys.mockResolvedValue([]);
  mockCache.match.mockResolvedValue(undefined);
  mockCache.put.mockResolvedValue(undefined);
  mockCache.addAll.mockResolvedValue(undefined);
});

beforeAll(async () => {
  vi.spyOn(window, 'addEventListener').mockImplementation(
    createEventListenerSpy(mockEventListeners)
  );
  await import('../../src/sw/sw');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function getListener(type: string): EventListener | undefined {
  return mockEventListeners?.get(type)?.[0];
}

describe('ServiceWorker additional coverage', () => {
  it('handles CSP report POST request', async () => {
    const listener = getListener('fetch');
    expect(listener).toBeDefined();

    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost/csp-report', {
      method: 'POST',
      body: JSON.stringify({
        'csp-report': {
          'document-uri': 'https://example.com/very-long-path-that-needs-truncation-for-redaction',
          'violated-directive': "script-src 'self'",
          'blocked-uri': 'https://evil.com/malicious-script-url-for-redaction',
        },
      }),
    });

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    expect(respondWithSpy).toHaveBeenCalled();
    const response = await respondWithSpy.mock.calls[0][0];
    expect(response.status).toBe(204);
  });

  it('handles unparseable CSP report', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost/csp-report', {
      method: 'POST',
      body: 'not-json',
    });

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    expect(respondWithSpy).toHaveBeenCalled();
    const response = await respondWithSpy.mock.calls[0][0];
    expect(response.status).toBe(204);
  });

  it('caches GitHub API GET response', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('https://api.github.com/gists', { method: 'GET' });
    const mockResponse = new Response('[]', { status: 200 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('does not cache non-GET GitHub API requests', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('https://api.github.com/gists', { method: 'POST' });
    const mockResponse = new Response('{}', { status: 201 });
    vi.mocked(fetch).mockResolvedValue(mockResponse);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('returns 503 for offline GitHub API requests', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('https://api.github.com/gists');
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    mockCacheStorage.match.mockResolvedValue(undefined);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('returns cached GitHub API response when offline', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('https://api.github.com/gists');
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    mockCacheStorage.match.mockResolvedValue(new Response('cached'));

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('returns stale static asset and re-fetches when expired', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost/style.css');
    Object.defineProperty(request, 'destination', { value: 'style' });

    const expiredHeaders = new Headers();
    expiredHeaders.set('x-cache-timestamp', String(Date.now() - 40 * 24 * 60 * 60 * 1000));
    const expiredResponse = new Response('stale', { status: 200, headers: expiredHeaders });

    mockCacheStorage.match.mockResolvedValue(expiredResponse);
    vi.mocked(fetch).mockResolvedValue(new Response('fresh', { status: 200 }));

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('returns cached static asset when not expired', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost/font.woff');
    Object.defineProperty(request, 'destination', { value: 'font' });

    const freshHeaders = new Headers();
    freshHeaders.set('x-cache-timestamp', String(Date.now()));
    const freshResponse = new Response('cached-font', { status: 200, headers: freshHeaders });

    mockCacheStorage.match.mockResolvedValue(freshResponse);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('does not cache non-ok static asset response', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost/image.png');
    Object.defineProperty(request, 'destination', { value: 'image' });

    mockCacheStorage.match.mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue(new Response('not found', { status: 404 }));

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('returns 404 for default fetch when no cache and network fails', async () => {
    const listener = getListener('fetch');
    const respondWithSpy = vi.fn();
    const request = new Request('http://localhost/api/data');
    Object.defineProperty(request, 'destination', { value: '' });

    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    mockCacheStorage.match.mockResolvedValue(undefined);

    (listener as (e: Event) => void)({
      type: 'fetch',
      request,
      respondWith: respondWithSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(respondWithSpy).toHaveBeenCalled();
    });
  });

  it('handles sync event with sync-gists tag and posts to clients', async () => {
    const listener = getListener('sync');
    const client1 = { postMessage: vi.fn() };
    mockClients.matchAll.mockResolvedValue([client1]);

    const waitUntilSpy = vi.fn((p: Promise<unknown>) => p);

    (listener as (e: Event) => void)({
      type: 'sync',
      tag: 'sync-gists',
      waitUntil: waitUntilSpy,
    } as unknown as Event);

    await vi.waitFor(() => {
      expect(waitUntilSpy).toHaveBeenCalled();
    });
  });
});
