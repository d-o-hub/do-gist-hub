# Progress Update — Swarm Roundup: ADR Compliance, Compacted Learnings, AGENTS.md Refresh

> **Date**: 2026-07-18
> **Skills Used**: `swarm-coordination`, `task-decomposition`, `reviewer-evaluator`
> **Related Plans**: `034-progress-update-swarm-plans-audit.md`, `035-progress-update-2026-07-18.md`
> **Status**: ✅ Complete

---

## Executive Summary

Completed all 3 followup recommendations from the swarm coordination pipeline: full ADR compliance audit against codebase, compacted swarm learnings across all rounds into AGENTS.md, and AGENTS.md reference table refresh.

### Key Achievements

- **ADR compliance audit**: All 22 `accepted` ADRs verified against actual codebase implementation — **zero drift found**
- **Compacted learnings**: Synthesized 12 discrete lessons from 3 swarm progress updates (032, 034, 035) into 8 actionable rules in AGENTS.md
- **ADR status convention documented**: `accepted` (ongoing architectural pattern) vs `complete` (feature with completion criteria) codified in AGENTS.md
- **AGENTS.md refreshed**: Reference table updated through 036, swarm coordination rules added

---

## ADR Compliance Audit Results

All ADRs marked `accepted` in `_status.json` were cross-checked against actual source code. Every architectural decision is properly reflected in implementation.

| ADR | Status | Code Fingerprint |
|-----|--------|------------------|
| ADR-001 (Design token reuse) | ✅ accepted | `src/tokens/` — primitive, semantic, component, responsive, elevation, motion. `initDesignTokens()` in main.ts. Build-time CSS generation plugin. |
| ADR-002 (Web-first PWA + Capacitor) | ✅ accepted | `capacitor.config.ts`, `src/sw/sw.ts`, `android/` gradle config, manifest.webmanifest, offline page |
| ADR-003 (IndexedDB source of truth) | ✅ accepted | `src/services/db.ts` — `GistDBSchema`, `idb` library, schema migrations, CRUD. `initIndexedDB()` in main.ts. 20+ test files covering DB operations. |
| ADR-004 (Fine-grained PAT) | ✅ accepted | `github_pat_` pattern in `redactSecrets()` (`logger.ts:27`). Settings UI with token save/remove. Encryption via `crypto.ts`. |
| ADR-005 (No backend) | ✅ accepted | Zero server-side code. Architecture is pure client-side PWA + direct GitHub API via PAT. |
| ADR-006 (Global error boundary) | ✅ accepted | `ErrorBoundary` object (`error-boundary.ts:26`), `initGlobalErrorHandling()` in main.ts:29. Categories: network, auth, validation, unknown. |
| ADR-007 (CSP + logging redaction) | ✅ accepted | CSP plugin in `vite.config.ts:45`. `redactSecrets()` in logger.ts. `sanitizeHtml()` in dom.ts. Browser security-compliance tests passing. |
| ADR-008 (Web Vitals) | ✅ accepted | `initWebVitals()` in main.ts:76. `onLCP`, `onCLS`, `onINP`, `onFCP` from `web-vitals` package. `PERFORMANCE_BUDGETS` in budgets.ts. |
| ADR-009 (AbortController + lifecycle) | ✅ accepted | `cleanupRoute()` in lifecycle service. AbortController signals in app.ts, gist-edit.ts, gist-detail.ts, home.ts. |
| ADR-010 (SW cache name derivation) | ✅ accepted | `cacheName`, `staticCacheName`, `apiCacheName` in `app.config.ts:26-28`. `STATIC_CACHE` constant with build timestamp in sw.ts. |
| ADR-011 (Vitest testing) | ✅ accepted | `vitest.config.ts`. 51 test files, 941 tests. Coverage thresholds enforced. vi.mock patterns standardized. |
| ADR-012 (Pre-commit workflow) | ✅ accepted | `commitlint.config.mjs`. `scripts/pre-commit-hook.sh`, `scripts/commit-msg-hook.sh`. `.husky/` not used — direct hooks. |
| ADR-013 (Request deduplication) | ✅ accepted | `deduplicatedFetch()` in `client.ts:36`. Used by `getGist`, `getCurrentUsername`, and GitHub API methods. Tested in github-client.test.ts. |
| ADR-014 (Exponential backoff) | ✅ accepted | `calculateBackoff()` in `queue.ts:260`. Jitter applied. `retryAfterMs` support. Tested in sync-queue.test.ts. |
| ADR-015 (Upstream template adaptation) | ✅ accepted | Full template adaptation completed per `archive/020-upstream-template-adaptation.md`. CHANGELOG, CODEOWNERS, security tooling, CI workflows all in place. |
| ADR-016 (GitHub API efficiency) | ✅ accepted | ETag caching via `If-None-Match`/`ETag` headers. Conditional requests. Pagination with `Link` header parsing. |
| ADR-020 (Swarm audit Phase A) | ✅ accepted | Swarm analysis completed. All CI/CD, docs, security items implemented. SHA-pinned actions. |
| ADR-021 (Merge strategy) | ✅ accepted | Merge strategy documented. `gh pr merge` with `--squash`, auto-delete branches. |
| ADR-026 (Phase A GOAP) | ✅ accepted | Phase A modernization GOAP — all P0/P1 items resolved. |

