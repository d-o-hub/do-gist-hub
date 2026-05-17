# 041 — GOAP: Release Signing & Plan 040 Completion

> **Date**: 2026-05-17
> **Type**: GOAP Plan
> **Status**: Active
> **Related**: `040-goap-phase-d-039-phase-bc-completion.md`, `012-android-packaging.md`, `013-release-plan.md`, `adr-029-android-release-signing.md`

---

## Context

Plan 040 Phase B/C completion shipped most items, but two had gaps. Additionally, the release pipeline emitted only unsigned debug APKs — the `release` signing config in `build.gradle` was never wired into CI.

---

## GOAP

### Goal: Close remaining Plan 040 gaps + ship signed release APK in CI.

| # | Action | Precondition | Effect | Cost |
|---|--------|-------------|--------|------|
| 1 | Remove duplicate unscoped `.gist-card.featured` from `base.css` | Duplicate selector identified at L148-156 | `@scope (.gist-grid)` block becomes single source of truth for featured card grid placement | XS |
| 2 | Replace hardcoded rgba in `--shadow-glass-hover` with OKLCH tokens | OKLCH shadow ramp confirmed in `base.css` | Zero hardcoded box-shadow values in component tokens | XS |
| 3 | Add `--shadow-command-palette` and `--shadow-glass-hover` light-theme overrides | Light theme section exists in `css-variables.ts` | Component shadows adapt to light backgrounds | XS |
| 4 | Add `assembleRelease` step to CI | Keystore secrets configured in GitHub | Signed release APK published to GitHub Releases | Low |
| 5 | Derive `versionCode`/`versionName` from CI env vars | `VERSION` file is canonical | Android versioning matches web release tags | XS |
| 6 | Create ADR-029 documenting release signing architecture | ADR-029 scaffold | Architectural decision recorded | XS |
| 7 | Run quality gate and create PR | All code changes pass typecheck + lint + tests | Verified, clean PR | Low |

---

## Implementation Details

### Files Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/styles/base.css` | EDITED | Removed duplicate unscoped `.gist-card.featured`; updated @scope comment |
| `src/tokens/css-variables.ts` | EDITED | `--shadow-glass-hover` and `--shadow-command-palette` now use OKLCH; added light-theme overrides |
| `.github/workflows/release.yml` | EDITED | Added keystore decode step + `assembleRelease`; added release APK to artifacts |
| `android/app/build.gradle` | EDITED | `versionCode` from `GITHUB_RUN_NUMBER`, `versionName` from `VERSION` env var |
| `plans/adr-029-android-release-signing.md` | CREATED | Architecture decision for release signing in CI |

---

## Verification

- [x] `pnpm run typecheck` — passes
- [x] `pnpm run lint` — Biome zero errors
- [x] `src/styles/base.css` @scope block is the sole source for `.gist-card.featured` grid placement
- [x] `--shadow-glass-hover` contains no hardcoded rgba values
- [x] CI release workflow includes `if:` guard so forks without secrets still produce debug APK

---

## What Was Learned

- The `@scope` block for `.gist-card.featured` was already correct — the unscoped duplicate was overriding it silently.
- `--shadow-glass-hover` was the only token using raw rgba after the OKLCH shadow ramp migration in Plan 039.
- The `release` signing config scaffold already existed in `build.gradle` — CI wiring was the missing piece.
- Anchor positioning for the command palette is not applicable (centered modal), so that plan 040 requirement was intentionally dropped.

---

*Created: 2026-05-17. Status: Active. Next: PR review and merge.*
