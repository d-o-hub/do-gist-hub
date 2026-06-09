# 048 — Codebase Audit: Implementation Gaps, CI Failings & Doc Hygiene

> **Status**: Complete
> **Type**: GOAP
> **Created**: 2026-05-19
> **Updated**: 2026-05-19
> **Owner**: agent
> **Related**: 046-post-release-and-v0.2.0-stable.md, 047-v0.3.0-scope.md, adr-028-github-app-vs-pat-2026.md, adr-029-android-release-signing.md

---

## Context

Top-to-bottom audit of the codebase after `main` at commit `45fb525`. This plan catalogues every gap found across implementation, CI/CD, tests, docs, and agent infrastructure — and tracks remediation actions.

### Audit Method

1. Pulled latest `origin/main` (`45fb525`)
2. Deep-analyzed `src/` for stubs, unimplemented functions, missing ADR features
3. Read all 19 GitHub Actions workflow files for SHA pinning, security, correctness
4. Inventoried all unit and E2E test files, identified coverage gaps and orphaned tests
5. Verified every doc file (README, CONTRIBUTING, SECURITY, CHANGELOG, agents-docs, skills)
6. Cross-checked `plans/_status.json` and `plans/_index.md` against filesystem reality

---

## P0 — Critical (Blocks releases or CI)

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| P0-1 | **`dorny/paths-filter@de22dfa…` SHA does not exist** — the `quick-tests` CI job references a non-existent commit SHA. The valid SHA for v3.0.3 is `d1c1ffe0248fe513906c8e24db8ea791d46f8590`. | CI `quick-tests` job fails on path-filter invocation | `.github/workflows/ci.yml:148` |
| P0-2 | **`vacxe/firebase-test-lab-action@586e99…` SHA does not exist** — no v1 tag exists for this action; the latest is v0.0.6 at `bab7fe412819d0ac601b64c288ee0819a91ccf91`. | Release CI Firebase Test Lab step fails if `FIREBASE_SERVICE_ACCOUNT` secret is set | `.github/workflows/release.yml:88` |
| P0-3 | **Release workflow has no CI gate** — `release.yml` triggers on tag push without requiring CI to pass first. A broken main branch can be released. | Broken code shipped as a release | `.github/workflows/release.yml` |
| P0-4 | **`release.yml` uses `--no-frozen-lockfile`** — allows dependency drift between CI and release builds. | Release binary may differ from what CI tested | `.github/workflows/release.yml:36` |

---

## P1 — High (Functional gaps / stale docs)

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| P1-1 | **Auth telemetry not implemented** — ADR-028 calls for counting `auth.method = pat | device-flow` to validate the friction hypothesis. No tracking code exists. | Cannot measure OAuth adoption; ADR-028 hypothesis untestable | `src/services/github/auth.ts`, `src/routes/settings.ts` |
| P1-2 | **No refresh token handling** — GitHub Device Flow tokens expire in 8 hours. ADR-028 specifies storing `refresh_token` and transparent 401→refresh→retry. Neither exists. | Users must manually re-authenticate every 8 hours | `src/services/github/device-flow.ts` |
| P1-3 | **No automatic token revalidation on 401** — `revalidateToken()` exists in `auth.ts` but is never called from the GitHub client error handler. Token expiry causes silent API failures. | Silent data staleness instead of transparent recovery | `src/services/github/client.ts`, `src/services/github/auth.ts` |
| P1-4 | **`device-flow.ts` has 0% test coverage** — 232 lines of auth logic with no unit test. The most coverage-critical module in the codebase is completely untested. | Risk of regressions in oauth flow; mutations in this file are undetected | `src/services/github/device-flow.ts` → no `tests/unit/device-flow.test.ts` |
| P1-5 | **4 orphaned `.spec.ts` files never executed** — `tests/unit/` contains files using `@playwright/test` and `node:test` that are not picked up by Vitest or Playwright (which scans `tests/browser/`). 404 lines of dead test code. | Tests appear to exist but provide no protection | `tests/unit/github-client.spec.ts`, `gist-store.spec.ts`, `conflict-detector.spec.ts`, `rate-limiter.spec.ts` |
| P1-6 | **`CONTRIBUTING.md` says "npm (or pnpm)"** — project migrated to pnpm exclusively. This contradicts AGENTS.md and CHANGELOG. | New contributors may use wrong package manager | `CONTRIBUTING.md:27` |
| P1-7 | **`SECURITY.md` supported versions lists "0.1.x"** — current VERSION is `0.2.0`. | Misleading support scope | `SECURITY.md:7` |
| P1-8 | **`agents-docs/HOOKS.md` references "ESLint with project rules" and "Prettier consistency"** — project migrated to Biome. Tools reference is stale. | Confusing guidance for agents reading hook docs | `agents-docs/HOOKS.md:70,73` |
| P1-9 | **`agents-docs/CONTEXT.md` references two non-existent files** — `SUB-AGENTS.md` and `HARNESS.md` (lines 123-124). | 404 reference; dead learning path | `agents-docs/CONTEXT.md` |
| P1-10 | **`available-skills.md` missing `swarm-coordination`** — lists 24 skills but 25 exist. AGENTS.md claims "25 skills". | Inconsistency between canonical docs and reality | `agents-docs/available-skills.md` |

