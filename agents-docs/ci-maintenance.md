# CI/CD Maintenance Rules

> Manually maintained. Review before every workflow change or GitHub deprecation cycle.

1. **Action Node Runtime Verification**: Before adding or bumping a GitHub Action, verify its runtime via `curl -s https://raw.githubusercontent.com/{owner}/{repo}/{tag}/action.yml | grep "using:"`. Prefer `node24` (or `composite`) over `node20`.
2. **Android SDK Explicit Setup**: Jobs invoking Gradle in `android/` must include `android-actions/setup-android@v4` with `platforms;android-{N} build-tools;{N}.0.0` where `{N}` matches `compileSdkVersion` in `android/variables.gradle`.
3. **Gradle Stacktrace in CI**: Always append `--stacktrace` to `./gradlew` commands in CI so build failures produce actionable logs.
4. **Build Job Timeouts**: Set `timeout-minutes` on Android build jobs (e.g., `30`) to prevent Gradle hangs from consuming runner minutes.
5. **No Hardcoded ANDROID_HOME**: When `setup-android` is used, do not override `ANDROID_HOME`; let the action configure the correct SDK path.
6. **Periodic Action Audit**: Re-audit all workflow actions every GitHub deprecation cycle (or when `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` appears in logs).
