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
- Added `android-actions/setup-android@v4` with `platforms;android-35 build-tools;35.0.0` to `ci.yml` and `release.yml`
- Bumped CI JDK from 17 → 21 (`actions/setup-java@v5` with `java-version: '21'`)
- Upgraded Gradle wrapper from 8.2.1 → 8.5 for Java 21 ASM bytecode instrumentation support
- Bumped `compileSdkVersion` and `targetSdkVersion` from 34 → 35 in `android/variables.gradle`
- Added Kotlin stdlib exclusions (`kotlin-stdlib-jdk7`, `kotlin-stdlib-jdk8`) in `android/app/build.gradle`
- Added `--stacktrace` to `./gradlew assembleDebug` for diagnostic output
- Added `timeout-minutes: 30` to the `android-debug-build` job
- Removed hardcoded `ANDROID_HOME` env variable; `setup-android` configures the SDK path correctly

## Verification
- [x] Python `yaml.safe_load` validates all three workflow files
- [x] `curl` verification confirms all bumped actions use `node24` (or `composite` where applicable)
- [x] `android-actions/setup-android@v4` confirmed as `node24` runtime
- [x] All CI jobs pass including Android Debug Build

## Followups Completed
- [x] Created `deprecated-runtime` GitHub label for audit workflow issue tracking
- [x] Checked `gitleaks/gitleaks-action` for node24-native version — **blocked**: latest is v2.3.9 (node20), no v3 release available
- [x] Attempted local Android build — **blocked**: `ANDROID_HOME` not set and Java not installed in this environment
- [x] Added exception rationale comments to `audit-actions.yml` documenting why each action is skipped

## Prevention
- Created `plans/adr-027-ci-node24-android-hardening.md` capturing the decision, tradeoffs, and rollback triggers
- Updated `AGENTS.md` self-learning rules with CI/CD maintenance patterns
- Updated `agents-docs/SUMMARY.md` with CI version-audit checklist
- Documented Java 21 bytecode / Gradle ASM compatibility requirement