---

## P2 — Medium (CI hardening, coverage, doc hygiene)

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| P2-1 | **`ci.yml` SHA-pin audit uses `continue-on-error: true`** — broken SHAs won't block the pipeline, weakening enforcement. | Invalid SHAs can slip through | `.github/workflows/ci.yml:181` |
| P2-2 | **Lighthouse CI runs twice on PRs** — both `ci.yml` bundle-budget job and `lighthouse.yml` run `lhci autorun` on pull requests. | Wasted CI minutes; confusing duplicate results | `.github/workflows/ci.yml:130`, `.github/workflows/lighthouse.yml` |
| P2-3 | **Security scan audit level inconsistency** — `security-scan.yml` uses `--audit-level critical` while `ci.yml` uses `--audit-level high`. Security scan is less strict than CI. | Inconsistent vulnerability gating | `.github/workflows/security-scan.yml:51` vs `ci.yml:29` |
| P2-4 | **`npx --yes lhci autorun` in `ci.yml` is unpinned** — `lighthouse.yml` pins to `@0.14.x` but `ci.yml` uses no version constraint. | Supply chain risk in CI | `.github/workflows/ci.yml:130` |
| P2-5 | **`commitlint.yml` uses `--no-frozen-lockfile`** — inconsistent with other CI workflows; allows dependency drift. | Inconsistent CI reproducibility | `.github/workflows/commitlint.yml:29` |
| P2-6 | **`audit-actions.yml` uses tag-object SHA for `github-script`** — `d746ffe…` is a tag object SHA, not the commit SHA `3a2844b7…`. Works via GitHub resolution but inconsistent with project convention. | Minor inconsistency; could become an issue if GitHub changes resolution | `.github/workflows/audit-actions.yml:83` |
| P2-7 | **3 skills missing `evals/evals.json`** — `agent-browser`, `codebase-optimizer`, and `swarm-coordination` have no eval test cases. Per SKILL.md authoring guide, "at least 3-5 realistic test cases" are required. | Skills are unevaluated; quality not measured | `.agents/skills/{agent-browser,codebase-optimizer,swarm-coordination}/` |
| P2-8 | **`.agents/skills/skills` circular symlink** — points to `../.agents/skills` (itself). Creates infinite traversal. | `find` or recursive walks may hang or error | `.agents/skills/skills` |
| P2-9 | **Bold kinetic typography (ADR-022 P3) not implemented** — no 8-10rem hero text styles exist. `detail-title` peaks at ~4.2rem. | ADR-022 P3 item missing | `src/styles/base.css` |
| P2-10 | **`@starting-style` CSS not implemented** — Plan 039 Phase B/C called for entry animations for popover/dialog elements. No `@starting-style` blocks found. | Missing animation polish | `src/styles/` |
| P2-11 | **`overlay: auto` CSS not implemented** — Plan 040 Phase C called for CSS `overlay: auto` for layered dismiss transitions with Popover API. Not present. | Missing transition polish | `src/styles/` |
| P2-12 | **Low branch coverage on key modules** — `main.ts` (37.5%), `settings.ts` (56.33%), `app.ts` (61.31%), `gist-card.ts` (65%). | Untested paths may contain bugs | `tests/unit/` |
| P2-13 | **`cross-browser.yml` installs Playwright browsers unconditionally** — no conditional cache-hit check (unlike `ci.yml`). | Wasted CI minutes on cache hits | `.github/workflows/cross-browser.yml:38` |
| P2-14 | **`CHANGELOG.md` v0.2.0-rc.1 section** uses unlabeled "What's new?" heading instead of standard `### Added / ### Changed / ### Fixed` format; v0.2.0 stable entry only has 2 bullets while rc.1 has the full changelog. | Inconsistent changelog format | `CHANGELOG.md` |
| P2-15 | **`agents-docs/CONFIG.md` shows `0.1.0` as example version** — current is `0.2.0`. | Stale example | `agents-docs/CONFIG.md:90` |
| P2-16 | **README.md version badge shows `0.1.0`** — should show `0.2.0`. | Misleading version display | `README.md:3` |

