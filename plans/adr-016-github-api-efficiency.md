# ADR 016: GitHub API Efficiency - ETags and Lazy Hydration

## Status
Accepted

## Context
The application fetches full gist content eagerly and doesn't use HTTP caching headers, leading to unnecessary bandwidth consumption and faster rate limit exhaustion.

## Decision
1. **Conditional GET with ETags**: Implement ETag caching in IndexedDB. Use `If-None-Match` header in GitHub API requests. Handle 304 Not Modified responses by returning cached data.
2. **Lazy Content Hydration**: Modify the Gist store and list API usage to fetch only gist metadata (without file content) during bulk sync. Fetch full file content only when a specific gist is opened for viewing.
3. **Rate Limit Awareness**: Enhanced sync queue to pause operations when GitHub API rate limits are critically low (remaining < 10).

## Consequences
- Reduced bandwidth usage for repeated syncs.
- Improved application startup performance by reducing the initial payload size.
- Better protection against GitHub API rate limit exhaustion.