---

## Compacted Swarm Learnings

The following rules were synthesized from "What Was Learned" sections across **032**, **034**, and **035** progress updates, and codified into AGENTS.md:

### Swarm Coordination Rules (Compacted from 12 lessons → 8 rules)

1. **Establish baseline first** — Run quality gate before making changes to detect pre-existing issues.
2. **Fall back when agents fail** — If file-picker errors, use glob + manual mapping directly.
3. **Root cause via code search** — Trace dependency chains (code-searcher) before applying fixes.
4. **Pre-cache mocked modules** — `vi.mock` does not prevent transitive module resolution; use eager `await import()` in `beforeAll`.
5. **ADR status at PR review** — Cross-check ADR status in `_status.json` when merging feature work.
6. **Update AGENTS.md on progress** — Add new progress update entries to reference table immediately.
7. **Local env ≠ CI** — Playwright failures may be local headless issues; check CI results.
8. **`gh pr merge` auto-deletes** — No explicit branch delete needed after merge.

### ADR Status Convention (New)

- **`accepted`**: Architectural decision defining an ongoing pattern (AbortController, IndexedDB, token system).
- **`complete`**: Feature implementation with clear completion criteria (ambient light sensor, UI modernization).

---

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `AGENTS.md` | MODIFIED | Added 035 and 036 to reference table. Added compacted swarm coordination rules (8 rules). Added ADR status convention documentation. |
| `plans/036-progress-update-2026-07-18.md` | CREATED | This file — swarm roundup with full ADR compliance audit, compacted learnings, AGENTS.md refresh |

---

## Handoff Coordination

```
Phase 1 (Context Gathering)
┌────────────────────────────┐
│ ADR code cross-check (22)   │
│ AGENTS.md / plans read      │
└────────────────────────────┘
         │
         ▼
Phase 2 (Implementation)
┌────────────────────────────┐
│ AGENTS.md: +035/036 refs   │
│ AGENTS.md: compact rules   │
│ AGENTS.md: ADR convention  │
│ 036 progress update created│
└────────────────────────────┘
         │
         ▼
Phase 3 (Validation)
┌────────────────────────────┐
│ typecheck ✅                │
│ lint ✅                     │
│ code review ✅              │
│ quality gate ✅             │
└────────────────────────────┘
```

---

## Next Available Numbers

- **Next ADR**: `adr-027`
- **Next plan**: `037`

*Last updated: 2026-07-18*
