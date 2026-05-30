# plans/\_index.md — Active Plan Registry

> **Last updated**: 2026-05-30T12:00
> Agents: read this before starting any task. Update it when you change plan status.

---

## Active plans

| File                                          | Type        | Status      | Summary                                                                                                                      |
| --------------------------------------------- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `052-goap-ui-ux-modernization-completion.md`  | GOAP Plan   | Complete ✅   | Popover API command palette, Anchor Positioned tooltips, skeleton CSS extraction, hex codes → tokens, JSDOM polyfill           |
| `047-v0.3.0-scope.md`                         | Plan        | Complete ✅ | v0.3.0 scope: all code actions complete (auth telemetry, UX polish, DevEx/CI); F-Droid MR submission tracked externally |
| `053-progress-update-2026-05-21-playwright-cache-fix.md` | Progress | Complete ✅ | Playwright WebKit cache deps fix — system libs missing on cache hit |
| File                                          | Type        | Status      | Summary                                                                                                                      |
| --------------------------------------------- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `050-goap-plans-completion-v2.md`             | GOAP Plan   | Complete ✅ | Complete remaining deep audit: CI/CD fixes (6 workflows), CSS consolidation (command-palette, OKLCH shadows, unused classes), SW cache, token expiry UI, Retry-After header, 640px breakpoint, color-scheme, responsive nav fix, skill evals |
| `045-v0.2.0-release-and-auth-modernization.md` | GOAP Plan   | Complete ✅ | v0.2.0-rc.1 release, OAuth Device Flow, audit gaps completed |
| `046-post-release-and-v0.2.0-stable.md`       | GOAP Plan   | Complete ✅ | v0.2.0 stable promoted, F-Droid metadata, release CI hardened, v0.3.0 scoped |
| `048-codebase-audit-implementation-gaps-ci-docs.md` | GOAP Plan | Complete ✅ | All 27 GOAP actions complete: CI SHAs, auth telemetry, refresh tokens, tests, doc hygiene, CI hardening, CSS polish, LHCI dedup, skill evals |
| `adr-022-2026-ui-trends-recommendations.md`   | ADR         | Complete ✅ | All P0-P2 items implemented; dark mode first, variable fonts, bento grid, glassmorphism, spring physics, performance budgets |
| `strict-unused-vars.md`                       | Enforcement | Complete ✅ | `noUnusedVariables` enabled in biome.json, zero violations                                                                   |
| `019-swarm-analysis-codebase-improvements.md` | Analysis    | Complete ✅ | All CI/CD workflows, docs, security items implemented; SHA-pinned actions                                                    |
| `028-goap-phase-b-adr22-completion.md`        | GOAP Plan   | Complete ✅ | Time-based theming, container query expansion, ambient light blueprint, strict TS compliance                                 |
| `029-goap-phase-c-future-work.md`             | GOAP Plan   | Complete ✅ | Ambient light sensor, Android release signing, ProGuard, build-time CSS tokens, self-hosted fonts, scroll parallax           |
| `030-coverage-improvement-plan.md`            | Plan        | Complete ✅ | 81.88% line coverage, 941 tests across 51 files; all vitest thresholds exceeded                                              |
| `038-codebase-audit-recommendations-2026-05-16.md` | Audit       | Complete ✅ | All 4 sprints done. Sprint 4: coverage barrel exclusions, SW install tests, bento a11y tests, stale plan archiver, quick-tests CI, cross-browser CI, staleness indicators |
| `039-ui-ux-2026-modernization.md`             | Feature plan | Complete ✅ | Phase A: view transitions, OKLCH/color-mix, content-visibility, scroll-driven header, text-wrap, field-sizing. Phase B: speculation rules, accent hue knob |
| `adr-028-github-app-vs-pat-2026.md`           | ADR           | Accepted ✅  | Auth re-evaluation: keep fine-grained PAT; add opt-in OAuth Device Flow via thin Cloudflare Worker; defer GitHub App installation tokens |
| `040-goap-phase-d-039-phase-bc-completion.md` | GOAP Plan     | Complete ✅  | @scope blocks, OKLCH shadow tokens, Popover API command-palette, interpolate-size, accent-color, plan status hygiene |
| `adr-029-android-release-signing.md`           | ADR           | Accepted ✅  | Android release signing via CI — keystore from GitHub secrets, versionCode from GITHUB_RUN_NUMBER, versionName from VERSION |
| `041-goap-release-signing-and-plan040-completion.md` | GOAP Plan | Complete ✅ | Close Plan 040 gaps (@scope dedup, OKLCH shadow tokens) + wire release APK signing into CI |
| `042-goap-plans-completion-sprint.md` | GOAP Plan | Complete ✅ | Close P0 plan-audit gaps: rebuild stale design-tokens.css, fix plan status headers, promote ADR-015, add SW cache TTL, wire LH CI |
| `061-progress-update-2026-05-30-implementation-gaps.md` | Progress | Complete ✅ | Implementation gaps audit: ADR-016 lazy hydration missing, F-Droid MR not submitted, GOAP 060 zero implementation |

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
| `adr-022-2026-ui-trends-recommendations.md`           | 2026 UI trends integration             |
| `adr-022-ambient-light-extension.md`                  | Ambient light sensor theming — implemented in Phase C (029)  |
| `adr-026-phase-a-modernization-goap.md`               | Phase A modernization GOAP             |
| `adr-027-ci-node24-android-hardening.md`               | CI Node 24 migration, Android build hardening                 |
| `adr-029-android-release-signing.md`                    | Android release signing via CI — ADR-029                      |
| `adr-030-github-pages-deployment.md`                   | GitHub Pages deployment — all actions A1-A8 complete, site live at https://d-o-hub.github.io/do-gist-hub/ — Complete |
| `adr-031-playwright-webkit-deps-ci.md`                 | Playwright WebKit must use --with-deps on cache miss for system libs — Accepted |
| `adr-032-vitest-environment-teardown.md`               | Mock transitively resolved modules to prevent vitest teardown errors — Accepted |
| `adr-033-webkit-indexeddb-flaky-tests.md`              | Skip WebKit tests with unreliable IndexedDB on Linux — Accepted |

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

