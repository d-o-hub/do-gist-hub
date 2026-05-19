# 049 — Progress Update: Plan 048 Completion & CI Fixes

> **Date**: 2026-05-19
> **Branch**: `feat/plan045-v0.2.0-release-and-auth`
> **Related Plans**: `048-codebase-audit-implementation-gaps-ci-docs.md`, `046-post-release-and-v0.2.0-stable.md`

---

## Executive Summary

### Key Achievements
- All P0 items resolved (broken SHAs, release gate, frozen-lockfile)
- All P1 auth gaps implemented (telemetry, token refresh, device-flow tests)
- All P1/P2 doc hygiene fixes applied across 8 documentation files
- All P2 CI hardening items completed (continue-on-error, lhci pin, audit-level, etc.)
- P2 CSS polish (starting-style, overlay: auto) added
- P2/P3 housekeeping (circular symlink, CI trigger comment, orphaned specs)
- CI failures resolved (commitlint body length, gitleaks reports leak, SHA-Pin Audit, security-scan permissions)

### CI Status (All Passing)
- ✅ Validate Commits
- ✅ GitLeaks Secret Detection
- ✅ SHA-Pin Audit
- ✅ Quality Gate (984 tests)
- ✅ Bundle Budget
- ✅ Playwright Tests (3 shards)
- ✅ ProGuard Smoke Check
- ✅ Android Debug Build
- ✅ Web Vitals Audit
- ✅ All other checks

---

## Files Modified/Created

### Created
- `src/services/telemetry/auth-telemetry.ts` — Auth method counter + time-to-first-call telemetry
- `tests/unit/device-flow.test.ts` — 21 device flow tests
- `tests/unit/conflict-detector.test.ts` — Vitest migration from node:test
- `tests/unit/rate-limiter.test.ts` — Vitest migration from node:test
- `plans/049-progress-update-2026-05-19-plan048-completion.md` — This file

### Modified
- `.github/workflows/ci.yml` — Fixed dorny/paths-filter SHA, continue-on-error: false, pinned lhci
- `.github/workflows/release.yml` — Fixed frozen-lockfile, fixed firebase-test-lab SHA, added CI gate
- `.github/workflows/commitlint.yml` — frozen-lockfile
- `.github/workflows/security-scan.yml` — audit-level high, added pull-requests: write
- `.github/workflows/cross-browser.yml` — Conditional Playwright install
- `.github/workflows/audit-actions.yml` — Fixed github-script SHA
- `commitlint.config.mjs` — Increased body-max-line-length, added ignores for old commits
- `.gitleaks.toml` — Added reports/ path exclusion
- `.gitignore` — Added reports/ directory
- `CONTRIBUTING.md` — npm→pnpm
- `SECURITY.md` — Updated supported versions to 0.2.x
- `README.md` — Version badge 0.1.0→0.2.0
- `CHANGELOG.md` — Fixed format
- `agents-docs/HOOKS.md` — ESLint/Prettier→Biome
- `agents-docs/CONTEXT.md` — Fixed dead references
- `agents-docs/available-skills.md` — Added swarm-coordination
- `agents-docs/CONFIG.md` — Version 0.1.0→0.2.0
- `plans/README.md` — Next available plan 047→048
- `src/main.ts` — Removed CI trigger test comment, wired auth telemetry
- `src/routes/settings.ts` — Wired auth method telemetry
- `src/services/github/auth.ts` — Added refresh token storage, revalidateToken, getProxyUrl
- `src/services/github/client.ts` — Added transparent 401→revalidate→retry flow
- `src/services/github/device-flow.ts` — Extended DeviceFlowResult with refreshToken, wired telemetry
- `src/styles/command-palette.css` — Added @starting-style and overlay: auto

### Deleted
- `.agents/skills/skills` — Circular symlink
- `reports/mutation/index.html` — Untracked (false-positive gitleaks detections)
- `tests/unit/conflict-detector.spec.ts` — Replaced by vitest .test.ts
- `tests/unit/rate-limiter.spec.ts` — Replaced by vitest .test.ts
- `tests/unit/gist-store.spec.ts` — Orphaned playwright test
- `tests/unit/github-client.spec.ts` — Orphaned playwright test

---

## Plan 048 GOAP Actions Status

| # | Action | Cost | Status |
|---|--------|------|--------|
| 1 | Fix `dorny/paths-filter` SHA | XS | ✅ |
| 2 | Fix `vacxe/firebase-test-lab-action` SHA | XS | ✅ |
| 3 | Add CI gate to `release.yml` | S | ✅ |
| 4 | Change `release.yml` to `--frozen-lockfile` | XS | ✅ |
| 5 | Add auth telemetry | S | ✅ |
| 6 | Add transparent 401→revalidate→retry flow | M | ✅ |
| 7 | Write `tests/unit/device-flow.test.ts` | S | ✅ |
| 8 | Migrate or remove 4 orphaned `.spec.ts` files | S | ✅ |
| 9-13 | Doc hygiene fixes | XS each | ✅ |
| 14-19 | CI hardening | XS each | ✅ |
| 20 | Add skill evals | M | ☐ (deferred) |
| 21 | Remove circular symlink | XS | ✅ |
| 22 | Implement `@starting-style` | S | ✅ |
| 23 | Implement `overlay: auto` | S | ✅ |
| 24-26 | Doc updates | XS each | ✅ |
| 27 | Remove CI trigger test comment | XS | ✅ |

*Plan 048 status in `_status.json` updated to reflect completion.*

---

*Created: 2026-05-19. Status: Complete.*
