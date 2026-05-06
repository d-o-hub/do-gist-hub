/**
 * GitHub API Client
 * Handles all REST API calls to GitHub Gist API
 * All requests support AbortController for cancellation
 * Tracks rate limits via X-RateLimit-* headers
 */

import type {
  GitHubGist,
  CreateGistRequest,
  UpdateGistRequest,
  GistRevision,
  TokenInfo,
  GitHubError,
  PaginatedResult,
  PaginationInfo,
} from '../../types/api';
import { trackRateLimit } from './rate-limiter';
import { safeError } from '../security/logger';
import { handleGitHubError } from './error-handler';
import { getEtag, setEtag } from '../db';

const BASE_URL = 'https://api.github.com';

/**
 * In-flight request deduplication cache.
 * Key: METHOD:URL, Value: shared Promise.
 * Automatically cleaned on completion or error.
 */
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Deduplicate concurrent identical requests.
 * If a request with the same key is already in flight, return its promise.
 */
async function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Global abort controller for cancelling all in-flight requests
 */
let globalAbortController = new AbortController();

/**
 * Cancel all in-flight requests and create a new abort controller
 */
export function cancelAllRequests(): void {
  globalAbortController.abort();
  globalAbortController = new AbortController();
}

/**
 * Get stored PAT from secure storage
 * 🛡️ Sentinel: Uses centralized auth service for decryption/migration
 */
async function getAuthToken(): Promise<string | null> {
  const { getToken } = await import('./auth');
  return getToken();
}

/**
 * Build headers with authentication
 */
async function buildHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();

  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `token ${token}` } : {}),
  };
}

/**
 * Build request options with signal and headers
 */
async function buildOptions(
  method: string = 'GET',
  body?: string,
  extraHeaders: Record<string, string> = {}
): Promise<RequestInit> {
  const headers = (await buildHeaders()) as Record<string, string>;

  return {
    method,
    headers: {
      ...headers,
      ...extraHeaders,
    },
    signal: globalAbortController.signal,
    ...(body ? { body } : {}),
  };
}

/**
 * Parse GitHub Link header for pagination metadata.
 * Link: <https://api.github.com/...?page=2>; rel="next", <...?page=5>; rel="last"
 */
function parseLinkHeader(linkHeader: string | null): PaginationInfo {
  const result: PaginationInfo = {
    nextPage: null,
    prevPage: null,
    firstPage: null,
    lastPage: null,
    totalPages: null,
  };

  if (!linkHeader) return result;

  for (const part of linkHeader.split(',')) {
    const match = part.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="(\w+)"/);
    if (match) {
      const page = parseInt(match[1]!, 10);
      const rel = match[2]!;
      if (rel === 'next') result.nextPage = page;
      else if (rel === 'prev') result.prevPage = page;
      else if (rel === 'first') result.firstPage = page;
      else if (rel === 'last') {
        result.lastPage = page;
        result.totalPages = page;
      }
    }
  }

  return result;
}

/**
 * Handle API errors with proper typing
 */
export function handleApiError(error: unknown, context: string): never {
  if (error instanceof DOMException && error.name === 'AbortError') {
    throw new Error(`Request cancelled: ${context}`);
  }

  // Use the central error handler
  const appError = handleGitHubError(error, context);
  throw appError;
}

/**
 * Validate token by making a test request
 */
