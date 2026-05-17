# 038 — Codebase Audit & Recommendations (Tasks, Features, Lint, Build, Test, Workflow)

> **Date**: 2026-05-16
> **Type**: Audit / Recommendations
> **Status**: 🟢 Complete — all 4 sprints done
> **Scope**: Missing tasks, lint gaps, build hardening, test coverage, coding workflow, lost plans recovery
> **Related**: `037-progress-update-2026-07-18.md`, `030-coverage-improvement-plan.md`, `adr-026-phase-a-modernization-goap.md`, `adr-027-ci-node24-android-hardening.md`

---

## Executive Summary

A full audit of the repository against AGENTS.md, ADRs, CI workflows, and source quality reveals **24 actionable items** across 6 categories. The codebase is healthy on the surface (51 unit test files, 941 passing tests, 91.34% line coverage, biome clean, typecheck clean), but several **decisions from prior sprints were lost in merges**, several **enforcement gaps remain**, and **documentation registries are out of sync** with reality.

### Quality Gate Snapshot

| Gate | Status | Note |
| --- | --- | --- |
| `pnpm run typecheck` | ✅ Pass | tsc --noEmit clean |
| `pnpm run lint` | ✅ Pass | biome check src — 78 files, no issues |
| `pnpm run test:unit` | ✅ Pass | 941/941 tests across 51 files |
| `pnpm run test:coverage` | ✅ 91.34% lines | Threshold currently 45% (regressed from 70%) |
| `./scripts/quality_gate.sh` | ✅ Pass | All gates pass |

### Top-Severity Findings

1. **Lost plans 038–043 and `scripts/check-adr-compliance.sh`** — Commits `2ec84ea`, `fa703a6`, `d48034a`, `c213f01` introduced these but they did not survive the `feat/adr-009-abortcontroller-wiring` merge. The vitest 70% coverage threshold was likewise reverted to 45%.
2. **`plans/README.md` is stale** — Reports `Next available plan: 033`, `Next ADR: adr-023` while actuals are `038` and `adr-028`. Disagrees with `plans/_index.md`.
3. **`scripts/quality_gate.sh` silently swallows typecheck failures** — `"ignored for now as legacy"` is no longer accurate; tsc is clean and the silent fallback should be removed.
4. **`as any` / `: any` escape hatches** in `src/routes/home.ts`, `src/tokens/design-tokens.ts`, `src/services/security/logger.ts` undermine the AGENTS.md `No any` rule.
5. **No bundle-size budget enforcement** in CI despite ADR-008 (Web Vitals + perf budgets) being accepted. The `analyze` script produces a report but the result is not compared to a baseline.

---

## Findings & Recommendations

### Category A — Lost Work Recovery (Critical, P0)

| # | Finding | Recommendation | Effort |
| --- | --- | --- | --- |
| A1 | `scripts/check-adr-compliance.sh` was added in commit `2ec84ea` but does not exist on `main`. | Re-introduce from the original commit (211 lines, exit-code-driven). Wire into `quality_gate.sh`. | S |
| A2 | `vitest.config.ts` thresholds were raised to 70/70/70/70 in `2ec84ea`, then reverted to 45/45/35/45 during a later merge. Actual coverage today is 91.34% lines / 77.88% branches. | Set thresholds to a safe floor — `lines: 85`, `functions: 85`, `branches: 70`, `statements: 85` — that locks in current progress without flapping. | S |
| A3 | Plans `038`, `039`, `040`, `041`, `042`, `043` (progress updates from 2026-05-15) were created by prior sprints but never landed. | This plan supersedes them. The remaining work captured by their commit messages — *quality gate, CI audit, coverage deep-dive, ADR compliance script* — is folded into items A1, A2, B1, B2, B3 below. | M |

### Category B — Build & CI (P0–P1)

