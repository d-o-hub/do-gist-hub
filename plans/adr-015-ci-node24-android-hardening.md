<!-- Last Audit: 2026-07-17 -->
# ADR-015: CI Node 24 Migration and Android Build Hardening

**Status**: Implemented
**Date**: 2026-07-17
**Deciders**: DevOps Agent

## Context

GitHub Actions began deprecating Node.js 20 runtimes, forcing affected actions to run on Node.js 24 via `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` fallback. This produced persistent deprecation warnings across all workflows and will become a hard failure once GitHub removes the fallback entirely (target: September 16, 2026).

Additionally, the Android Debug APK build step failed intermittently with exit code 1. Root cause analysis identified two contributing factors:
1. **Implicit SDK dependency**: The build relied on the pre-installed Android SDK state of `ubuntu-latest` runners, which is not guaranteed to include the exact `compileSdkVersion` platform and build-tools versions.
2. **Opaque diagnostics**: Gradle failures produced no stack trace, making root cause identification impossible without re-running locally.

## Decision

### 1. Migrate All Actions to Node 24-Native Major Versions

Audit every third-party and official action across `.github/workflows/ci.yml`, `.github/workflows/cd.yml`, and `.github/workflows/release.yml`. Bump each to the lowest major version that declares `using: node24` in its `action.yml`.

| Action | Old | New | Node Runtime |
|--------|-----|-----|--------------|
| `actions/checkout` | `@v4` | `@v6` | `node24` |
| `actions/setup-node` | `@v4` | `@v6` | `node24` |
| `actions/setup-java` | `@v4` | `@v5` | `node24` |
| `pnpm/action-setup` | `@v3` | `@v6` | `node24` |
| `actions/upload-artifact` | `@v4` | `@v7` | `node24` |
| `actions/upload-pages-artifact` | `@v3` | `@v5` | `composite` |
| `actions/deploy-pages` | `@v4` | `@v5` | `node24` |
| `actions/configure-pages` | `@v5` | `@v6` | `node24` |
| `softprops/action-gh-release` | `@v2` | `@v3` | `node24` |

Verification method: `curl -s https://raw.githubusercontent.com/{owner}/{repo}/{tag}/action.yml | grep "using:"`

### 2. Explicit Android SDK Setup in Android Jobs

Add `android-actions/setup-android@v4` to any job that invokes Gradle in the `android/` directory. Configure it to install the exact platform and build-tools matching `compileSdkVersion` and the AGP default build-tools version.

```yaml
- name: Setup Android SDK
  uses: android-actions/setup-android@v4
  with:
    packages: 'tools platform-tools platforms;android-34 build-tools;34.0.0'
```

This action also auto-accepts SDK licenses (`accept-android-sdk-licenses: true` by default), eliminating another common CI failure mode.

### 3. Gradle Diagnostic Flags

Append `--stacktrace` to all `./gradlew assembleDebug` invocations in CI so future failures emit actionable diagnostics without requiring manual log retrieval.

### 4. Build Timeouts

Add `timeout-minutes: 30` to the `android-debug-build` job. Gradle network dependency resolution can hang indefinitely; the default 6-hour runner timeout is excessive for a debug APK build.

## Tradeoffs

### Pros
- Eliminates all Node 20 deprecation warnings permanently
- Android builds are reproducible regardless of runner image changes
- Future Gradle failures are self-diagnosing via `--stacktrace`
- Hung builds fail fast instead of consuming runner minutes

### Cons
- Major-version bumps may introduce breaking input/output changes (must validate YAML and runtime behavior)
- `android-actions/setup-android` adds ~30-60s to Android job startup
- Additional documentation burden to keep platform version in sync with `android/variables.gradle`

## Consequences

### CI Health
- Zero deprecation warnings on all workflow runs
- Android debug APK builds no longer depend on implicit runner state

### Maintenance
- Platform/build-tools version in workflow YAML must stay in sync with `compileSdkVersion` bumps
- New actions added to workflows must be verified for `node24` compatibility before merge

## Rejected Alternatives

### Keep `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` indefinitely
**Rejected because**: GitHub will remove Node 20 from runners entirely on September 16, 2026. The env var is a temporary migration bridge, not a permanent fix.

### Pin action versions to exact patch tags (e.g., `@v6.0.2`)
**Rejected because**: Excessive maintenance burden. Major-version tags (`@v6`) are rolling and receive security patches automatically. We accept the small risk of a breaking minor release in exchange for reduced toil.

### Use `ubuntu-22.04` instead of `ubuntu-latest` to freeze runner state
**Rejected because**: Locks us into an aging image. Explicit SDK setup (`setup-android`) achieves the same reproducibility without preventing runner updates.

## Rollback Triggers

- A bumped action version introduces a breaking change that blocks CI entirely
- `android-actions/setup-android` becomes unavailable or unmaintained
- GitHub reverts the Node 20 deprecation timeline

## References

- `.github/workflows/ci.yml` — quality gate, tests, Android debug build, visual tests
- `.github/workflows/cd.yml` — GitHub Pages deployment
- `.github/workflows/release.yml` — tagged release with APK artifact
- `android/variables.gradle` — `compileSdkVersion = 34`, `targetSdkVersion = 34`
- `agents-docs/fixes/2026-07-17-ci-node24-migration.md` — fix verification record

---

*Created: 2026-07-17. Status: Implemented.*
