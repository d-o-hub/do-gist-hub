<!-- Last Audit: 2026-05-11 -->
# Sync Model

## Offline-First

IndexedDB is source of truth for reads. Network used only to hydrate/refresh.

## Optimistic Writes

Update UI immediately, sync in background. Full rollback on failure.

## Pending Queue

Queue writes when offline. Processes on connectivity restore. Pre-write conflict detection via `expectedRemoteVersion`. Exponential backoff with jitter (max 3 retries, 30s cap). Rate-limit aware (pauses when API limits critically low).

## Conflict Detection

Three strategies: `local-wins`, `remote-wins`, `manual`. Stored in IndexedDB metadata. Background Sync API registered in service worker.

---

*Created: 2026. Last Audit: 2026-05-11. Status: Verified against `src/services/sync/queue.ts`.*
