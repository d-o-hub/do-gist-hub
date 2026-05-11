<!-- Last Audit: 2026-05-11 -->
# Data Model

## IndexedDB Stores (`src/services/db.ts`)

| Store | Key Path | Indexes | Purpose |
|-------|----------|---------|---------|
| `gists` | `id` | `by-updated-at`, `by-starred`, `by-sync-status` | Primary gist storage with sync metadata |
| `pendingWrites` | `id` (autoIncrement) | `by-created-at`, `by-gist-id` | Offline write queue with retry tracking |
| `metadata` | `key` | — | App settings, encryption key storage |
| `etags` | `url` | — | API response cache for conditional GETs |
| `logs` | `id` (autoIncrement) | `by-timestamp`, `by-level` | Structured app logs |

## Gist Record

- **Sync status**: `synced`, `pending`, `conflict`, or `error`
- **Version tracking**: `localVersion` and `remoteVersion` for conflict detection
- **File content**: Stored inline for offline access
- **Owner info**: Normalized from GitHub API (snake_case → camelCase)

## Pending Write Lifecycle

1. Operation queued with `action`, `payload`, and optional `expectedRemoteVersion`
2. Processes on connectivity restore with exponential backoff
3. Pre-write conflict check against `expectedRemoteVersion`
4. On success: removed from queue. On failure: retried up to 3 times

---

*Created: 2026. Last Audit: 2026-05-11. Status: Verified against `src/services/db.ts` schema v3.*
