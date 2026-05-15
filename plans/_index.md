# plans/\_index.md — Active Plan Registry

> **Last updated**: 2026-05-15
> Agents: read this before starting any task. Update it when you change plan status.

---

## Active plans

| File                                          | Type        | Status      | Summary                                                 |
| --------------------------------------------- | ----------- | ----------- | ------------------------------------------------------- |
| `adr-022-2026-ui-trends-recommendations.md`   | ADR         | Proposed 🟡 | 2026 UI trends integration recommendations              |
| `strict-unused-vars.md`                       | Enforcement | Active 🟢   | Enforce strict `@typescript-eslint/no-unused-vars` rule |
| `019-swarm-analysis-codebase-improvements.md` | Analysis    | Active 🟢   | Full codebase audit via 5 coordinated swarm agents      |

## Archived

See `plans/archive/` for completed or superseded files moved here on 2026-05-15.

| File                                          | Status         | Notes                                                          |
| --------------------------------------------- | -------------- | -------------------------------------------------------------- |
| `archive/017-ui-ux-navigation-overhaul.md`    | Implemented ✅ | UI/UX navigation overhaul v2                                   |
| `archive/plan-ui-ux-modernization.md`         | Implemented ✅ | UI/UX modernization v3 — comprehensive responsive optimization |
| `archive/018-ci-offline-test-fix.md`          | Complete ✅    | CI offline test fix                                            |
| `archive/020-upstream-template-adaptation.md` | Complete ✅    | Upstream template adaptation                                   |
| `archive/021-progress-update-2026-05-01.md`   | Complete ✅    | v1 completion sprint progress                                  |
| `archive/022-pr106-recreation-progress.md`    | Complete ✅    | PR #106 recreation progress                                    |
| `archive/023-progress-update-2026-05-06.md`   | Complete ✅    | Progress update                                                |
| `archive/024-progress-update-2026-05-07.md`   | Complete ✅    | Progress update                                                |
| `archive/025-progress-update-2026-05-07.md`   | Complete ✅    | Progress update                                                |

## Active ADRs (accepted, not superseded)

| File                                                  | Summary                                |
| ----------------------------------------------------- | -------------------------------------- |
| `adr-001-reuse-do-gemini-token-system.md`             | Design token reuse from do-gemini      |
| `adr-002-web-first-pwa-capacitor.md`                  | Web-first PWA + Capacitor strategy     |
| `adr-003-indexeddb-v1.md`                             | IndexedDB as source of truth (v1)      |
| `adr-004-fine-grained-pat-v1.md`                      | Fine-grained PAT auth (v1)             |
| `adr-005-no-backend-v1.md`                            | No backend server (v1)                 |
| `adr-006-global-error-boundary-and-error-taxonomy.md` | Global error boundary + error taxonomy |
| `adr-007-csp-and-logging-redaction.md`                | CSP and logging redaction              |
| `adr-007-ui-ux-modernization.md`                      | UI/UX modernization                    |
| `adr-008-web-vitals-performance-budgets.md`           | Web Vitals + performance budgets       |
| `adr-009-abortcontroller-and-lifecycle-cleanup.md`    | AbortController + lifecycle cleanup    |
| `adr-010-sw-cache-name-derivation.md`                 | Service Worker cache name derivation   |
| `adr-011-unit-testing-vitest.md`                      | Vitest unit testing strategy           |
| `adr-012-pre-commit-workflow.md`                      | Pre-commit workflow                    |
| `adr-013-request-deduplication.md`                    | Request deduplication                  |
| `adr-014-exponential-backoff-sync.md`                 | Exponential backoff sync               |
| `adr-015-upstream-template-adaptation.md`             | Upstream template adaptation           |
| `adr-016-github-api-efficiency.md`                    | GitHub API efficiency                  |
| `adr-020-swarm-audit-phase-a.md`                      | Swarm audit Phase A                    |
| `adr-021-merge-strategy.md`                           | Merge strategy                         |

## Reference docs (foundational, stable)

These numbered plans document the project's foundation and are considered stable/complete:

| File                               | Summary                                   |
| ---------------------------------- | ----------------------------------------- |
| `000-project-charter.md`           | Project vision, mission, success criteria |
| `001-v1-scope.md`                  | v1 scope definition                       |
| `002-architecture.md`              | System architecture                       |
| `003-design-token-architecture.md` | Design token architecture                 |
| `004-responsive-system.md`         | Responsive system spec                    |
| `005-data-model.md`                | Data model                                |
| `006-sync-model.md`                | Sync model                                |
| `007-global-error-handling.md`     | Error handling strategy                   |
| `008-security.md`                  | Security model                            |
| `009-memory-safety.md`             | Memory safety                             |
| `010-performance-strategy.md`      | Performance strategy                      |
| `011-testing-strategy.md`          | Testing strategy                          |
| `012-android-packaging.md`         | Android packaging guide                   |
| `013-release-plan.md`              | Release plan                              |
| `015-community-workflow.md`        | Community contribution workflow           |
| `016-pwa-offline-page.md`          | PWA offline page                          |

---

## Quick reference: ADR numbers in use

`adr-001` through `adr-022` (gaps: 017-019 reserved)
**Next available ADR**: `adr-023`

**Next available plan number**: `026`
