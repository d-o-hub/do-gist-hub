# 046 — Post-Release & v0.2.0 Stable

> **Date**: 2026-05-17
> **Type**: GOAP Plan
> **Status**: Draft
> **Related**: `045-v0.2.0-release-and-auth-modernization.md`, `013-release-plan.md`, `adr-028-github-app-vs-pat-2026.md`

---

## Context

Plan 045 shipped v0.2.0-rc.1 (tag `v0.2.0-rc.1`) with:
- OAuth Device Flow authentication (opt-in)
- Staleness indicators on gist cards
- Conflict-resolution E2E tests
- ProGuard CI smoke check
- Bundle budget CI enforcement

The release workflow has been triggered by the tag push. This plan covers post-release monitoring, addressing any regressions or feedback from the RC, and promoting to v0.2.0 stable (non-RC).

---

## Goals

### Goal 1: Monitor v0.2.0-rc.1 release

- Verify the release CI pipeline completes successfully (web build + Android APK + GitHub Release artifacts)
- Review Playwright test results for regressions
- Check Lighthouse CI scores for perf/a11y budgets
- Address any release workflow failures

### Goal 2: Promote to v0.2.0 stable

- If no critical issues surface within a reasonable window:
  - Remove `-rc.1` suffix from VERSION (`0.2.0-rc.1` → `0.2.0`)
  - Update CHANGELOG.md with stable release notes
  - Tag `v0.2.0` and push
  - Set `prerelease: false` in release workflow

### Goal 3: Plan v0.3.0 priorities

- Evaluate deferred items from ADR-028 (GitHub App installation tokens — deferred to v3)
- Gather usage telemetry on auth method adoption (PAT vs Device Flow)
- Identify top UX friction points for the next iteration

---

## GOAP Actions

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Monitor release CI pipeline | Tag `v0.2.0-rc.1` pushed | Release artifacts published successfully | XS |
| 2 | Verify Playwright + LH CI results | CI runs complete | No regressions detected | XS |
| 3 | Bump VERSION to `0.2.0` | No critical RC issues | Stable release identified | XS |
| 4 | Update CHANGELOG.md | VERSION bumped | Release notes for v0.2.0 stable | S |
| 5 | Tag `v0.2.0` and push | CHANGELOG updated | Stable release artifacts published | XS |
| 6 | Draft v0.3.0 scope | All RC issues resolved | Clear direction for next major iteration | S |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Release CI fails on tag push | Monitor immediately; fix workflow issues in a followup commit |
| RC reveals regressions | Roll back to PAT-only if OAuth flow has issues; address in patch |
| v0.2.0 stable delayed by issues | Iterate on patches as v0.2.0-rc.2, rc.3, etc. before promoting |

*Created: 2026-05-17. Status: Draft.*
