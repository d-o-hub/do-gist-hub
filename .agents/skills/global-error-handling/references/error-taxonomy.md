# Error Taxonomy Reference

Complete error code catalog and handling strategies for the Gist Hub application.

## Taxonomy Hierarchy

Errors are classified into four tiers by severity:

| Tier | Category | Recovery | User Impact |
|------|----------|----------|-------------|
| 1 | **Fatal** | App restart required | App cannot function |
| 2 | **Auth** | Re-authenticate | All API calls blocked |
| 3 | **Recoverable** | Retry or wait | Specific action failed |
| 4 | **Validation** | Fix input | Form rejected |

---

## Fatal Errors (Tier 1)

The application cannot continue. Show a full-screen fatal error screen with a reload action.

| Error Code | Cause | Strategy | User Message |
|------------|-------|----------|--------------|
| `BOOTSTRAP_FAILURE` | Vite app shell failed to mount, missing DOM elements | Reload page. Log full stack trace (redacted). | "The app failed to start. Please refresh the page." |
| `INDEXEDDB_UNAVAILABLE` | `indexedDB` API missing, blocked by privacy mode, or quota exceeded during init | Attempt fallback to in-memory store (limited). If that fails, show fatal screen. | "Local storage is not available. Some features may not work. Please ensure cookies and site data are enabled." |
| `MIGRATION_FAILURE` | IndexedDB schema migration threw during `onupgradeneeded` | Wipe DB, retry from v1. Warn user of data loss. | "Database update failed. Your local data was reset to fix a compatibility issue." |
| `SERVICE_WORKER_REGISTRATION_FAILED` | `navigator.serviceWorker.register` rejected | Log warning, continue without PWA offline caching. Not fatal for online use. | "Offline mode is not available in this browser. You will need internet to use the app." |
| `RENDER_CRITICAL_FAILURE` | Uncaught exception in top-level render loop | Catch in `GlobalErrorBoundary`. Show fatal screen. | "A critical rendering error occurred. Please refresh the page." |
| `CAPACITOR_UNAVAILABLE` | Capacitor runtime not found when running in Android WebView | Continue as web PWA. Log warning. | "Native features are unavailable. Running in web mode." |

### Handling Pattern

```typescript
// src/lib/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public cause?: unknown,
    public context?: Record<string, unknown>,
    public recoverable = true,
  ) {
    super(message);
    this.name = 'AppError';
  }

  isFatal(): boolean {
    return !this.recoverable && [
      ErrorCode.BOOTSTRAP_FAILURE,
      ErrorCode.INDEXEDDB_UNAVAILABLE,
      ErrorCode.MIGRATION_FAILURE,
      ErrorCode.RENDER_CRITICAL_FAILURE,
    ].includes(this.code);
  }

  toSafeObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.getUserMessage(),
      recoverable: this.recoverable,
      timestamp: Date.now(),
    };
  }
}
```

---

## Auth Errors (Tier 2)

All GitHub API requests fail. Show an auth error banner on every screen.

| Error Code | HTTP Status | Cause | Strategy | User Message |
|------------|-------------|-------|----------|--------------|
| `AUTH_INVALID_TOKEN` | 401 | PAT expired, revoked, or malformed | Clear cached user data. Redirect to settings. | "Your GitHub token is invalid or has expired. Please update it in Settings." |
| `AUTH_PERMISSION_DENIED` | 403 | PAT lacks required scopes (e.g., `gist`) | Show which scopes are missing. Link to GitHub token settings. | "Your token does not have the required permissions. Ensure it has the 'gist' scope." |
| `AUTH_NETWORK_FAILURE` | N/A (NetworkError) | DNS failure, CORS blocked, firewall | Check online status. If online, show network-specific message. | "Could not reach GitHub. Check your internet connection." |

### Handling Pattern

```typescript
// src/services/github/error-handler.ts
function mapAuthError(status: number, headers: Headers): AppError {
  const message = extractErrorMessage(headers); // redacted

  if (status === 401) {
    return new AppError(
      ErrorCode.AUTH_INVALID_TOKEN,
      'Token invalid or expired',
      { status },
      { action: 'github-auth', hint: 'redirect-to-settings' },
      true,
    );
  }

  if (status === 403) {
    const scopes = headers.get('x-oauth-scopes') ?? '';
    return new AppError(
      ErrorCode.AUTH_PERMISSION_DENIED,
      `Missing scopes. Required: gist. Current: ${scopes || 'none'}`,
      { status, scopes },
      { action: 'github-auth', hint: 'show-scopes-help' },
      true,
    );
  }

  return new AppError(
    ErrorCode.AUTH_NETWORK_FAILURE,
    'Network error during authentication',
    { status },
    { action: 'github-auth' },
    true,
  );
}
```