---

## P3 — Low (Nice to fix)

| # | Issue | Impact | Location |
|---|-------|--------|----------|
| P3-1 | **`yaml-lint.yml` downloads actionlint via `curl | bash`** with no integrity check. | Supply chain risk | `.github/workflows/yaml-lint.yml:29` |
| P3-2 | **`security-scan.yml` does no SAST** (CodeQL/Semgrep) beyond ShellCheck and GitLeaks; no SARIF upload to GitHub Security tab. | Limited security visibility | `.github/workflows/security-scan.yml` |
| P3-3 | **`audit-actions.yml` only checks deprecated Node runtimes** — does not validate that SHA pins resolve to real commits. The broken `dorny/paths-filter` SHA passes the audit. | False sense of security | `.github/workflows/audit-actions.yml` |
| P3-4 | **`agents-docs/references/` directory is empty** — skills reference files that may not exist here. | Dead directory reference | `agents-docs/references/` |
| P3-5 | **`codebase-optimizer` skill has only `SKILL.md`** — no `references/` or `evals/` subdirectories. Thinner than all other skills. | Incomplete skill | `.agents/skills/codebase-optimizer/` |
| P3-6 | **Ambient light architecture deviation** — ADR-022 extension specified `cleanupAmbientSensor()` in `lifecycle.ts`, but it is in `ambient-light.ts` instead. Functionally equivalent but architecturally different from the ADR. | ADR drift | `src/components/ui/ambient-light.ts` vs `plans/adr-022-ambient-light-extension.md` |
| P3-7 | **`main.ts` trailing comment `// CI trigger test`** on line 89 — appears to be a leftover test artifact. | Code smell | `src/main.ts:89` |
| P3-8 | **`agents-docs/detected/` referenced in README.md** but directory does not exist (only `issues/`, `fixes/`, `resolved/`, `patterns/`). | Dead reference | `agents-docs/README.md` |

---

## GOAP Actions

