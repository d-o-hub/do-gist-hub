---
name: global-error-handling
description: Define and implement complete error handling strategy including error taxonomy, boundaries, async failure handling, and user-safe messages with redacted diagnostics.
---

# Global Error Handling Skill

Implement comprehensive error handling across the application.

## When to Use

- Initial app architecture setup
- Adding error boundaries
- Implementing async error handling
- Creating error UI components
- Setting up error logging/monitoring

## Error Taxonomy

### Fatal Errors

Application cannot continue:
- `BOOTSTRAP_FAILURE` - App failed to initialize
- `INDEXEDDB_UNAVAILABLE` - Local storage not available
- `MIGRATION_FAILURE` - Database migration failed
- `SERVICE_WORKER_REGISTRATION_FAILED` - PWA registration failed
- `RENDER_CRITICAL_FAILURE` - Critical render error

### Recoverable Errors

User can retry or continue:
- `NETWORK_OFFLINE` - No internet connection
- `NETWORK_DNS_FAILURE` - DNS resolution failed
- `REQUEST_TIMEOUT` - Request took too long
- `REQUEST_ABORTED` - Request was cancelled
- `API_RATE_LIMITED` - GitHub API rate limit hit
- `API_SERVER_ERROR` - GitHub 5xx response
- `SYNC_CONFLICT` - Local and remote data conflict
- `STALE_DATA` - Data may be outdated

### Auth Errors

Authentication-related:
- `AUTH_INVALID_TOKEN` - PAT is invalid or expired
- `AUTH_PERMISSION_DENIED` - Token lacks required scopes
- `AUTH_NETWORK_FAILURE` - Auth request failed

### Validation Errors

Client-side validation:
- `VALIDATION_GIST_TITLE_REQUIRED` - Title is empty
- `VALIDATION_GIST_FILE_REQUIRED` - At least one file needed
- `VALIDATION_FILE_NAME_INVALID` - Invalid filename
- `VALIDATION_CONTENT_TOO_LARGE` - Content exceeds limits

## Error Boundary Components

See `references/error-handling-examples.md` for:
- Global error boundary implementation
- Route error boundary implementation

## Async Error Handling

### Structured Error Class

See `references/error-handling-examples.md` for:
- AppError class with ErrorCode enum
- ErrorContext interface
- toSafeObject() and getUserMessage() methods

### Fetch Error Handler

See `references/error-handling-examples.md` for:
- handleFetchError function mapping HTTP status to AppError
- Status code handling (401, 403, 429, 404, 5xx)

## Offline Detection

See `references/error-handling-examples.md` for:
- OfflineMonitor class with subscribe/destroy
- Online/offline event handling

## Error Messages Map

See `references/error-handling-examples.md` for:
- errorMessages record mapping ErrorCode to user-safe strings

## Safe Logging

See `references/error-handling-examples.md` for:
- redactSensitiveData function
- SENSITIVE_KEYS list
- logError function with redaction

## Gotchas

- **No Silent Failures**: Every promise rejection must be handled
- **No Raw Stack Traces**: Never show stack traces to users
- **No Secrets in Logs**: Always redact tokens and sensitive data
- **No Infinite Retries**: Use bounded retry with exponential backoff
- **No Spinner Dead Ends**: Always provide timeout and manual retry
- **Clear Offline States**: User must know when they are offline
- **Recovery Actions**: Offer next steps for recoverable errors

## Required Outputs

- `src/lib/errors/app-error.ts` - Error class and codes
- `src/lib/errors/error-messages.ts` - User-facing messages
- `src/components/error/global-error-boundary.tsx` - Global boundary
- `src/components/error/route-error-boundary.tsx` - Route boundary
- `src/components/error/fatal-error-screen.tsx` - Fatal error UI
- `src/components/error/retry-error-screen.tsx` - Recoverable error UI
- `src/services/network/offline-monitor.ts` - Online/offline detection
- `src/lib/logging/safe-logger.ts` - Redacted error logging
- `docs/api/error-handling.md` - Error handling documentation

## References

- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful
- `AGENTS.md` - Global error handling rules
