# Pre-existing CI Issues — 2026-06-01

> **Status**: Active
> **Type**: Analysis
> **Created**: 2026-06-01
> **Updated**: 2026-06-01
> **Owner**: agent
> **Related**: Issue #219

## Issues Found

### 1. `html-escaper@2.0.2` empty CJS directory (FIXED)

**Symptom**: `pnpm run test:coverage` failed with:
```
Cannot find module 'html'
```

**Root cause**: `html-escaper@2.0.2` (transitive dep of `istanbul-reports@3.2.0` → `@vitest/coverage-v8`) has a `cjs/` directory that is empty. The package's `main` field points to `./cjs/index.js` which doesn't exist. pnpm skips build scripts by default, so the `ascjs esm cjs` build step never runs.

**Fix**: Added `html-escaper@^3.0.3` as a direct devDependency. v3 ships CJS natively without needing a build step. The pnpm override alone doesn't work because the version range `^3.0.3` is incompatible with `istanbul-reports`' declared `^2.0.2` range.

**Status**: Fixed in this session.

### 2. Commitlint CI failure — non-conventional commit messages

**Symptom**: Commitlint fails on commits like `cleanup` with:
```
✖ subject may not be empty [subject-empty]
✖ type may not be empty [type-empty]
```

**Root cause**: Some commits use bare words (`cleanup`) instead of conventional commit format (`chore: cleanup`).

**Fix**: Ensure all commits follow `type: subject` format. Pre-existing hook already installed via `postinstall`.

**Status**: Pre-existing, recurring. No code fix needed — workflow discipline.

### 3. F-Droid CI build — APK not produced

**Symptom**: CI job `Android F-Droid Build` fails with:
```
No files were found with the provided path: android/app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
```

**Root cause**: The `assembleFdroid` Gradle task fails during CI. The `fdroid` buildType is correctly declared in `build.gradle` with `initWith release` and `matchingFallbacks ['release']`, but the actual Gradle build fails before producing the APK. Likely related to the Capacitor sync or build ordering issue that was fixed for the debug variant but not for fdroid.

**Status**: Pre-existing. Needs investigation of the actual Gradle error output.
