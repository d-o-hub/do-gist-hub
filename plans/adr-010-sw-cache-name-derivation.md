<!-- Last Audit: 2026-05-06 -->

# ADR-010: Service Worker Cache Name Derivation from app.config.ts

**Status**: Implemented
**Date**: 2026-04-25
**Implemented**: 2026-05-06
**Deciders**: Architect, PWA Agent

## Context

The current `public/sw.js` hardcodes cache names (`d-o-gist-hub-v1`, `d-o-gist-hub-static-v1`, `d-o-gist-hub-api-v1`). AGENTS.md states these should derive from `src/config/app.config.ts` (`APP.cacheName`, `APP.staticCacheName`, `APP.apiCacheName`), but this propagation is not implemented.

This creates a maintenance risk: if `app.config.ts` changes, the service worker becomes inconsistent.

## Decision

Generate `sw.js` at build time from a TypeScript template, injecting cache names and other config from `app.config.ts`.

### Approach

1. Create `src/sw/sw.ts` — typed service worker source
2. Add a Vite plugin that compiles `sw.ts` and injects `APP` constants
3. Output to `public/sw.js` during build

### Implementation Details

```typescript
// src/sw/sw.ts
import { APP } from '../config/app.config';

const CACHE_NAME = APP.cacheName;
const STATIC_CACHE = APP.staticCacheName;
const API_CACHE = APP.apiCacheName;
```

### Build Integration

Extend `vite.config.ts` with a service worker build step:

- Use esbuild or rollup to compile `src/sw/sw.ts`
- Replace `process.env` or inline imports with actual values
- Write output to `dist/sw.js` (not `public/sw.js`, to avoid dev/build conflicts)

## Tradeoffs

### Pros

- Single source of truth for cache names
- Type safety in service worker
- Automatic cache busting on version change
- Consistent with existing Vite plugin pattern

### Cons

- Additional build complexity
- Service worker becomes a build artifact
- Requires careful handling of `import` in SW context

## Consequences

### Development

- `src/sw/sw.ts` is the only file to edit for SW logic
- Cache names automatically update when `app.config.ts` changes
- No manual synchronization needed

### Build

- Vite config grows slightly
- Need to handle SW compilation separately from main bundle
- SW should not use module imports in production (or use `importScripts`)

## Rejected Alternatives

### Option 1: Runtime fetch of config

Fetch `app.config.ts` at runtime from SW — rejected because service workers cannot easily import ES modules.

### Option 2: String replacement in existing sw.js

Keep `public/sw.js` as plain JS, add a Vite plugin that does string replacement — rejected because it lacks type safety and is fragile.

### Option 3: Leave as-is (hardcoded)

Current state — rejected because it violates the single-source-of-truth principle documented in AGENTS.md.

## Rollback Triggers

Roll back to hardcoded names if:

- Build complexity becomes unmaintainable
- Service worker compilation causes deployment issues
- Team prefers explicit manual cache name management

## References

- AGENTS.md: App Identity section
- `vite.config.ts`: Existing plugin patterns
- `src/config/app.config.ts`: Source of truth

---

_Created: 2026-04-25. Status: Implemented (2026-05-06)._

## Implementation Notes (2026-05-06)

- Created `src/sw/sw.ts` as TypeScript service worker template
- Added `swGeneratorPlugin()` to `vite.config.ts` using esbuild
- Build-time injection of `APP.staticCacheName` and build timestamp
- Removed legacy `public/sw.js` (now generated at `dist/sw.js`)
- All quality gates pass, CI green
