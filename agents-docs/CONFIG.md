# Repository Configuration & Constants

> Single sources of truth, file size limits, retry configuration, and version management.

## App Identity: `src/config/app.config.ts`

This is the **canonical configuration** for the entire application. All other files derive their identity values from here.

```typescript
export const APP = {
  id: 'd-o-gist-hub',
  name: 'd.o. Gist Hub',
  shortName: 'd.o. Gists',
  description: '...',
  themeColor: '#2563eb',
  appId: 'com.dogisthub.app',
  dbName: 'd-o-gist-hub-db',
  cacheName: 'd-o-gist-hub-v1',
  staticCacheName: 'd-o-gist-hub-static-v1',
  apiCacheName: 'd-o-gist-hub-api-v1',
} as const;
```

### Propagation Matrix

| Target File | Derived Values | Mechanism |
|-------------|----------------|-----------|
| `package.json` | `name`, `description` | Manual sync (npm limitation) |
| `index.html` | `<title>`, meta desc, theme color | Vite plugin at build time |
| `public/manifest.webmanifest` | `name`, `short_name` | Vite plugin at build time |
| `capacitor.config.ts` | `appId`, `appName` | Vite plugin at build time |
| `src/services/db.ts` | `dbName` | Runtime import |
| `public/sw.js` | `cacheName`, `staticCacheName`, `apiCacheName` | Build-time string replacement |

**Rule**: Edit `src/config/app.config.ts` only. Vite plugins handle propagation automatically.

## File Size Limits

Enforced by `scripts/validate-skills.sh` and `scripts/analyze-codebase.sh`:

| File Type | Target | Hard Limit |
|-----------|--------|------------|
| Source files (`.ts`, `.css`) | < 400 lines | 500 lines |
| `SKILL.md` | < 200 lines | 250 lines |
| `AGENTS.md` | < 150 lines | 150 lines (may exceed for completeness) |

```bash
readonly FILE_SIZE_LIMIT_SOURCE=500
readonly FILE_SIZE_LIMIT_SKILL=250
readonly FILE_SIZE_LIMIT_AGENTS=150
```

**Agent Action**: If a file exceeds the limit during a task, decompose it or extract logic into new modules. Do not exceed limits without ADR justification.

## Commit Constraints

```bash
readonly GIT_COMMIT_TITLE_LIMIT=72
```

- Commit titles must be ≤ 72 characters
- Use conventional commits: `feat:`, `fix:`, `docs:`, `ci:`, `test:`, `refactor:`, `chore:`
- One logical change per commit
- `./scripts/quality_gate.sh` must pass before every commit

## Retry Configuration

```bash
readonly RETRY_MAX_ATTEMPTS=3
readonly RETRY_BACKOFF_MS=1000
```

| Parameter | Value | Usage |
|-----------|-------|-------|
| Max attempts | 3 | GitHub API calls, sync operations, network requests |
| Backoff base | 1000ms | Exponential: 1s, 2s, 4s between retries |

Implementation locations:
- `src/services/github/client.ts` — API retry wrapper
- `src/services/sync/queue.ts` — Background sync retry
- `src/lib/errors/` — Retry boundary logic

## Version Management

### Single Source of Truth: `VERSION` file

The `VERSION` file at repository root is the **only** authoritative version string.

```
0.1.0
```

### Derivation Chain

| File | Derivation Method |
|------|-------------------|
| `package.json` | Manually synced (npm does not support dynamic versions) |
| `README.md` | Read from `VERSION` during CI/CD |
| Git release tags | Must match `VERSION` exactly |
| `capacitor.config.ts` | Via Vite plugin from `app.config.ts` (which is manually aligned) |

**Rule**: Never hardcode version strings in source code. Read from `VERSION` at build time or runtime.

### Version Bump Workflow

1. Update `VERSION` file
2. Update `package.json` manually
3. Update `src/config/app.config.ts` if version appears there
4. Run `./scripts/quality_gate.sh`
5. Commit with `chore: bump version to X.Y.Z`
6. Tag release: `git tag vX.Y.Z` (must match `VERSION`)

## Constants Quick Reference

```bash
# File size limits
readonly FILE_SIZE_LIMIT_SOURCE=500
readonly FILE_SIZE_LIMIT_SKILL=250
readonly FILE_SIZE_LIMIT_AGENTS=150

# Git constraints
readonly GIT_COMMIT_TITLE_LIMIT=72

# Retry policy
readonly RETRY_MAX_ATTEMPTS=3
readonly RETRY_BACKOFF_MS=1000
```

## References

- `src/config/app.config.ts` — App identity source of truth
- `VERSION` — Version source of truth
- `AGENTS.md` — Code style and commit conventions
- `scripts/validate-skills.sh` — Size limit enforcement