---

## Recoverable Errors (Tier 3)

A specific action failed. Show a toast or inline error with retry option.

| Error Code | HTTP Status | Cause | Strategy | User Message |
|------------|-------------|-------|----------|--------------|
| `NETWORK_OFFLINE` | N/A | `navigator.onLine === false` | Queue writes. Show offline banner. Auto-retry on reconnect. | "You are offline. Changes will sync when you reconnect." |
| `NETWORK_DNS_FAILURE` | N/A | DNS resolution failed | Suggest checking network. Do not retry aggressively. | "Could not resolve GitHub's address. Check your network settings." |
| `REQUEST_TIMEOUT` | N/A | AbortController timeout (default: 15s) | Retry with backoff (max 2). Show progress. | "Request timed out. Retrying..." |
| `REQUEST_ABORTED` | N/A | User navigated away, AbortController.abort() | Silently discard. No user message needed. | (none) |
| `API_RATE_LIMITED` | 429 | GitHub REST rate limit exceeded | Parse `x-ratelimit-reset`. Schedule retry. Show countdown. | "Rate limit exceeded. Try again in {countdown}." |
| `API_SECONDARY_RATE_LIMITED` | 403 + `abuse` in body | GitHub secondary rate limit (abuse detection) | Longer backoff (60s+). Parse `retry-after` header. | "Too many requests. Please wait a moment before trying again." |
| `API_SERVER_ERROR` | 500, 502, 503 | GitHub incident | Retry with exponential backoff (max 3). | "GitHub is experiencing issues. Please try again later." |
| `API_NOT_MODIFIED` | 304 | Conditional request (If-None-Match) matched | Return cached data. Not an error -- handle silently. | (none) |
| `SYNC_CONFLICT` | N/A | Local `updatedAt` < remote `updatedAt` and local has unsaved changes | Show conflict resolver UI. Let user choose local or remote. | "There is a conflict between your local changes and GitHub. Please review and resolve." |
| `STALE_DATA` | N/A | Data older than max-age threshold | Refresh in background. Show stale indicator. | "Data may be outdated. Last synced {time} ago." |
| `GIST_NOT_FOUND` | 404 | Gist deleted or ID invalid | Remove from local cache. Show not-found state. | "This gist no longer exists or you do not have access." |
| `FILE_TOO_LARGE` | 413 | Gist file exceeds 10MB GitHub limit | Reject before sending. Show size limit. | "File is too large. GitHub limits gist files to 10MB." |

### Retry Policy

```typescript
// src/lib/errors/retry-policy.ts
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableCodes: Set<ErrorCode>;
}

export const DEFAULT_RETRY: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10_000,
  retryableCodes: new Set([
    ErrorCode.NETWORK_OFFLINE,
    ErrorCode.REQUEST_TIMEOUT,
    ErrorCode.API_RATE_LIMITED,
    ErrorCode.API_SECONDARY_RATE_LIMITED,
    ErrorCode.API_SERVER_ERROR,
  ]),
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof AppError && !config.retryableCodes.has(error.code)) {
        throw error; // Non-retryable
      }

      if (attempt === config.maxAttempts) {
        break;
      }

      const delay = Math.min(
        config.initialDelayMs * Math.pow(2, attempt),
        config.maxDelayMs,
      );

      if (error instanceof AppError && error.code === ErrorCode.NETWORK_OFFLINE) {
        await waitForOnline(); // Blocks until navigator.onLine === true
      } else if (error instanceof AppError && error.code === ErrorCode.API_RATE_LIMITED) {
        await waitForRateLimitReset(error); // Uses x-ratelimit-reset
      } else {
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

---

## Validation Errors (Tier 4)

Client-side form validation. Show inline field errors.

| Error Code | Field | Cause | User Message |
|------------|-------|-------|--------------|
| `VALIDATION_GIST_DESCRIPTION_TOO_LONG` | description | Exceeds GitHub's description limit | "Description is too long. Maximum is 2000 characters." |
| `VALIDATION_GIST_FILE_REQUIRED` | files[] | No files attached | "Add at least one file to create a gist." |
| `VALIDATION_FILE_NAME_INVALID` | files[].filename | Empty, contains `/`, or `..` | "Filename cannot contain slashes or be empty." |
| `VALIDATION_FILE_NAME_DUPLICATE` | files[].filename | Same filename used twice | "Duplicate filename: '{name}'" |
| `VALIDATION_CONTENT_TOO_LARGE` | files[].content | File exceeds 10MB | "File content exceeds the 10MB limit." |
| `VALIDATION_PAT_EMPTY` | auth.pat | No token entered | "Enter your GitHub Personal Access Token." |
| `VALIDATION_PAT_INVALID_FORMAT` | auth.pat | Not a valid PAT format (`ghp_*` or `github_pat_*`) | "Token format is invalid. It should start with 'ghp_' or 'github_pat_'." |

### Handling Pattern

```typescript
// src/lib/errors/validation.ts
export class ValidationError extends AppError {
  constructor(
    public field: string,
    code: ErrorCode,
    message: string,
  ) {
    super(code, message, undefined, { field }, false);
    this.name = 'ValidationError';
  }
}

