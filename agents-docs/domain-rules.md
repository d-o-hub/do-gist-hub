# Domain Rules

## Token Architecture

Tokens First → No hardcoded values → Primitive → Semantic → Component → Themeable → Responsive → DTCG-aligned

## Responsive Design

Mobile-first (320px) → 7 breakpoints (320/390/480/768/1024/1280/1536) → `clamp()` typography → 44x44px touch targets → `env(safe-area-inset-*)`

## Error Handling

Structured errors → User-safe messages → Recoverable actions → No silent failures → Bounded retries → Redacted diagnostics

## Security

Never log/expose PAT → Bearer auth only → Strict CSP → Input validation → HTTPS only → No secrets in commits

## Memory Prevention

AbortController for fetch → Route-scoped cleanup → No retained gist bodies → Bounded listener arrays

## Performance Budgets

Initial JS <150KB gz → Route chunks <50KB → Cold start <2s → Interactions <100ms → Lazy-load heavy features

## Offline-First

IndexedDB = source of truth → Optimistic writes → Pending sync queue → Exponential backoff → Conflict tracking

## GitHub API

Typed client → Pagination via `Link` headers → Rate limit tracking → `Accept: application/vnd.github+json`
