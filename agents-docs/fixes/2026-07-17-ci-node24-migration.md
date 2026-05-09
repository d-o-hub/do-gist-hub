# Fix: CI Node 24 Migration and Android Build Hardening

**Date:** 2026-07-17
**Status:** Verified

## Description
GitHub Actions deprecated Node.js 20, generating persistent warnings across all workflows. Simultaneously, the Android Debug APK build step failed with exit code 1 due to implicit reliance on pre-installed runner SDK state and missing diagnostics.

## Changes

### Node 24 Migration (all workflows)
- `actions/checkout@v4` → `@v6`
- `actions/setup-node@v4` → `@v6`
- `actions/setup-java@v4` → `@v5`
- `pnpm/action-setup@v3` → `@v6`
- `actions/upload-artifact@v4` → `@v7`
- `actions/upload-pages-artifact@v3` → `@v5`
- `actions/deploy-pages@v4` → `@v5`
- `actions/configure-pages@v5` → `@v6`
- `softprops/action-gh-release@v2` → `@v3`

### Android Build Hardening
- Added `android-actions/setup-android@v4` with `platforms;android-34 build-tools;34.0.0` to `ci.yml` and `release.yml`
- Added `--stacktrace` to `./gradlew assembleDebug` for diagnostic output
- Added `timeout-minutes: 30` to the `android-debug-build` job
- Removed hardcoded `ANDROID_HOME` env variable; `setup-android` configures the SDK path correctly

## Verification
- [x] Python `yaml.safe_load` validates all three workflow files
- [x] `curl` verification confirms all bumped actions use `node24` (or `composite` where applicable)
- [x] `android-actions/setup-android@v4` confirmed as `node24` runtime
- [x] No unstyled elements or layout regressions (not applicable — workflow-only change)

## Prevention
- Created `plans/adr-015-ci-node24-android-hardening.md` capturing the decision, tradeoffs, and rollback triggers
- Updated `AGENTS.md` self-learning rules with CI/CD maintenance patterns
- Updated `agents-docs/SUMMARY.md` with CI version-audit checklist