| # | Finding | Recommendation | Effort |
| --- | --- | --- | --- |
| B1 | `scripts/quality_gate.sh` does `pnpm run typecheck || { echo "✗ Type check failed (ignored for now as legacy)"; }` — silently passing on tsc failures. | Remove the `||` fallback. tsc is clean today; future regressions should fail the gate. | XS |
| B2 | `quality_gate.sh` invokes `pnpm run test:unit -- --coverage`, which passes a stray `--coverage` flag to `vitest run`. Coverage thresholds are still enforced via the config, but the invocation is misleading. | Either call `pnpm run test:coverage` (already defined) or drop the flag. Standardize on one. | XS |
| B3 | No bundle-size budget. ADR-008 mandates Web Vitals + perf budgets; only the analyzer (`pnpm run analyze`) exists. | Add `scripts/check-bundle-size.sh` — parse `dist/stats.html` or rerun rollup-plugin-visualizer with `--json`, then enforce `gzip < 200KB main` (ADR-008 default). Run in a new `bundle-budget` CI job. | M |
| B4 | No Lighthouse CI / Web Vitals regression gate. | Add `@lhci/cli` to devDependencies and a `.lighthouserc.json` with budgets for LCP, INP, CLS. New `lighthouse` CI job (PR comment + fail at <0.9 perf). | M |
| B5 | `pnpm audit --audit-level critical` runs but **only critical** is failed — high-severity is silently ignored. | Bump to `--audit-level high`. Add a documented exception list for accepted advisories. | XS |
| B6 | No SBOM / dependency review job. | Add `actions/dependency-review-action` (SHA-pinned) on PRs and `cyclonedx` SBOM upload on release. | S |
| B7 | `pnpm install --no-frozen-lockfile` in CI bypasses lockfile drift detection. | Switch to `--frozen-lockfile` everywhere except `dependabot-auto-merge`. | XS |

### Category C — Lint & Type Safety (P1)

| # | Finding | Recommendation | Effort |
| --- | --- | --- | --- |
| C1 | `as any` / `: any` present in `src/routes/home.ts`, `src/tokens/design-tokens.ts`, `src/services/security/logger.ts`. | Replace with `unknown` + narrowing, branded types, or `satisfies`. Add a `strict-no-any.md` enforcement plan and a biome `noExplicitAny: "error"` override. | S |
| C2 | Biome enforces `noUnusedVariables` but does not enforce `useExhaustiveDependencies`, `noFloatingPromises`, `useAwait`. | Tighten `biome.json`: enable `useAwait: "warn"`, `noFloatingPromises: "error"`, `useExplicitFunctionReturnType: "warn"` in `src/services/**`. | S |
| C3 | No CSS/Stylelint pipeline. Dark-mode-first rules + token usage are not enforced beyond `analyze-codebase.sh`. | Add `stylelint` with `stylelint-config-recommended` + a custom rule blocking hard-coded `#hex` outside `tokens/`. Wire into `lint` script. | M |
| C4 | `markdownlint.toml` exists but no CI job runs it. | Add a `docs-lint` CI job: `markdownlint plans/ docs/ *.md`. | XS |
| C5 | `.yamllint.yml` exists; `yaml-lint.yml` workflow exists — verify it runs on PR (not only on push). Confirm SHA-pinning. | Audit + adjust. | XS |

### Category D — Tests (P1)

| # | Finding | Recommendation | Effort |
| --- | --- | --- | --- |
| D1 | `src/stores/gist-store.ts` is the largest coverage gap (86.99%/66.29%). Uncovered branches at lines 145, 345-346, 432-447 cover error paths and conflict-detection edges. | Add focused unit tests in `tests/unit/gist-store-conflicts.test.ts`. Aim to push branches >80%. | M |
| D2 | `src/services/sync/queue.ts` coverage 90.56%/80.35%, gaps around retry exhaustion and dedup invalidation (lines 120, 151, 215, 277). | Add `tests/unit/sync-queue-retry-exhaustion.test.ts` with fake timers. | M |
| D3 | `index.ts` barrel files report 0/0/0/0 coverage and pollute the report. | Add `exclude: ['src/**/index.ts']` (or use `coverage.exclude`) to the vitest coverage config. Validates that barrels stay re-export-only. | XS |
| D4 | No Playwright PWA install / service worker registration smoke test. | Add `tests/offline/sw-install.spec.ts`: load app, register SW, kill network, reload from cache, assert offline page. | M |
| D5 | No accessibility test for keyboard-only navigation through new bento grid. | Add `tests/accessibility/keyboard-bento.spec.ts` using `@axe-core/playwright`. | M |
| D6 | No mutation testing. Coverage % does not reflect assertion quality. | Add `stryker-mutator` for `src/services/sync/` + `src/services/security/` only (small blast radius). Nightly cron, non-blocking. | L |
| D7 | Playwright tests run only on chromium in CI (3 shards). Cross-browser claim from `tests/browser/` is not verified. | Add firefox + webkit jobs with `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` to keep PRs fast. | S |

### Category E — Coding Workflow (P2)