export async function validateToken(token: string): Promise<TokenInfo> {
  try {
    const response = await fetch(`${BASE_URL}/user`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `token ${token}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json()) as GitHubError;
      return {
        isValid: false,
        error: error.message || 'Invalid token',
      };
    }

    const user = await response.json();

    return {
      isValid: true,
      username: user.login,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Generic fetch with ETag support and deduplication
 */
async function fetchWithEtag<T>(url: string, context: string): Promise<T> {
  const key = `GET:${context}:${url}`;

  return deduplicatedFetch(key, async () => {
    try {
      const cached = await getEtag(url);
      const headers: Record<string, string> = {};
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      const response = await fetch(url, await buildOptions('GET', undefined, headers));

      if (response.status === 304 && cached) {
        trackRateLimit(response);
        return cached.data as T;
      }

      if (!response.ok) {
        return handleApiError(response, context);
      }

      trackRateLimit(response);
      const data = await response.json();

      let result = data;
      if (context === 'listGists' || context === 'listStarredGists') {
        const pagination = parseLinkHeader(response.headers.get('Link'));
        result = { data, pagination };
      }

      const etag = response.headers.get('ETag');
      if (etag) {
        void setEtag(url, etag, result);
      }

      return result;
    } catch (error) {
      return handleApiError(error, context);
    }
  });
}

/**
 * List user's gists with pagination via Link headers
 */
export async function listGists(
  options: { page?: number; perPage?: number; since?: string } = {}
): Promise<PaginatedResult<GitHubGist>> {
  const { page = 1, perPage = 30, since } = options;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    ...(since ? { since } : {}),
  });

  const url = `${BASE_URL}/users/${await getCurrentUsername()}/gists?${params}`;
  return fetchWithEtag<PaginatedResult<GitHubGist>>(url, 'listGists');
}

/**
 * List starred gists with pagination via Link headers
 */
export async function listStarredGists(
  options: { page?: number; perPage?: number } = {}
): Promise<PaginatedResult<GitHubGist>> {
  const { page = 1, perPage = 30 } = options;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  const url = `${BASE_URL}/gists/starred?${params}`;
  return fetchWithEtag<PaginatedResult<GitHubGist>>(url, 'listStarredGists');
}

/**
 * Get a specific gist by ID
 */
export async function getGist(id: string): Promise<GitHubGist> {
  const url = `${BASE_URL}/gists/${id}`;
  return fetchWithEtag<GitHubGist>(url, 'getGist');
}

/**
 * Create a new gist
 */
export async function createGist(payload: CreateGistRequest): Promise<GitHubGist> {
  try {
    const response = await fetch(
      `${BASE_URL}/gists`,
      await buildOptions('POST', JSON.stringify(payload))
    );

    if (!response.ok) {
      return handleApiError(response, 'createGist');
    }

    trackRateLimit(response);
    return response.json() as Promise<GitHubGist>;
  } catch (error) {
    return handleApiError(error, 'createGist');
  }
}

/**
 * Update an existing gist
 */
export async function updateGist(id: string, payload: UpdateGistRequest): Promise<GitHubGist> {
  try {
    const response = await fetch(
      `${BASE_URL}/gists/${id}`,
      await buildOptions('PATCH', JSON.stringify(payload))
    );

    if (!response.ok) {
      return handleApiError(response, 'updateGist');
    }

    trackRateLimit(response);
    return response.json() as Promise<GitHubGist>;
  } catch (error) {
    return handleApiError(error, 'updateGist');
  }
}

/**
 * Delete a gist
 */
export async function deleteGist(id: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}`, await buildOptions('DELETE'));

    if (!response.ok) {
      handleApiError(response, 'deleteGist');
    }

    trackRateLimit(response);
  } catch (error) {
    handleApiError(error, 'deleteGist');
  }
}

/**
 * Star a gist
 */
export async function starGist(id: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/star`, await buildOptions('PUT'));

    if (!response.ok) {
      handleApiError(response, 'starGist');
    }

    trackRateLimit(response);
  } catch (error) {
    handleApiError(error, 'starGist');
  }
}

/**
 * Unstar a gist
 */
export async function unstarGist(id: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/star`, await buildOptions('DELETE'));

    if (!response.ok) {
      handleApiError(response, 'unstarGist');
    }

    trackRateLimit(response);
  } catch (error) {
    handleApiError(error, 'unstarGist');
  }
}

/**
 * Check if a gist is starred
 */
export async function checkIfStarred(id: string): Promise<boolean> {
  const key = `GET:checkIfStarred:${id}`;

  return deduplicatedFetch(key, async () => {
    try {
      const response = await fetch(`${BASE_URL}/gists/${id}/star`, await buildOptions());

      trackRateLimit(response);
      return response.status === 204;
    } catch (error) {
      safeError('[GitHub API] checkIfStarred:', error);
      return false;
    }
  });
}

/**
 * Fork a gist
 */
export async function forkGist(id: string): Promise<GitHubGist> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/forks`, await buildOptions('POST'));

    if (!response.ok) {
      return handleApiError(response, 'forkGist');
    }

    trackRateLimit(response);
    return response.json() as Promise<GitHubGist>;
  } catch (error) {
    return handleApiError(error, 'forkGist');
  }
}

/**
 * List gist revisions
 */
export async function listGistRevisions(id: string): Promise<GistRevision[]> {
  const key = `GET:listGistRevisions:${id}`;

  return deduplicatedFetch(key, async () => {
    try {
      const response = await fetch(`${BASE_URL}/gists/${id}/revisions`, await buildOptions());

      if (!response.ok) {
        return handleApiError(response, 'listGistRevisions');
      }

      trackRateLimit(response);
      return response.json() as Promise<GistRevision[]>;
    } catch (error) {
      return handleApiError(error, 'listGistRevisions');
    }
  });
}

/**
 * Get current authenticated username (cached)
 */
let cachedUsername: string | null = null;

async function getCurrentUsername(): Promise<string> {
  if (cachedUsername) {
    return cachedUsername;
  }

  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const key = `GET:getCurrentUsername:${token.slice(-8)}`;

  return deduplicatedFetch(key, async () => {
    try {
      const response = await fetch(`${BASE_URL}/user`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          Authorization: `token ${token}`,
        },
      });

      if (!response.ok) {
        return handleApiError(response, 'getCurrentUsername');
      }

      const user = await response.json();
      cachedUsername = user.login as string;
      return cachedUsername;
    } catch (error) {
      return handleApiError(error, 'getCurrentUsername');
    }
  });
}

/**
 * Clear cached username (for logout)
 */
export function clearUsernameCache(): void {
  cachedUsername = null;
}
