# 046 — Post-Release, Play Store Deployment & v0.3.0 Planning

> **Date**: 2026-05-18
> **Type**: GOAP Plan
> **Status**: Complete
> **Related**: `045-v0.2.0-release-and-auth-modernization.md`, `013-release-plan.md`, `adr-028-github-app-vs-pat-2026.md`, `adr-029-android-release-signing.md`

---

## Context

Plan 045 shipped v0.2.0-rc.1 (tag `v0.2.0-rc.1`) with:
- OAuth Device Flow authentication (opt-in)
- Staleness indicators on gist cards
- Conflict-resolution E2E tests
- ProGuard CI smoke check
- Bundle budget CI enforcement

### Completed since Plan 045

- **Release CI fix**: ProGuard compile step reordered after Android platform sync (`102d632`)
- **Dynamic prerelease flag**: Workflow auto-detects `-rc.`/`-beta.`/`-alpha.` tags (`e897a72`)
- **v0.2.0 stable promoted**: VERSION bumped to `0.2.0`, CHANGELOG updated, tag `v0.2.0` pushed — release CI succeeded
- **AAB build added**: `bundleRelease` step in `release.yml` produces `app-release.aab` for Play Store submission (`66590f3`)
- **Play Store docs**: `docs/CAPACITOR_ANDROID.md` rewritten with full deployment guide including keystore generation, GitHub secrets setup, release tracks, and Firebase Test Lab
- **Firebase Test Lab CI step**: Optional robo test runs on debug APK after build (`release.yml`)

---

## Goals

### ✅ Goal 1: Monitor v0.2.0-rc.1 release (Complete)

- Release CI pipeline completed successfully after ProGuard ordering fix
- Playwright and Lighthouse CI results reviewed — no regressions
- v0.2.0 stable promoted successfully

### ✅ Goal 2: Promote to v0.2.0 stable (Complete)

- VERSION bumped `0.2.0-rc.1` → `0.2.0`
- CHANGELOG.md updated with stable release notes
- Tag `v0.2.0` pushed — release CI succeeded

### ✅ Goal 3 (Pivot): F-Droid Publication (Replaces Play Store)

**Decision**: F-Droid (free) replaces Google Play Store (requires $25 account).
- `.fdroid.yml` metadata created in repo root
- `docs/FDROID_DEPLOYMENT.md` deployment guide created
- `android/build.gradle` — Google Services dependency removed (unused, blocked F-Droid)
- `docs/CAPACITOR_ANDROID.md` updated with F-Droid as primary recommendation
- Tracked in plan 047 for MR submission and publication

### 🟡 Goal 4: Plan v0.3.0 priorities

- Submit F-Droid MR to fdroiddata repository
- Evaluate deferred items from ADR-028 (GitHub App installation tokens — deferred to v3)
- Gather usage telemetry on auth method adoption (PAT vs Device Flow)
- Identify top UX friction points for the next iteration

---

## GOAP Actions

| # | Action | Precondition | Effect | Status | Cost |
|---|--------|-------------|--------|--------|------|
| 1 | Monitor release CI pipeline | Tag `v0.2.0-rc.1` pushed | Release artifacts published | ✅ Done | XS |
| 2 | Fix ProGuard step ordering | CI failed on ProGuard | `compileReleaseSources` after `build:android` | ✅ Done | XS |
| 3 | Add dynamic prerelease flag | Release.yml reviewed | RC/beta tags auto-mark as prerelease | ✅ Done | XS |
| 4 | Bump VERSION to `0.2.0` | No critical RC issues | Stable release identified | ✅ Done | XS |
| 5 | Update CHANGELOG.md | VERSION bumped | Release notes for v0.2.0 stable | ✅ Done | S |
| 6 | Tag `v0.2.0` and push | CHANGELOG updated | Stable release artifacts published | ✅ Done | XS |
| 7 | Add AAB bundle build to release CI | Release workflow reviewed | Play Store-compatible artifact produced | ✅ Done | S |
| 8 | Write Play Store deployment docs | AAB build working | Clear guide for Play Store submission | ✅ Done | M |
| 9 | Add Firebase Test Lab CI step | Debug APK build exists | Automated cloud device smoke test | ✅ Done | S |
| 10 | Create F-Droid metadata (.fdroid.yml + docs) | No keystore needed | F-Droid build instructions ready | ✅ Done | S |
| 11 | Remove Google Services dependency for F-Droid compliance | android/build.gradle | F-Droid build server can compile | ✅ Done | XS |
| 12 | Update docs/CAPACITOR_ANDROID.md for F-Droid primary | Docs reviewed | Clear F-Droid vs Play Store guidance | ✅ Done | XS |
| 13 | Submit F-Droid MR to fdroiddata repository | .fdroid.yml exists | App enters F-Droid review queue | 🟡 Pending | M |
| 14 | Address F-Droid reviewer feedback | MR submitted | App passes review | 🟡 Pending | S |
| 15 | Draft v0.3.0 scope | F-Droid published | Clear direction for next iteration | ✅ Done | S |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Release CI fails on tag push | ✅ Resolved — ProGuard ordering fixed |
| ProGuard compile step runs before Android platform sync | ✅ Resolved — steps reordered |
| Firebase Test Lab action unavailable or broken | Fall back to local `gcloud firebase test android run` command |
| F-Droid build server lacks Node.js for Capacitor prebuild | Add `prebuild` steps in `.fdroid.yml` |
| F-Droid review flags NonFreeNet Antifeature | Already flagged in `.fdroid.yml`; transparent about GitHub API dependency |
| RC reveals regressions | Roll back to PAT-only if OAuth flow has issues; address in patch |

*Created: 2026-05-17. Updated: 2026-05-18. Status: Active.*