| # | Finding | Recommendation | Effort |
| --- | --- | --- | --- |
| E1 | `.pre-commit-config.yaml` runs gitleaks + shellcheck but **not** biome/typecheck/vitest. Local devs may push tsc errors. | Add a local hook (or pivot to `lefthook`) running `pnpm run check` on staged `*.ts` files. Document in CONTRIBUTING. | S |
| E2 | `commit-msg-hook.sh` must be installed manually per AGENTS.md. Easy to forget. | Add a `pnpm prepare` script wiring it via `simple-git-hooks` (3KB) or document a one-liner in `postinstall`. | XS |
| E3 | `CHANGELOG.md [Unreleased]` has 40+ entries but `VERSION` is still `0.1.0` — no semver bump despite breaking changes (pnpm migration, Biome, TS 6, Vite 8). | Cut `0.2.0-rc.1`; integrate `release-please` for automated CHANGELOG + version bump from Conventional Commits. | M |
| E4 | `plans/README.md` shows `Next available plan: 033`, `Next ADR: adr-023`; `plans/_index.md` shows `038` and `adr-028`. Drift. | Update README. Add a CI step (`scripts/check-plan-numbering.sh`) that fails when README is out of date. | S |
| E5 | Many `progress-update-2026-07-18.md` entries (3 of them — 035, 036, 037 on the same day) accumulate noise. | Adopt a "one progress update per sprint, append don't duplicate" rule. Add to `plans/README.md`. | XS |
| E6 | No `CODEOWNERS` lint or rule that ADR additions require review. | Add `CODEOWNERS` glob `plans/adr-*.md @d-o-hub/architects`. | XS |
| E7 | No automated stale-plan archiver. Progress updates >60 days should be moved to `plans/archive/`. | Extend `scripts/analyze-codebase.sh` (or new `scripts/archive-stale-plans.sh`) to move and re-link. | S |

### Category F — Features & Product Gaps (P2–P3)

Mapped against `001-v1-scope.md` and the active ADRs.

