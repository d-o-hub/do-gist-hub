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

Audit every third-party and official action across all workflow files. Bump each to the lowest major version that declares `using: node24` in its `action.yml`.

**Core workflows (ci.yml, cd.yml, release.yml):**

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

**Additional workflows (followup pass):**

| Action | Old | New | Workflow |
|--------|-----|-----|----------|
| `actions/stale` | `@v9.1.0` | `@v10.2.0` | `stale.yml` |
| `actions/labeler` | `@v5.0.0` | `@v6.1.0` | `labeler.yml` |
| `dependabot/fetch-metadata` | `@v2.3.0` | `@v3.1.0` | `dependabot-auto-merge.yml` |
| `actions/checkout` (pinned) | `@v4.2.2` | `@v6` | `commitlint.yml`, `yaml-lint.yml`, `version-propagation.yml`, `cleanup.yml`, `dependabot-auto-merge.yml` |
| `pnpm/action-setup` (pinned) | `@v4` | `@v6` | `commitlint.yml`, `security-scan.yml` |
| `actions/setup-node` (pinned) | `@v4.2.0` | `@v6` | `commitlint.yml`, `security-scan.yml` |

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

### 3. JDK Upgrade for Java 21 Bytecode

Gradle 8.2.1's internal ASM library cannot instrument Java 21 class files (major version 65). Bumping the CI JDK from 17 to 21 resolves `Unsupported class file major version 65` errors from transitive dependencies such as `bcprov-jdk18on-1.79.jar`.

### 4. Gradle Wrapper Upgrade

Gradle 8.2.1 predates Java 21 GA and lacks full bytecode instrumentation support. Upgrading the wrapper to **Gradle 8.5** (compatible with AGP 8.2.1) provides the ASM version required to process Java 21 classes during the build transform pipeline.

### 5. compileSdk Bump to Match Capacitor Requirements

Capacitor Android 8.3.2 references `Build.VERSION_CODES.VANILLA_ICE_CREAM` (Android 15 / API 35). The CI `setup-android` step and `android/variables.gradle` must install and declare `compileSdkVersion = 35` and `targetSdkVersion = 35`.

Additionally, AGP was bumped from `8.2.1` to `8.3.2` in `android/build.gradle` for compatibility with Gradle 8.5, and explicit `compileOptions` were added to `android/app/build.gradle`:

```groovy
compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
}
```

### 6. Kotlin Stdlib Duplicate-Class Exclusion

Capacitor's transitive dependency tree pulls in both `kotlin-stdlib:1.8.22` (which merged the JDK7/JDK8 artifacts) and older `kotlin-stdlib-jdk7:1.6.21` / `kotlin-stdlib-jdk8:1.6.21`. This causes `Duplicate class` errors during `checkDebugDuplicateClasses`. The fix is to exclude the legacy JDK7/JDK8 modules in `android/app/build.gradle`:

```groovy
configurations.all {
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
}
```

### 7. Gradle Diagnostic Flags

Append `--stacktrace` to all `./gradlew assembleDebug` invocations in CI so future failures emit actionable diagnostics without requiring manual log retrieval.

### 8. Build Timeouts

Add `timeout-minutes: 30` to the `android-debug-build` job. Gradle network dependency resolution can hang indefinitely; the default 6-hour runner timeout is excessive for a debug APK build.

### 9. Monthly Action Runtime Audit

Created `.github/workflows/audit-actions.yml` — a scheduled monthly workflow that scans all `uses:` references across `.github/workflows/`, fetches each action's `action.yml`, and flags any action still using `node16` or `node20`. On failure, it opens/updates a GitHub issue with a remediation checklist.

**Known exceptions (documented in workflow comments):**
- `gitleaks/gitleaks-action` — latest v2.3.9 still uses `node20`; no v3 release available
- `ludeeus/action-shellcheck` — docker-based action, no Node runtime
- `wagoid/commitlint-github-action` — docker-based action, no Node runtime

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
- Gradle and JDK bumps require verifying AGP compatibility matrix
- Kotlin stdlib exclusions may need revisiting after Capacitor upgrades

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
- `android/variables.gradle` — `compileSdkVersion = 35`, `targetSdkVersion = 35`
- `android/gradle/wrapper/gradle-wrapper.properties` — `gradle-8.5-all.zip`
- `android/app/build.gradle` — Kotlin stdlib exclusions, `compileOptions`
- `agents-docs/fixes/2026-07-17-ci-node24-migration.md` — fix verification record
- `.github/workflows/audit-actions.yml` — monthly Node runtime audit

---

*Created: 2026-07-17. Status: Implemented.*
