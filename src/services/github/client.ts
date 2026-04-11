/**
 * GitHub API Client
 * Handles all REST API calls to GitHub Gist API
 */

import type { 
  GitHubGist, 
  CreateGistRequest, 
  UpdateGistRequest, 
  GistRevision,
  TokenInfo,
  GitHubError 
} from '../../types/api';

const BASE_URL = 'https://api.github.com';

/**
 * Get stored PAT from IndexedDB
 */
async function getAuthToken(): Promise<string | null> {
  // Import dynamically to avoid circular dependencies
  const { getMetadata } = await import('../db');
  return (await getMetadata<string>('github-pat')) || null;
}

/**
 * Build headers with authentication
 */
async function buildHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  
  return {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `token ${token}` } : {}),
  };
}

/**
 * Handle API errors with proper typing
 */
function handleApiError(error: unknown, context: string): never {
  console.error(`[GitHub API] ${context}:`, error);
  
  if (error instanceof Response) {
    throw new Error(`GitHub API Error: ${error.status} ${error.statusText}`);
  }
  
  if (error instanceof Error) {
    throw error;
  }
  
  throw new Error(`Unknown error in ${context}: ${String(error)}`);
}

/**
 * Validate token by making a test request
 */
export async function validateToken(token: string): Promise<TokenInfo> {
  try {
    const response = await fetch(`${BASE_URL}/user`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.json() as GitHubError;
      return {
        isValid: false,
        error: error.message || 'Invalid token',
      };
    }
    
    const user = await response.json();
    
    // Check for gist scope (fine-grained tokens don't use scopes the same way)
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
  options: { 
    page?: number; 
    perPage?: number; 
    since?: string;
  } = {}
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
      { headers: await buildHeaders() }
    );
    
    if (!response.ok) {
      handleApiError(response, 'listGists');
    }
    
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
    const response = await fetch(
      `${BASE_URL}/gists/starred?${params}`,
      { headers: await buildHeaders() }
    );
    
    if (!response.ok) {
      handleApiError(response, 'listStarredGists');
    }
    
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
    const response = await fetch(
      `${BASE_URL}/gists/${id}`,
      { headers: await buildHeaders() }
    );
    
    if (!response.ok) {
      handleApiError(response, 'getGist');
    }
    
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
    const response = await fetch(`${BASE_URL}/gists`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      handleApiError(response, 'createGist');
    }
    
    return response.json() as Promise<GitHubGist>;
  } catch (error) {
    return handleApiError(error, 'createGist');
  }
}

/**
 * Update an existing gist
 */
export async function updateGist(
  id: string, 
  payload: UpdateGistRequest
): Promise<GitHubGist> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}`, {
      method: 'PATCH',
      headers: await buildHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      handleApiError(response, 'updateGist');
    }
    
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
    const response = await fetch(`${BASE_URL}/gists/${id}`, {
      method: 'DELETE',
      headers: await buildHeaders(),
    });
    
    if (!response.ok) {
      handleApiError(response, 'deleteGist');
    }
  } catch (error) {
    handleApiError(error, 'deleteGist');
  }
}

/**
 * Star a gist
 */
export async function starGist(id: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/star`, {
      method: 'PUT',
      headers: await buildHeaders(),
    });
    
    if (!response.ok) {
      handleApiError(response, 'starGist');
    }
  } catch (error) {
    handleApiError(error, 'starGist');
  }
}

/**
 * Unstar a gist
 */
export async function unstarGist(id: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/star`, {
      method: 'DELETE',
      headers: await buildHeaders(),
    });
    
    if (!response.ok) {
      handleApiError(response, 'unstarGist');
    }
  } catch (error) {
    handleApiError(error, 'unstarGist');
  }
}

/**
 * Check if a gist is starred
 */
export async function checkIfStarred(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/star`, {
      headers: await buildHeaders(),
    });
    
    return response.status === 204;
  } catch (error) {
    console.error('[GitHub API] checkIfStarred:', error);
    return false;
  }
}

/**
 * Fork a gist
 */
export async function forkGist(id: string): Promise<GitHubGist> {
  try {
    const response = await fetch(`${BASE_URL}/gists/${id}/forks`, {
      method: 'POST',
      headers: await buildHeaders(),
    });
    
    if (!response.ok) {
      handleApiError(response, 'forkGist');
    }
    
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
    const response = await fetch(
      `${BASE_URL}/gists/${id}/revisions`,
      { headers: await buildHeaders() }
    );
    
    if (!response.ok) {
      handleApiError(response, 'listGistRevisions');
    }
    
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
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`,
      },
    });
    
    if (!response.ok) {
      handleApiError(response, 'getCurrentUsername');
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