## GOAP & Analysis plans

| File                                          | Type          | Status      | Summary                                                                          |
| --------------------------------------------- | ------------- | ----------- | -------------------------------------------------------------------------------- |
| `026-goap-analysis-current.md`                | Analysis      | Complete ✅ | ADR-vs-implementation gap audit; all P1 items resolved                           |
| `025-progress-update-2026-07-18.md`           | Progress      | Complete ✅ | Consolidated update: ADR compliance, infrastructure, UI modernization, TRIZ audit |
| `031-progress-update-coverage-pr156.md`       | Progress      | Complete ✅ | PR #156 merged: 790 tests, 47 files, 81.88% line coverage                        |
| `032-progress-update-swarm-merge-pr156.md`    | Progress      | Complete ✅ | Swarm coordination: merge PR #156, update plans, compact learnings               |
| `033-progress-update-2026-05-15-plans-completion.md` | Progress | Complete ✅ | Dark mode first, noUnusedVariables, SHA-pinned actions, dialog AbortController   |
| `034-progress-update-swarm-plans-audit.md`            | Progress | Complete ✅ | Plans audit, teardown fix, ADR-022 promoted from backlog to complete              |
| `041-goap-release-signing-and-plan040-completion.md`  | GOAP     | Complete ✅ | Close Plan 040 gaps + wire release APK signing into CI       |
| `042-goap-plans-completion-sprint.md`                  | GOAP     | Complete ✅   | Close P0 plan-audit gaps: rebuild stale design-tokens.css, fix plan status headers, promote ADR-015, add SW cache TTL, wire LH CI |
| `049-progress-update-2026-05-19-plan048-completion.md` | Progress | Complete ✅   | Progress update for plan 048 completion |
| `051-progress-update-2026-05-20-tdz-circular-dep-fix.md` | Progress | Complete ✅ | Diagnosed and fixed circular dependency TDZ ReferenceError (db.ts ↔ logger.ts) |
| `054-upstream-template-impact-analysis.md`           | Analysis        | Complete ✅ | Analysis of gaps between upstream github-template-ai-agents v0.2.9 and current repo state |
| `055-goap-plan-registry-implementation-gaps.md`  | GOAP          | Complete ✅ | Plan registry hygiene: goap counter fix, ADR-030 promotion, schema fix, status consistency, sync badge tokens |
| `050-goap-plans-completion-v2.md`              | GOAP          | Complete ✅ | Complete remaining plan 048 deep audit items: CI/CD fixes, CSS consolidation, SW cache, token expiry UI, Retry-After header, 640px breakpoint, color-scheme |
| `056-goap-upstream-sync-phase-a.md`              | GOAP          | Complete ✅ | Shell injection hardening, ShellCheck zero-tolerance, .shellcheckrc, CI integration, pre-commit shfmt hook |
| `058-goap-cross-browser-webkit-fix.md`              | GOAP          | Complete ✅ | Fix WebKit 58-test failure: add --with-deps to playwright install step |
| `059-goap-resolve-pre-existing-ci-issues.md`              | GOAP          | Complete ✅ | Fix vitest EnvironmentTeardownError and WebKit flaky star-toggle test |
| `060-goap-plain-text-paste-llm-gist-creation.md`          | GOAP          | Active      | Plain text paste parser, LLM-assisted gist creation, drag-and-drop file import |
| `061-progress-update-2026-05-30-implementation-gaps.md`    | Progress      | Complete ✅ | Implementation gaps audit: ADR-016 lazy hydration missing, F-Droid MR not submitted, GOAP 060 zero implementation |

## Quick reference: ADR numbers in use

`adr-001` through `adr-033` (gaps: 017-019 reserved)
**Next available ADR**: `adr-034`
**Next available plan/GOAP number**: `062`
**Next available GOAP action number**: New GOAP plan = `062`
