---
name: github-gist-api
description: Implement typed GitHub Gist API client with pagination, rate limiting, conditional requests, and error mapping.
---

# Github-gist-api Skill

Implement comprehensive GitHub Gist API integration with proper error handling.

## When to Use

- Implementing gist CRUD operations
- Adding pagination to list endpoints
- Handling rate limits and retries
- Implementing star/fork/revisions

## GitHub Gist API Endpoints

### Core Endpoints

```typescript
// Base URL: https://api.github.com
const endpoints = {
  // List gists
  listGists: 'GET /gists',
  listPublicGists: 'GET /gists/public',
  listUserGists: 'GET /users/{username}/gists',
  listStarredGists: 'GET /gists/starred',

  // Single gist
  getGist: 'GET /gists/{gist_id}',
  createGist: 'POST /gists',
  updateGist: 'PATCH /gists/{gist_id}',
  deleteGist: 'DELETE /gists/{gist_id}',

  // Gist actions
  starGist: 'PUT /gists/{gist_id}/star',
  unstarGist: 'DELETE /gists/{gist_id}/star',
  checkStarred: 'GET /gists/{gist_id}/star',
  forkGist: 'POST /gists/{gist_id}/forks',
  listForks: 'GET /gists/{gist_id}/forks',

  // Revisions
  listRevisions: 'GET /gists/{gist_id}/revisions',
  getRevision: 'GET /gists/{gist_id}/{sha}',
} as const;
```

### Required Headers

```typescript
const headers = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Authorization': `Bearer ${pat}`,
  'If-None-Match': etag, // For conditional requests
} as const;
```

## Workflow

### Step 1: Create Typed API Client

```typescript
// src/services/github/gist-client.ts
export interface GistFile {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: number;
  content?: string;
  truncated?: boolean;
}

export interface Gist {
  id: string;
  node_id: string;
  description: string | null;
  public: boolean;
  files: Record<string, GistFile>;
  owner: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  git_pull_url?: string;
  git_push_url?: string;
}

export interface GistListResponse {
  gists: Gist[];
  nextPage: number | null;
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
  };
}
```

### Step 2: Implement Fetch with Error Handling

```typescript
// src/services/github/fetch-with-auth.ts
export async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {},
  pat: string,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Authorization': `Bearer ${pat}`,
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await handleFetchError(response);
    }

    // Track rate limits
    trackRateLimit(response);

    return await response.json() as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(ErrorCode.REQUEST_TIMEOUT, 'Request timed out');
    }
    throw error;
  }
}
```

### Step 3: Implement Pagination

```typescript
// src/services/github/pagination.ts
export function parseLinkHeader(header: string | null): { next?: number } {
  if (!header) return {};

  const match = header.match(/page=(\d+)>; rel="next"/);
  return match ? { next: parseInt(match[1], 10) } : {};
}

export async function fetchAllPages<T>(
  fetchFn: (page: number) => Promise<{ items: T[]; nextPage: number | null }>,
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;

  while (page !== null) {
    const { items, nextPage } = await fetchFn(page);
    allItems.push(...items);
    page = nextPage;
  }

  return allItems;
}
```

### Step 4: Rate Limit Tracking

```typescript
// src/services/github/rate-limiter.ts
interface RateLimitState {
  remaining: number;
  resetAt: number;
  limited: boolean;
}

let rateLimit: RateLimitState = {
  remaining: 5000,
  resetAt: 0,
  limited: false,
};

export function trackRateLimit(response: Response): void {
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = response.headers.get('x-ratelimit-reset');

  if (remaining && reset) {
    rateLimit.remaining = parseInt(remaining, 10);
    rateLimit.resetAt = parseInt(reset, 10) * 1000;
    rateLimit.limited = rateLimit.remaining < 100;
  }
}

export function getRateLimitState(): RateLimitState {
  return rateLimit;
}
```

## Gotchas

- **PAT in Header Only**: Never put PAT in URL query params
- **Rate Limits**: Authenticated: 5000/hr, Unauthenticated: 60/hr
- **Truncated Files**: Files > 1MB are truncated, use `raw_url` to fetch full content
- **Pagination**: Default 30 per page, max 100 per page
- **Conditional Requests**: Use `If-None-Match` with ETag to save rate limit
- **API Version**: Always set `X-GitHub-Api-Version` header
- **File Names**: Gist files can have any name, not just extensions

## Required Outputs

- `src/services/github/gist-client.ts` - Main API client
- `src/services/github/fetch-with-auth.ts` - Authenticated fetch
- `src/services/github/pagination.ts` - Pagination helpers
- `src/services/github/rate-limiter.ts` - Rate limit tracking
- `src/services/github/types.ts` - TypeScript types
- `docs/api/github-gist.md` - API documentation

## Verification

```bash
# Type check
npm run typecheck

# Test API integration
npm run test:browser

# Verify rate limit handling
npm run test:offline
```

## References

- https://docs.github.com/en/rest/gists/gists - Gists API documentation
- https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api - Rate limits
- https://docs.github.com/rest/using-the-rest-api/using-pagination-in-the-rest-api - Pagination
- `AGENTS.md` - GitHub API rules
- `global-error-handling` skill - Error handling patterns