| # | Action | Precondition | Effect | Cost | Status |
|---|--------|-------------|--------|------|--------|
| 1 | Fix `dorny/paths-filter` SHA to valid commit `d1c1ffe0248fe513906c8e24db8ea791d46f8590` | P0-1 identified | CI quick-tests job passes | XS | ✅ |
| 2 | Fix `vacxe/firebase-test-lab-action` SHA or pin to v0.0.6 at `bab7fe412819d0ac601b64c288ee0819a91ccf91` | P0-2 identified | Release CI Firebase step works when secret is set | XS | ✅ |
| 3 | Add CI gate to `release.yml` (require CI workflow_run) | P0-3 identified | Broken code cannot be released | S | ✅ |
| 4 | Change `release.yml` to `--frozen-lockfile` | P0-4 identified | Release builds are reproducible | XS | ✅ |
| 5 | Add auth telemetry (`auth.method` counter + time-to-first-call timer) | P1-1, Plan 047 G2 | OAuth adoption measurable | S | ✅ |
| 6 | Add transparent 401→revalidate→retry flow in github client | P1-2, P1-3 | Tokens refresh automatically; users aren't logged out after 8h | M | ✅ |
| 7 | Write `tests/unit/device-flow.test.ts` | P1-4 identified | Device flow auth covered by tests | S | ✅ |
| 8 | Migrate or remove 4 orphaned `.spec.ts` files | P1-5 identified | All test code is executed | S | ✅ |
| 9 | Fix `CONTRIBUTING.md` npm→pnpm | P1-6 identified | Contributors use correct package manager | XS | ✅ |
| 10 | Update `SECURITY.md` version table to 0.2.x | P1-7 identified | Accurate support scope | XS | ✅ |
| 11 | Update `agents-docs/HOOKS.md` ESLint/Prettier→Biome | P1-8 identified | Accurate tooling reference | XS | ✅ |
| 12 | Create or remove `CONTEXT.md` references to SUB-AGENTS.md and HARNESS.md | P1-9 identified | No dead doc references | XS | ✅ |
| 13 | Add `swarm-coordination` to `available-skills.md` | P1-10 identified | Skill list accurate (25/25) | XS | ✅ |
| 14 | Change `ci.yml` SHA-pin audit from `continue-on-error: true` to `false` | P2-1 identified | Invalid SHAs block CI | XS | ✅ |
| 15 | Deduplicate Lighthouse CI — remove from `lighthouse.yml` PR trigger | P2-2 identified | No wasted CI minutes | XS | ✅ |
| 16 | Align `security-scan.yml` audit level to `high` | P2-3 identified | Consistent vulnerability gating | XS | ✅ |
| 17 | Pin `lhci` version in `ci.yml` bundle-budget job to `@0.14.x` | P2-4 identified | Reproducible CI builds | XS | ✅ |
| 18 | Change `commitlint.yml` to `--frozen-lockfile` | P2-5 identified | Consistent CI reproducibility | XS | ✅ |
| 19 | Replace `audit-actions.yml` `github-script` SHA with commit SHA `3a2844b7e9c422d3c10d287c8955737108da1b3` | P2-6 identified | Consistent SHA pinning | XS | ✅ |
| 20 | Add evals for `agent-browser`, `codebase-optimizer`, `swarm-coordination` skills | P2-7 identified | All 25 skills evaluated | M | ✅ |
| 21 | Remove `.agents/skills/skills` circular symlink | P2-8 identified | No infinite directory traversal | XS | ✅ |
| 22 | Implement `@starting-style` for popover/dialog entry animations | P2-10 identified | Plan 039 Phase B/C complete | S | ✅ |
| 23 | Implement `overlay: auto` for layered Popover API transitions | P2-11 identified | Plan 040 Phase C complete | S | ✅ |
| 24 | Update `README.md` version badge from `0.1.0` to `0.2.0` | P2-16 identified | Correct version display | XS | ✅ |
| 25 | Update `CHANGELOG.md` v0.2.0-rc.1 section format | P2-14 identified | Consistent changelog format | XS | ✅ |
| 26 | Update `agents-docs/CONFIG.md` example version to `0.2.0` | P2-15 identified | Accurate example | XS | ✅ |
| 27 | Remove `// CI trigger test` comment from `main.ts:89` | P3-7 identified | Clean code | XS | ✅ |

---

## Deep Audit: ADR Implementation Gaps

Each ADR was cross-checked against actual `src/` code. The following gaps were found beyond those already listed:

### ADR-001: Token Architecture (95%)

- **No contrast linting rule** — tokens define colors but no automated WCAG AA contrast checking exists.
- **Hardcoded CSS values persist** — `rgba()` and pixel values in `base.css`, `navigation.css`, `modern-glass.css`, `command-palette.css`, `accessibility.css` violate the "tokens only" rule from ADR-001. Duplicate shadow definitions in hand-authored CSS bypass the TypeScript token pipeline.

### ADR-003: IndexedDB (85%)

- **Missing stores from spec** — ADR specifies `favorites`, `drafts`, `searchCache`, `cachedRevisions` stores. Implementation has `metadata` (covers `settings`/`syncState`) and `etags` (partially covers `cachedRevisions`), but no `favorites`, `drafts`, or `searchCache` stores. Starred status is a field on `GistRecord` rather than a separate store.

### ADR-008: Web Vitals Performance Budgets (90%)

- **No `.lighthouserc.js`** — Lighthouse CI config only exists as `.lighthouserc.json`; no JS variant for programmatic config.
- **Budgets only enforced at build time** — no runtime budget warnings surfaced to users or CI directly beyond dev console logs.

### ADR-010: Service Worker Cache Names (90%)

