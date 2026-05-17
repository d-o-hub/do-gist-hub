<!-- Last Audit: 2026-05-17 -->
# ADR-029 — Android Release Signing via CI

**Status**: Accepted
**Date**: 2026-05-17
**Deciders**: Architect, DevOps Agent
**Supersedes**: extends [ADR-002](adr-002-web-first-pwa-capacitor.md); references [012-android-packaging.md](012-android-packaging.md)
**Related**: [013-release-plan.md](013-release-plan.md)

---

## Context

Prior to this ADR, the release CI pipeline built only a debug APK (`app-debug.apk`) and published it as a GitHub Release artifact. The `build.gradle` already contained a `release` signing config block reading environment variables, but the CI workflow never set those variables or invoked `assembleRelease`.

This meant:

- The published APK was **unsigned** and could not be installed on a device without first disabling Play Protect or sideloading via `adb install -t` (debug flag).
- The release APK (`app-release.apk`) with ProGuard/R8 minification, resource shrinking, and proper signing was only buildable locally by developers with access to the keystore.
- Version information (`versionCode`, `versionName`) was hardcoded as `1` / `"1.0"` and never derived from the canonical `VERSION` file.

---

## Decision

**Build and publish a signed release APK alongside the existing debug APK in the CI release workflow.**

### Release signing flow

1. The Android keystore (`.jks`) is stored as a **base64-encoded GitHub Actions secret** (`ANDROID_KEYSTORE_BASE64`).
2. The keystore password, key alias, and key password are stored as **individual GitHub secrets** (`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
3. The CI workflow decodes the keystore at build time and passes all signing env vars to `./gradlew assembleRelease`.
4. If the keystore secrets are not configured (e.g., forks), the release APK step is **skipped** gracefully — the debug APK is still published.

### Versioning

- `versionName` is derived from the canonical `VERSION` file (set via the `VERSION` env var in CI).
- `versionCode` uses `GITHUB_RUN_NUMBER` in CI, falling back to `1` locally.
- This ensures each release has a monotonically increasing `versionCode` and a human-readable `versionName` matching the git tag.

### Artifacts

Both APKs are attached to the GitHub Release:

- `android/app/build/outputs/apk/debug/app-debug.apk` — unsigned debug build
- `android/app/build/outputs/apk/release/app-release.apk` — signed, minified release build

---

## Consequences

### Positive

- Users can download and install the signed release APK directly from GitHub Releases without developer tooling.
- ProGuard/R8 minification reduces APK size and obfuscates the WebView bridge surface.
- Versioning is consistent across web and Android artifacts — `VERSION` is the single source of truth.
- Fork maintainers can opt in by configuring their own secrets.

### Negative

- Adds three new GitHub secrets that must be managed and rotated.
- The keystore's base64 encoding must be updated whenever the keystore file changes.
- Build time increases by the duration of `assembleRelease` (~30-60s additional).

### Neutral

- Debug APK remains published for developers who need debuggable builds.
- The `release` signing config in `build.gradle` was already scaffolded — this CI wiring completes that scaffold.

---

## Security Notes

- The keystore is base64-encoded, not encrypted at rest in the repo. Protection relies entirely on GitHub's secret storage and access control.
- We recommend: (a) GitHub Environments with required reviewers for the release workflow, (b) rotating the keystore password annually, and (c) not storing the keystore in any other location accessible to CI.
- The decoded keystore file is written to `android/app/keystore.jks` during the build step and is automatically discarded when the runner is torn down.

---

## Rollback

1. Remove the "Decode Keystore and Build Release APK" step from `.github/workflows/release.yml`.
2. Remove the release APK from the `files:` list in the Create Release step.
3. Revert `build.gradle` to hardcoded `versionCode 1` / `versionName "1.0"`.

---

## Success Metrics

- Signed release APK present in the next GitHub Release after the keystore secrets are configured.
- `versionCode` increments with each release (visible in `adb shell pm list packages --show-versioncode`).
- Zero CI failures caused by missing secrets (step is gated behind `if: env.ANDROID_KEYSTORE_BASE64 != ''`).

---

*Created: 2026-05-17. Status: Accepted.*