| # | Finding | Recommendation | Effort |
| --- | --- | --- | --- |
| F1 | No conflict-resolution UI walkthrough tests despite `components/conflict-resolution.ts` existing. | E2E: simulate dual-edit, assert merge dialog renders, accept/decline paths. | M |
| F2 | No CSP violation reporting endpoint (called out by TRIZ audit #5 in `037`). | Add `report-uri` to CSP pointing to a stub `/csp-report` endpoint or a Worker on Cloudflare. Document in ADR-007. | M |
| F3 | No staleness indicators on gist cards (TRIZ #1). | Render an "Updated 2 days ago — last synced 1m ago" badge; use cached metadata vs `lastSyncedAt`. | S |
| F4 | `content-visibility: auto` not applied to offscreen gist cards (TRIZ #3). | Add to `gist-card.css`; gate behind `@supports`. Measure LCP delta. | S |
| F5 | No structured-output JSON for swarm handoffs (TRIZ #4). | Add `agents-docs/handoff-schema.json` + reference in `swarm-coordination` skill. | S |
| F6 | Capacitor Android: no ProGuard config delta verification in CI even though Phase C marks it complete. | Add `gradlew :app:assembleRelease --dry-run` smoke job (artifact-only, no signing). | M |
| F7 | No `--watch` Vitest job in CI for fast feedback on `tests/unit/` changes only (use changed-files filter). | Add a `quick-tests` job using `dorny/paths-filter` (SHA-pinned). | S |

---

## Prioritized Roadmap

```diagram
╭────────────────────────╮     ╭────────────────────────╮     ╭────────────────────────╮
│ Sprint 1 (P0 — 1 day)  │────▶│ Sprint 2 (P1 — 3 days) │────▶│ Sprint 3 (P2 — 1 week) │
│ A1 A2 B1 B2 C1 E4      │     │ B3 B4 B5 C2 D1 D2 D3   │     │ B6 C3 C4 D4 D5 E1 E3   │
╰────────────────────────╯     ╰────────────────────────╯     ╰────────────────────────╯
                                          │
                                          ▼
                              ╭────────────────────────╮
                              │ Sprint 4 (P3 — opt.)   │
                              │ D6 D7 E2 E5 E6 E7      │
                              │ F1–F7                  │
                              ╰────────────────────────╯
```

### Sprint 1 — Recover & Stabilize (≤1 day, P0)

- **A1** Recover `scripts/check-adr-compliance.sh` from commit `2ec84ea`.
- **A2** Set vitest thresholds to lines/functions/statements 85, branches 70.
- **B1** Remove typecheck `||` fallback in `quality_gate.sh`.
- **B2** Normalize coverage invocation in `quality_gate.sh`.
- **C1** Open issue + branch to eliminate the 3 remaining `any` usages.
- **E4** Fix `plans/README.md` numbering counters.

### Sprint 2 — Tighten the Gate (≤3 days, P1)

- **B3** Bundle-budget script + CI job.
- **B4** Lighthouse CI for Web Vitals (ADR-008 follow-through).
- **B5** Bump `pnpm audit` to `--audit-level high`.
- **C2** Stricter biome rules (`noFloatingPromises`, `useAwait`).
- **D1/D2/D3** Close the two known coverage gaps; exclude barrel files.

### Sprint 3 — Workflow Quality (≤1 week, P2)

- **B6** SBOM + dependency-review.
- **C3** Stylelint with token-only rule.
- **C4** Markdown lint job.
- **D4/D5** SW install + a11y keyboard tests.
- **E1/E3** Pre-commit `pnpm run check`; cut `0.2.0-rc.1` and adopt release-please.

### Sprint 4 — Polish (optional, P3)

- **D6/D7** Mutation testing; cross-browser on main.
- **E2/E5/E6/E7** Hook automation, doc hygiene, CODEOWNERS, stale-plan archiver.
- **F1–F7** Conflict UI tests, CSP reporting, staleness UX, `content-visibility`, swarm handoff schema, ProGuard CI, quick-test job.

---

## Validation Plan

After each sprint, run:

```bash
./scripts/quality_gate.sh
./scripts/check-adr-compliance.sh   # once A1 lands
pnpm run analyze                    # confirm bundle size unchanged
pnpm run test:coverage              # confirm new thresholds met
```

Update `plans/_index.md` and `plans/_status.json` for every plan/ADR change. Append a new progress update file (`039-progress-update-YYYY-MM-DD.md`) per sprint completion. Do **not** create multiple progress updates on the same day; append instead (E5).

---

## Files to Modify / Create

| File | Action | Sprint |
| --- | --- | --- |
| `scripts/check-adr-compliance.sh` | RESTORE | 1 |
| `vitest.config.ts` | MODIFY thresholds | 1 |
| `scripts/quality_gate.sh` | MODIFY (remove `||`, fix `--coverage`) | 1 |
| `plans/README.md` | MODIFY counters | 1 |
| `src/routes/home.ts`, `src/tokens/design-tokens.ts`, `src/services/security/logger.ts` | REMOVE `any` | 1 |
| `biome.json` | MODIFY rules | 2 |
| `scripts/check-bundle-size.sh` | CREATE | 2 |
| `.lighthouserc.json` | CREATE | 2 |
| `.github/workflows/ci.yml` | MODIFY (bundle, lighthouse, audit level, frozen-lockfile) | 2 |
| `tests/unit/gist-store-conflicts.test.ts`, `tests/unit/sync-queue-retry-exhaustion.test.ts` | CREATE | 2 |
| `.stylelintrc.json` | CREATE | 3 |
| `.github/workflows/docs-lint.yml` | CREATE | 3 |
| `tests/offline/sw-install.spec.ts`, `tests/accessibility/keyboard-bento.spec.ts` | CREATE | 3 |
| `.pre-commit-config.yaml` or `lefthook.yml` | MODIFY/CREATE | 3 |
| `VERSION`, `CHANGELOG.md`, `.release-please-manifest.json` | MODIFY/CREATE | 3 |
| `agents-docs/handoff-schema.json` | CREATE | 4 |
| `.github/workflows/cross-browser.yml`, `scripts/archive-stale-plans.sh` | CREATE | 4 |

---

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Raising vitest thresholds to 85 lines could flap on PRs that touch low-coverage files. | Set per-directory overrides only after Sprint 2 fills the two known gaps. Pilot at 80 first. |
| Lighthouse CI flakiness on shared runners. | Use median-of-3 + budget tolerance (±5%); only fail PRs on regressions, not absolute scores. |
| `--frozen-lockfile` blocks Dependabot. | Keep `--no-frozen-lockfile` in the dependabot-auto-merge workflow only. |
| Eliminating `any` may surface latent bugs. | Land in a feature branch with full Playwright suite, not as a hotfix. |
| Release-please initial commit may rewrite CHANGELOG. | Take a backup of `CHANGELOG.md`; run release-please in dry-run first. |

---

## Cross-References

- AGENTS.md — Code Guidelines, Lifecycle Rules, Self-Learning Rules.
- `adr-008-web-vitals-performance-budgets.md` — drives B3, B4.
- `adr-007-csp-and-logging-redaction.md` — drives F2.
- `adr-009-abortcontroller-and-lifecycle-cleanup.md` — recently merged; coverage gaps in D1/D2 sit adjacent to its surface area.
- `adr-026-phase-a-modernization-goap.md` — class → object refactor pattern; C1 follows same playbook for `any` elimination.
- `030-coverage-improvement-plan.md` — sets the 70%+ aspiration; A2 makes it enforceable.
- `037-progress-update-2026-07-18.md` — TRIZ audit surfaces F2–F5.

---

## Next Available Numbers (post-merge)

- **Next plan**: `039`
- **Next ADR**: `adr-028`

Update both `plans/README.md` and `plans/_index.md` when this plan lands.

*Last updated: 2026-05-16*
