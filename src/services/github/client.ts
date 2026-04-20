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
} from '../../types/api';
import { trackRateLimit } from './rate-limiter';
import { safeError } from '../security/logger';
import { handleGitHubError } from './error-handler';

const BASE_URL = 'https://api.github.com';

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
 * Get stored PAT from IndexedDB
 */
async function getAuthToken(): Promise<string | null> {
  const { getMetadata } = await import('../db');
  return (await getMetadata<string>('github-pat')) || null;
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
async function buildOptions(method: string = 'GET', body?: string): Promise<RequestInit> {
  return {
    method,
    headers: await buildHeaders(),
    signal: globalAbortController.signal,
    ...(body ? { body } : {}),
  };
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
 * List user's gists with pagination
 */
export async function listGists(
  options: { page?: number; perPage?: number; since?: string } = {}
): Promise<GitHubGist[]> {
  const { page = 1, perPage = 30, since } = options;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    ...(since ? { since } : {}),
  });

  try {
    const response = await fetch(
      `${BASE_URL}/users/${await getCurrentUsername()}/gists?${params}`,
      await buildOptions()
    );

    if (!response.ok) {
      return handleApiError(response, 'listGists');
    }

    trackRateLimit(response);
    return response.json() as Promise<GitHubGist[]>;
  } catch (error) {
    return handleApiError(error, 'listGists');
  }
}

/**
 * List starred gists
 */
export async function listStarredGists(
  options: { page?: number; perPage?: number } = {}
): Promise<GitHubGist[]> {
  const { page = 1, perPage = 30 } = options;

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  try {
    const response = await fetch(`${BASE_URL}/gists/starred?${params}`, await buildOptions());

    if (!response.ok) {
      return handleApiError(response, 'listStarredGists');
    }

    trackRateLimit(response);
    return response.json() as Promise<GitHubGist[]>;
  } catch (error) {
    return handleApiError(error, 'listStarredGists');
  }
}

/**
 * Get a specific gist by ID
 */
export async function getGist(id: string): Promise<GitHubGist> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}`, await buildOptions());

    if (!response.ok) {
      return handleApiError(response, 'getGist');
    }

    trackRateLimit(response);
    return response.json() as Promise<GitHubGist>;
  } catch (error) {
    return handleApiError(error, 'getGist');
  }
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
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/star`, await buildOptions());

    trackRateLimit(response);
    return response.status === 204;
  } catch (error) {
    safeError('[GitHub API] checkIfStarred:', error);
    return false;
  }
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
}

/**
 * Clear cached username (for logout)
 */
export function clearUsernameCache(): void {
  cachedUsername = null;
}