- **API cache not separate** — ADR proposes three-cache strategy (`cacheName`, `staticCacheName`, `apiCacheName`). The SW uses only `STATIC_CACHE`; API requests are never cached (`fetch(request)` with no caching), and `APP.apiCacheName` and `APP.cacheName` are defined in config but not referenced in the SW.

### ADR-012: Pre-commit Workflow (80%)

- **No `.lintstagedrc.json`** — `lint-staged` is a devDependency but has no configuration file. Pre-commit flow relies on `.pre-commit-config.yaml` + Biome hook rather than lint-staged.

### ADR-014: Exponential Backoff (90%)

- **`Retry-After` header not passed through** — `calculateBackoff()` accepts `retryAfterMs` but no code path populates it from actual HTTP `Retry-After` headers in the GitHub API error handler.

### ADR-020: Swarm Audit (85%)

- **Hardcoded CSS values persist** — this was identified in Phase A but never fully resolved. Multiple `rgba()` and pixel values remain outside the token system.

### ADR-022: UI Trends (90%)

- **Content-type theming (P3)** — not implemented; only time-based and ambient-light theming modes exist.
- **Bento grid minimal** — `.gist-grid` exists with `grid-auto-flow: dense` and `@scope (.gist-grid)` but the featured card `.span-2` pattern is not clearly styled. The `@scope` block has only one context.

### ADR-028: Device Flow (85%)

- **No refresh token handling** (already tracked as P1-2).
- **No auth telemetry** (already tracked as P1-1).
- **Token expiration UI** — no indication when a PAT will expire. GitHub fine-grained PATs can have 90-day max expiry.

### ADR Compliance Summary

| ADR | Compliance | Key Gap |
|-----|-----------|---------|
| 001 Token Architecture | 95% | Hardcoded CSS values; no contrast linting |
| 002 PWA + Capacitor | 100% | — |
| 003 IndexedDB | 85% | Missing `favorites`, `drafts`, `searchCache` stores |
| 004 Fine-Grained PAT | 95% | No token expiration UI |
| 005 No Backend | 100% | — |
| 006 Error Boundary | 95% | No separate `AsyncErrorBoundary` class (merged into other patterns) |
| 007 CSP & Logging | 100% | — |
| 007 UI Modernization | 98% | All 8 decisions implemented |
| 008 Web Vitals | 90% | No `.lighthouserc.js`; budgets only enforced at build time |
| 009 AbortController | 100% | — |
| 010 SW Cache Names | 90% | API and general caches not separate from `STATIC_CACHE` |
| 011 Vitest | 90% | Orphaned spec files; no `.lintstagedrc.json` |
| 012 Pre-commit | 80% | No `.lintstagedrc.json`; lint-staged not wired |
| 013 Request Dedup | 100% | — |
| 014 Exponential Backoff | 90% | `Retry-After` header not passed to sync queue |
| 015 Upstream Adaptation | 100% | — |
| 016 GitHub API Efficiency | 90% | Lazy hydration de facto but not explicit; no rate limit threshold doc |
| 020 Swarm Audit | 85% | Hardcoded CSS values persist |
| 022 UI Trends | 90% | Content-type theming not implemented; bento grid minimal |
| 022 Ambient Light | 95% | Cleanup location differs from ADR |
| 026 Phase A Modernization | 90% | Biome/TS strict compliance needs verification |
| 027 CI Node 24 | 100% | — |
| 028 GitHub App vs PAT | 85% | No refresh token; no telemetry; no token expiration UI |
| 029 Release Signing | 95% | `versionCode` from run number not explicitly verified |

---

## Deep Audit: CSS / Design System Gaps

### Missing 640px Breakpoint

The 7-breakpoint system (`breakpoints.ts`) is missing the `640px` breakpoint. Only 6 breakpoints exist (320, 390, 480, 768, 1024, 1280, 1536). The jump from 480px to 768px misses small-tablet/large-phone landscape contexts.

### Missing `color-scheme` CSS Property

No `color-scheme: dark` / `color-scheme: light` declaration. Native browser chrome (scrollbars, form controls) does not automatically adapt to the theme.

### OKLCH Shadow Token Dual System

`base.css` defines `--shadow-xs` through `--shadow-2xl` using hand-authored OKLCH values inside `@supports (color: oklch(0 0 0))`, bypassing the TypeScript token pipeline (`src/tokens/elevation/shadows.ts`). The TypeScript shadow tokens produce `--shadow-sm/md/lg` with rgba values, but OKLCH shadows in `base.css` override these. This creates a split source-of-truth for shadow tokens.

