# F-Droid Deployment Guide

> **Free alternative to Google Play Store** — no developer account fee required.
> Publish d.o. Gist Hub to the F-Droid open-source app store.

---

## Overview

[F-Droid](https://f-droid.org/) is a free, open-source app store for Android. Unlike Google Play, there is **no developer registration fee** ($0 vs $25). F-Droid builds your app from source, verifies it, and distributes signed APKs to users.

### Play Store vs F-Droid

| Aspect | Google Play | F-Droid |
|--------|-------------|---------|
| **Cost** | $25 one-time registration | Free |
| **Build** | Upload pre-built AAB | F-Droid builds from source |
| **Signing** | Developer key or Google-managed | F-Droid signing key |
| **Review time** | Hours to days | 24-48h after merge |
| **Open-source required** | No | Yes — all deps must be FOSS |
| **Proprietary deps** | Allowed | Forbidden |
| **Update process** | Upload new AAB to console | Push tag → F-Droid auto-builds |

---

## Prerequisites

- Your app source code is **publicly available** on GitHub
- All dependencies are **open-source** (no Google Play Services, Firebase, etc.)
- Tags follow a version pattern (e.g., `v0.2.0`)
- A `VERSION` file exists in the repo root with the current version string

---

## F-Droid Compatibility

This project is **F-Droid compatible**:

- ✅ All dependencies are open-source (MIT, Apache 2.0)
- ✅ No Google Play Services or Firebase dependencies
- ✅ No proprietary tracking, ads, or analytics
- ✅ Strict CSP with zero `unsafe-inline`
- ✅ No telemetry or crash reporting
- ✅ Builds from source via Gradle

### Removed for F-Droid Compliance

- `com.google.gms:google-services:4.4.0` — unused (no `google-services.json` exists)
- Conditional `google-services` plugin application — removed

---

## Build Metadata

The `.fdroid.yml` file in the repo root contains the build metadata F-Droid needs. It specifies:

- Repository URL and type
- Build commands (Gradle)
- Version detection via tags
- Categories, license, description

### Key Fields

| Field | Value | Notes |
|-------|-------|-------|
| `Repo` | `https://github.com/d-o-hub/do-gist-hub.git` | Public source |
| `Builds[].commit` | `v0.2.0` | Must match a git tag |
| `Builds[].subdir` | `android` | Where `build.gradle` lives |
| `Builds[].gradle` | `assembleFdroid` | F-Droid build variant task |
| `AutoUpdateMode` | `Version` | Auto-detect new versions |
| `UpdateCheckMode` | `Tags` | Watch for new git tags |
| `License` | `MIT` | Project license |

---

## Submission Process

### Step 1: Create a version tag

Tags trigger auto-updates on F-Droid. Always push a tag for each release:

```bash
git tag v0.2.0
git push origin v0.2.0
```

> The GitHub release workflow still runs — F-Droid ignore GitHub Releases.
> It fetches source directly from git.

### Step 2: Fork the fdroiddata repository

Go to [https://gitlab.com/fdroid/fdroiddata](https://gitlab.com/fdroid/fdroiddata) and fork it.

### Step 3: Add the metadata file

In your fork, create a new file:

```
metadata/com.dogisthub.app.yml
```

Copy the contents of `.fdroid.yml` from this repo into that file.

### Step 4: Test the metadata locally (optional)

If you have F-Droid tools installed:

```bash
# Install fdroidserver
pip install fdroidserver

# Lint the metadata
fdroid lint metadata/com.dogisthub.app.yml

# Try building
fdroid build --verbose com.dogisthub.app
```

### Step 5: Create a Merge Request

1. Commit and push your fork:
   ```bash
   git add metadata/com.dogisthub.app.yml
   git commit -m "Add d.o. Gist Hub (com.dogisthub.app)"
   git push origin main
   ```

2. On GitLab, create a Merge Request from your fork to `fdroid/fdroiddata`.

3. The F-Droid maintainers will review and may ask questions.

4. Once merged, the build server will pick it up automatically.

### Step 6: Wait for publication

After merge, F-Droid's build server typically publishes within **24-48 hours**.

You can monitor build status at:
- [F-Droid Monitor](https://monitor.f-droid.org/)
- [Build Server Logs](https://f-droid.org/wiki/page/Status)

---

## Updates

### Manual Version Metadata Update Required

Because `versionName` and `versionCode` are set from environment variables at build time
(see `android/app/build.gradle`), F-Droid cannot auto-detect the version from static file content.

**Each new release requires a manual metadata update** in your `fdroiddata` fork:

1. Push a new version tag (e.g., `v0.2.1`)
2. Clone your `fdroiddata` fork
3. Edit `metadata/com.dogisthub.app.yml`:
   - Add a new entry to the `Builds:` list with the new tag and versionCode
   - Update `CurrentVersion` to `0.2.1`
   - Update `CurrentVersionCode` to the next integer (e.g., `2`)
4. Commit and push, then create a new Merge Request

```yaml
# Example: adding v0.2.1 to the Builds list
Builds:
  - versionName: 0.2.0
    versionCode: 1
    commit: v0.2.0
    subdir: android
    gradle:
      - assembleFdroid
    output: app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk

  - versionName: 0.2.1
    versionCode: 2
    commit: v0.2.1
    subdir: android
    gradle:
      - assembleFdroid
    output: app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
```

### Version Code Convention

| Version | Version Code | Notes |
|---------|-------------|-------|
| 0.2.0   | 1           | Initial F-Droid release |
| 0.2.1   | 2           | Increment for each tag |
| 0.3.0   | 3           | Major version bump |

> In the fdroiddata metadata, `versionCode` must always be an integer and must
> always **increase** with each release. The actual value doesn't need to match
> what the GitHub Release CI produces (which uses `GITHUB_RUN_NUMBER`).

### Update Cadence

1. Push new tag to GitHub
2. Update fdroiddata fork with new Builds entry + version bump
3. Submit Merge Request
4. F-Droid build server builds and publishes (24-48h)

This is a one-time-per-release effort (~5 minutes).

---

## Signing

F-Droid signs APKs with its own key. This means:

- Users **cannot** upgrade from a Play Store APK to F-Droid (different signatures)
- Users **cannot** upgrade from a GitHub Release APK to F-Droid (different signatures)
- F-Droid and self-signed APKs are **mutually exclusive** installs
- Recommend uninstalling any previous version before installing from F-Droid

### Reproducible Builds (Future Goal)

Reproducible builds would allow F-Droid to verify that the APK built from source
matches the developer-signed APK from GitHub Releases. This would:

- Enable users to verify the app was built from published source
- Allow F-Droid to use the developer's signing key (seamless upgrades)
- Increase trust in the distribution chain

Achieving reproducible builds requires:
- Pinned dependency versions (already done — `pnpm-lock.yaml`, Gradle deterministic builds)
- Identical build environment (F-Droid uses Debian; CI uses Ubuntu)
- Build timestamp and file ordering normalization

---

## Troubleshooting

### Build fails on F-Droid server

Check the [build server logs](https://f-droid.org/wiki/page/Status) for:
- Missing SDK components — ensure `android-35` and `build-tools;35.0.0` are in the Gradle config (they are in `variables.gradle`)
- Network access — F-Droid build servers have restricted network; ensure all dependencies are cached or available from allowed repos (`google()`, `mavenCentral()`)
- Node.js/pnpm — Capacitor needs Node.js; F-Droid build servers may not have it. This is the **most common failure** for Capacitor apps.

#### Capacitor Build Fix

If the F-Droid build server lacks Node.js/pnpm, the metadata can be adjusted to install them:

```yaml
Builds:
  - versionName: 0.2.0
    versionCode: 1
    commit: v0.2.0
    subdir: android
    gradle:
      - yes
    prebuild:
      - npm install -g pnpm
      - pnpm install --no-frozen-lockfile
      - pnpm run build
    output: app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
```

Add `prebuild` steps to install Node.js dependencies before the Gradle build.

### License not detected

Ensure `LICENSE` file exists in the repo root with MIT license text.
F-Droid's license scanner checks this file.

### App not appearing after merge

- Check F-Droid Monitor for build status
- Verify the tag exists and is reachable from the default branch
- Ensure the versionCode increments with each release

---

## References

- [F-Droid Build Metadata Reference](https://f-droid.org/docs/Build_Metadata_Reference/)
- [F-Droid Inclusion Policy](https://f-droid.org/docs/Inclusion_Policy/)
- [F-Droid Submission Guide](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/)
- [fdroiddata repository](https://gitlab.com/fdroid/fdroiddata)
- [Antifeatures documentation](https://f-droid.org/docs/Antifeatures/)