export function validateGistForm(form: GistForm): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!form.files || form.files.length === 0) {
    errors.push(new ValidationError(
      'files',
      ErrorCode.VALIDATION_GIST_FILE_REQUIRED,
      'Add at least one file to create a gist.',
    ));
  }

  for (const file of form.files ?? []) {
    if (!file.filename || file.filename.includes('/') || file.filename.includes('\\')) {
      errors.push(new ValidationError(
        `files[].filename`,
        ErrorCode.VALIDATION_FILE_NAME_INVALID,
        `Filename cannot contain slashes or be empty.`,
      ));
    }
    if (file.content && new Blob([file.content]).size > 10 * 1024 * 1024) {
      errors.push(new ValidationError(
        `files[].content`,
        ErrorCode.VALIDATION_CONTENT_TOO_LARGE,
        `File content exceeds the 10MB limit.`,
      ));
    }
  }

  return errors;
}
```

---

## Complete Error Code Enum

```typescript
// src/lib/errors/error-codes.ts
export enum ErrorCode {
  // Fatal
  BOOTSTRAP_FAILURE = 'BOOTSTRAP_FAILURE',
  INDEXEDDB_UNAVAILABLE = 'INDEXEDDB_UNAVAILABLE',
  MIGRATION_FAILURE = 'MIGRATION_FAILURE',
  SERVICE_WORKER_REGISTRATION_FAILED = 'SERVICE_WORKER_REGISTRATION_FAILED',
  RENDER_CRITICAL_FAILURE = 'RENDER_CRITICAL_FAILURE',
  CAPACITOR_UNAVAILABLE = 'CAPACITOR_UNAVAILABLE',

  // Auth
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',
  AUTH_NETWORK_FAILURE = 'AUTH_NETWORK_FAILURE',

  // Recoverable
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_DNS_FAILURE = 'NETWORK_DNS_FAILURE',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  REQUEST_ABORTED = 'REQUEST_ABORTED',
  API_RATE_LIMITED = 'API_RATE_LIMITED',
  API_SECONDARY_RATE_LIMITED = 'API_SECONDARY_RATE_LIMITED',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
  API_NOT_MODIFIED = 'API_NOT_MODIFIED',
  API_UNEXPECTED = 'API_UNEXPECTED',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  STALE_DATA = 'STALE_DATA',
  GIST_NOT_FOUND = 'GIST_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  NOT_FOUND = 'NOT_FOUND',

  // Validation
  VALIDATION_GIST_DESCRIPTION_TOO_LONG = 'VALIDATION_GIST_DESCRIPTION_TOO_LONG',
  VALIDATION_GIST_FILE_REQUIRED = 'VALIDATION_GIST_FILE_REQUIRED',
  VALIDATION_FILE_NAME_INVALID = 'VALIDATION_FILE_NAME_INVALID',
  VALIDATION_FILE_NAME_DUPLICATE = 'VALIDATION_FILE_NAME_DUPLICATE',
  VALIDATION_CONTENT_TOO_LARGE = 'VALIDATION_CONTENT_TOO_LARGE',
  VALIDATION_PAT_EMPTY = 'VALIDATION_PAT_EMPTY',
  VALIDATION_PAT_INVALID_FORMAT = 'VALIDATION_PAT_INVALID_FORMAT',
}
```

---

## Error-to-UI Mapping

| Error Tier | UI Component | Visibility |
|------------|-------------|------------|
| Fatal | `FatalErrorScreen` (full-screen overlay) | Blocks entire app |
| Auth | `AuthErrorBanner` (top bar) | Persists across routes |
| Recoverable | `ErrorToast` or inline error card | Per-action, dismissible |
| Validation | `FormFieldError` (inline) | Per-field, on submit |

## Security Rules for Errors

1. **Never** include the PAT value in error messages, context, or logs
2. **Never** expose raw stack traces in production UI
3. **Redact** `Authorization` headers in all error context objects
4. **Redact** response bodies that may contain user data from other users
5. **Use** `safe-logger.ts` for all error logging (automatically redacts sensitive keys)
6. **Map** HTTP 401/403 to generic messages -- do not reveal whether a resource exists
