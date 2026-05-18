# 046 — Post-Release, Play Store Deployment & v0.3.0 Planning

> **Date**: 2026-05-18
> **Type**: GOAP Plan
> **Status**: Active
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

### 🟡 Goal 3: Prepare for Play Store Deployment

- Generate upload keystore and configure GitHub secrets (`ANDROID_KEYSTORE_BASE64`, etc.)
- Set up Firebase project and add `FIREBASE_TESTLAB_JSON` secret for automated cloud device testing
- Verify AAB artifacts are signed correctly by running the release workflow
- Upload `app-release.aab` to Google Play Console Internal Testing track
- Complete store listing (screenshots, description, privacy policy, content rating)

### 🟡 Goal 4: Plan v0.3.0 priorities

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
| 10 | Generate keystore & configure GitHub secrets | No keystore exists | Signed release builds possible | 🟡 Pending | M |
| 11 | Verify signed AAB via release workflow | Secrets configured | AAB is correctly signed for Play Store | 🟡 Pending | XS |
| 12 | Set up Firebase project & auth | Google Cloud account | Firebase Test Lab step can authenticate | 🟡 Pending | M |
| 13 | Upload AAB to Play Console Internal Testing | Signed AAB available | App available for internal testers | 🟡 Pending | S |
| 14 | Complete Play Store listing | Internal test approved | App visible on Play Store | 🟡 Pending | L |
| 15 | Draft v0.3.0 scope | All Play Store tasks complete | Clear direction for next iteration | ⬜ Future | S |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Release CI fails on tag push | ✅ Resolved — ProGuard ordering fixed |
| ProGuard compile step runs before Android platform sync | ✅ Resolved — steps reordered |
| Firebase Test Lab action unavailable or broken | Fall back to local `gcloud firebase test android run` command |
| Keystore lost or password forgotten | Generate new keystore, update upload key in Play Console |
| Play Store rejects AAB | Verify signing config matches Play Console's registered upload certificate |
| RC reveals regressions | Roll back to PAT-only if OAuth flow has issues; address in patch |

*Created: 2026-05-17. Updated: 2026-05-18. Status: Active.*