### Duplicate CSS Rules

| Class | Conflict | Location |
|-------|----------|----------|
| `.gist-grid` | Defined twice with identical values | `base.css:140` and `base.css:1237` |
| `.offline-stats` | Defined in both `base.css` (with container queries) and `conflicts.css` (simpler grid) | `base.css:406-425`, `conflicts.css:127-132` |
| `.command-palette` | Legacy styles in `navigation.css` overlap with newer `command-palette.css` (Popover API version) | `navigation.css:426-541`, `command-palette.css` |
| `.empty-state-title` / `.empty-state-description` | Defined twice with conflicting token names (`--color-foreground-*` vs `--color-text-*`) | `empty-state.css:15-29`, `empty-state.css:36-50` |

### Unused CSS Classes (Dead Code)

11 CSS classes defined in stylesheets have no matching usage in any TypeScript file:

| Class | File | Lines |
|-------|------|-------|
| `.primary-btn` | motion.css | 7-29 |
| `.secondary-btn` | motion.css | 7-29 |
| `.filter-btn` / `.filter-btn.active` | motion.css | 94 |
| `.scroll-reveal` / `.scroll-reveal.visible` | base.css | 1297-1308 |
| `.accordion-panel` | motion.css | 370-374 |
| `textarea.token-input` | motion.css | 361 |
| `.file-tab-scroll` | base.css | 1311 |
| `.file-content-scroll` | base.css | 1312 |
| `.gist-detail-hero` | motion.css | 297 |
| `.status-indicator` | motion.css | 143 |
| `.animate-transform` | motion.css | 179-183 |

### DTCG Token Format

Plan 003 specifies `$type`/`$value`/`$description` format (DTCG standard). The implementation uses plain JS object format. The pipeline works but does not align with the DTCG specification.

---

## Deep Audit: Plan Implementation Verification

### Plan 039 / 040 — UI Modernization Phases

| Feature | Status | Gap |
|---------|--------|-----|
| Cross-document view transitions | **DONE** | — |
| OKLCH accent ramp + color-mix | **DONE** | — |
| Scroll-driven header collapse | **DONE** | — |
| `content-visibility: auto` | **DONE** | — |
| `text-wrap: balance/pretty` | **DONE** | — |
| `field-sizing: content` | **DONE** | — |
| `interpolate-size: allow-keywords` | **DONE** | — |
| `accent-color` form controls | **DONE** | — |
| `@view-transition` opt-in | **DONE** | — |
| `@scope` blocks for gist grid | **DONE** | Only one scope block |
| Speculation Rules | **DONE** | — |
| Popover API command palette | **DONE** | — |
| **Popover API anchor positioning** | **NOT DONE** | Command palette uses JS positioning, not CSS `position-anchor` |
| **Accent hue slider in Settings** | **PARTIALLY DONE** | CSS variable `--accent-h` exists; settings has accent hue slider |
| **Dynamic viewport-anchored bento grid** | **NOT DONE** | No `:has()` + container query bento layout |
| **Cross-document VT for external navigation** | **NOT DONE** | Only SPA view transitions wired |
| **3D nested VT groups** | **NOT DONE** | — |

### Plan 045 — v0.2.0 Release & Auth Modernization

| Item | Status | Gap |
|------|--------|-----|
| Auth proxy worker | **DONE** | — |
| Device Flow client | **DONE** | 0% test coverage |
| Settings OAuth UI | **DONE** | — |
| CSP for proxy URL | **DONE** | — |
| Staleness indicators | **DONE** | — |
| Conflict-resolution E2E | **DONE** | — |
| ProGuard CI smoke check | **DONE** | — |
| Bundle budget CI | **PARTIALLY DONE** | `scripts/check-bundle-size.sh` exists but not wired into `ci.yml` |

### README Feature Verification

All 20 claimed features verified as implemented. Two minor discrepancies:
- **"Lazy Hydration"** — accurate but means "fetch on demand when opening gist", not progressive streaming
- **"Strict CSP zero unsafe-inline"** — true in production builds only; dev mode has `style-src 'unsafe-inline' blob:`

---

## Additional GOAP Actions (from Deep Audit)

| # | Action | Precondition | Effect | Cost | Status |
|---|--------|-------------|--------|------|--------|
| 28 | Add WCAG AA contrast lint rule for tokens | ADR-001 compliance | Automated contrast checking | M | ✅ |
| 29 | Remove hardcoded `rgba()` and pixel values from CSS that should use tokens | P2-9 related | Token-only CSS compliance | S | ✅ |
| 30 | Add `.lintstagedrc.json` config for lint-staged (Biome commands) | ADR-012 compliance | Pre-commit only runs on staged files | S | ✅ |
| 31 | Pass `Retry-After` header from rate-limiter to sync queue | ADR-014 compliance | Server-directed backoff | XS | ✅ |
| 32 | Remove legacy `.command-palette` styles from `navigation.css` (dead code) | CSS audit | Removes ~120 lines of dead CSS | XS | ✅ |
| 33 | Deduplicate `.gist-grid` definition in `base.css` | CSS audit | Cleaner stylesheet | XS | ✅ |
| 34 | Deduplicate `.offline-stats` across `base.css` and `conflicts.css` | CSS audit | Single source of truth | XS | ✅ |
| 35 | Fix `.empty-state-title`/`.empty-state-description` duplicate definitions with conflicting tokens | CSS audit | Correct empty-state styling | XS | ✅ |
| 36 | Remove 11 unused CSS classes from stylesheets | CSS audit | Reduces CSS bundle size | S | ✅ |
| 37 | Add missing 640px breakpoint to `breakpoints.ts` and `css-variables.ts` | Responsive audit | Full 7-breakpoint system | XS | ✅ |
| 38 | Add `color-scheme: dark` / `color-scheme: light` to `:root` and `[data-theme="light"]` | CSS audit | Native browser chrome follows theme | XS | ✅ |
| 39 | Unify OKLCH shadow source — source OKLCH shadows from TypeScript tokens, not hand-coded CSS | Token pipeline | Single source of truth for shadows | M | ✅ |
| 40 | Wire `scripts/check-bundle-size.sh` into `ci.yml` as a step | Plan 045 gap | Bundle budget enforced in CI | XS | ✅ |
| 41 | Add `device-flow.test.ts` | P1-4 | Device flow auth covered by tests | S | ✅ |
| 42 | Remove `// CI trigger test` comment from `main.ts:89` | P3-7 | Clean code | XS | ✅ |

---

## Items Already Tracked in Plan 047

The following are already tracked in Plan 047 and are NOT duplicated here:

- Auth telemetry (Plan 047 G2 actions 6-7) → aligns with P1-1
- Device Flow error states (Plan 047 G2 action 8)
- OAuth anti-phishing instructions (Plan 047 G2 action 9)
- PAT rotation reminder (Plan 047 G2 action 10)
- Bundle budget CI (Plan 047 G4 action 11)
- SHA-pin audit (Plan 047 G4 action 17)
- Gradle `--stacktrace` (Plan 047 G4 action 18)
- F-Droid publication (Plan 047 G1 actions 1-5)
- `prefers-reduced-data` (Plan 047 G3 action 14)
- Container query audit (Plan 047 G3 action 13)
- View-transition-name per card (Plan 047 G3 action 15)
- Mutation testing CI (Plan 047 G4 action 16)

---

## Plan Registry Updates Required

After this plan is committed:

- Add to `plans/_status.json`: plan `048` with status `active`
- Add to `plans/_index.md` Active plans table
- `nextAvailable.plan` stays `047` (047 exists as draft); next new plan is `048`
- Next available plan number becomes `048` (this plan), next is `049`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| P0-1 fix may reveal other broken SHAs | Run `scripts/sha-pin-actions.sh` after all SHA fixes |
| P0-3 CI gate may slow releases | Use `workflow_run` trigger so CI must pass before release; add skip option for hotfix |
| P1-2 token refresh is a medium-sized feature | Implement in two phases: first add `revalidateToken()` call on 401, then add `refresh_token` storage |
| P1-4 device-flow tests require mocking external GitHub API | Use `vi.mock` for fetch calls; follow pattern in `auth.test.ts` |
| P2-7 skill evals take time | Minimum 3 eval cases per skill; can be done incrementally |

---

*Created: 2026-05-19. Status: Active.*
