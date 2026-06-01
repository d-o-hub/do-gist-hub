# F-Droid Publication Guide

> **Audience**: the maintainer (d.o.) who will submit d.o. Gist Hub to F-Droid.
> **Goal**: take the project from "ready to submit" (today) to "live on F-Droid" and keep it current across releases.
> **Supersedes**: the older `FDROID_DEPLOYMENT.md` (high-level) and `FDROID_SUBMISSION_CHECKLIST.md` (pre-2026 quick checklist). Those are kept as historical snapshots only; this file is the canonical reference.

---

## 0. Status snapshot (as of 2026-06-01)

| # | Task | Status | Reference |
|---|------|--------|-----------|
| 1 | `.fdroid.yml` build metadata in repo root | Done | `.fdroid.yml` |
| 2 | `fdroid` Gradle build type with `initWith release` + `matchingFallbacks ['release']` | Done (commit `56123fe`) | `android/app/build.gradle:33-61` |
| 3 | CI validates `assembleFdroid` produces the expected APK path | Done (commit `f60d285`, `5f5755d`) | `.github/workflows/ci.yml:109-170` |
| 4 | Quality gate / unit tests / typecheck / lint green | Done | `scripts/quality_gate.sh` |
| 5 | Google Play Services / Firebase removed | Done (commit `de3d763`) | `android/app/build.gradle:90-91` |
| 6 | LICENSE file present (MIT) | Done | `LICENSE` |
| 7 | `NonFreeNet` antifeature pre-declared (GitHub API dependency) | Done | `.fdroid.yml:70-72` |
| 8 | Upstream fastlane metadata in source repo (`fastlane/metadata/android/en-US/`) | **Missing** — see §5 | — |
| 9 | Local `fdroid lint` and `fdroid build` smoke test | **Missing** — see §3 | — |
| 10 | Per-version `changelogs/<versionCode>.txt` | **Missing** — see §5 | — |
| 11 | `scripts/submit-to-fdroid.sh` helper mentioned in issue #213 | **Missing** — see §6.1 | — |
| 12 | GitLab MR submitted to `fdroid/fdroiddata` | **Missing** — see §6 (issue #213) | — |
| 13 | F-Droid badge in `README.md` | **Missing** — see §7 | — |

The four `Missing` items (8, 9, 10, 11, 12, 13) are the remaining work before the app is live on F-Droid. Tasks 8, 9, 10, 11 are preconditions for task 12 (the MR). Task 13 is post-merge.

---

## 1. Why F-Droid and what it costs us

### Cost / benefit

| | Google Play | F-Droid |
|---|---|---|
| One-time fee | $25 | $0 |
| Source code | Can be closed | Must be public, FOSS |
| Dependencies | Anything | All FOSS (no Play Services, Firebase, GMS) |
| Build | Developer uploads AAB | F-Droid builds from source |
| Signing | Developer key (or Play App Signing) | F-Droid's own key |
| Review time | Hours–days | 24–48 h after `fdroiddata` merge |
| Updates | Developer uploads new AAB | New git tag → bot detects → new build |
| Reproducible builds | Optional | Encouraged; "best practice" per F-Droid docs since 2023 |

d.o. Gist Hub ships **without** Play Services, Firebase, or any proprietary telemetry, so it is F-Droid-eligible with no code changes beyond a build type. The cost is the manual GitLab MR and one-time-per-release metadata update.

### What F-Droid will (and won't) do for us

- **Will** build the unsigned APK from a tagged commit on its own build server (Debian + Android SDK + Gradle).
- **Will** sign the APK with F-Droid's per-app signing key.
- **Will** host the APK + source tarball in its repository.
- **Will not** install Node.js, pnpm, or run the web app build — see §4 (prebuild steps).
- **Will not** sign with our developer key (no shared-secret reuse) — see §8 (reproducible builds).

---

## 2. Build metadata — what we already have

`.fdroid.yml` is consumed by `fdroid checkupdates` and the F-Droid build server. It mirrors `metadata/com.dogisthub.app.yml` in the `fdroid/fdroiddata` repo. Key fields:

```yaml
RepoType: git
Repo: https://github.com/d-o-hub/do-gist-hub.git
Builds:
  - versionName: 0.2.0
    versionCode: 1
    commit: v0.2.0
    subdir: android
    gradle: [assembleFdroid]
    output: app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
AutoUpdateMode: Version
UpdateCheckMode: Tags
```

Notes specific to our setup:

- **`versionCode` is environment-driven** (`GITHUB_RUN_NUMBER` on CI) and therefore **not** statically visible in `app/build.gradle`. F-Droid's `checkupdates` will fail to auto-detect our versions, so every release needs a manual `Builds:` entry. Plan 047 accepted this trade-off; we will not change it.
- **`fdroid` is a Gradle `buildType`**, not a `productFlavor`. AGP emits the APK to `app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk` with no flavor or build-type subfolder. The `-unsigned` suffix is added because `signingConfig null` (this is what F-Droid expects).
- **`matchingFallbacks ['release']`** (commit `56123fe`) is required: `:capacitor-android` only publishes `debug` and `release` variants, so AGP would otherwise fail to resolve `:app:fdroidCompileClasspath` with `No matching variant of project :capacitor-android was found. ... the consumer needed ... BuildTypeAttr with value 'fdroid'`.
- **Pre-releases (e.g. `v0.2.0-rc.1`) must be omitted** from the `Builds:` list — F-Droid will not publish an end-user update to a pre-release, and the strictly-increasing `versionCode` rule makes them actively harmful.

---

## 3. Local validation before opening the MR (recommended)

Per the F-Droid [Submitting to F-Droid Quick Start Guide](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/) (updated 2026), the recommended workflow is to lint and build the metadata locally before opening a GitLab MR. The F-Droid CI will catch most issues, but local validation is faster and avoids polluting the MR thread with fix-up commits.

### 3.1 Install `fdroidserver`

```bash
# Option A — pip (works on macOS, Ubuntu, Arch)
python3 -m venv .venv-fdroid
source .venv-fdroid/bin/activate
pip install fdroidserver

# Option B — Docker (no host Python changes)
docker pull registry.gitlab.com/fdroid/fdroidserver:buildserver
```

### 3.2 Lint the metadata

```bash
# Symlink the in-repo metadata so fdroidserver can find it
mkdir -p ~/fdroiddata/metadata
cp .fdroid.yml ~/fdroiddata/metadata/com.dogisthub.app.yml
cd ~/fdroiddata
fdroid lint com.dogisthub.app
```

`fdroid lint` checks for missing required fields, type errors, deprecated keys, and Antifeature consistency. The output is usually verbose — anything that is not a deprecation warning needs to be fixed before the MR.

### 3.3 Reformat the metadata

```bash
fdroid rewritemeta com.dogisthub.app
git diff metadata/com.dogisthub.app.yml
```

`fdroid rewritemeta` standardises field order, quoting, and whitespace. Run it before committing; the diff is usually cosmetic but reveals hidden type issues (e.g. a string that should have been a list).

### 3.4 Smoke build (optional, slow)

```bash
# Docker build environment — uses Debian stable + Android SDK
docker run --rm -itu vagrant --entrypoint /bin/bash \
  -v ~/fdroiddata:/build:z \
  -v "$(pwd):/src:z" \
  registry.gitlab.com/fdroid/fdroidserver:buildserver
```

Inside the container:

```bash
. /etc/profile
export PATH="$fdroidserver:$PATH" PYTHONPATH="$fdroidserver"
export JAVA_HOME=$(java -XshowSettings:properties -version 2>&1 > /dev/null | grep 'java.home' | awk -F'=' '{print $2}' | tr -d ' ')
cd /build
fdroid readmeta
fdroid build com.dogisthub.app
```

> **Time warning**: a first build can take 30–60 min on a clean container. The `android-fdroid-build` GitHub Actions job is the cheaper alternative for verifying the build itself; use this only when validating the metadata.

The F-Droid build server uses Ubuntu (not Debian, as one might expect from `fdroidserver` docs) with a pinned JDK 21. The build environment is itself reproducible — see the [`fdroidserver/buildserver`](https://gitlab.com/fdroid/fdroidserver/-/tree/master/buildserver) Dockerfile.

### 3.5 Check for upstream updates

```bash
fdroid checkupdates --human --verbose com.dogisthub.app
```

This is what `checkupdates` will run on a daily cron in `fdroiddata`. It needs network access to GitHub. For our repo it will fail to read `versionCode` from `build.gradle` (since we set it from `GITHUB_RUN_NUMBER`), which is expected and the reason we update the `Builds:` list manually per release.

---

## 4. Build environment caveats specific to this project

The F-Droid build server runs a curated Debian image with OpenJDK, the Android SDK, and Gradle. It does **not** ship Node.js or pnpm. The Capacitor Android shell is a thin wrapper around the web app, so we need a `prebuild` step to install Node + pnpm and run the web app build before the Gradle step.

### 4.1 Capacitor prebuild (recommended)

In the `metadata/com.dogisthub.app.yml` for the submission, replace the simple `gradle: [assembleFdroid]` with:

```yaml
Builds:
  - versionName: 0.2.0
    versionCode: 1
    commit: v0.2.0
    subdir: android
    prebuild:
      - npm install -g pnpm@9
      - pnpm install --frozen-lockfile
      - pnpm run build
      - pnpm exec cap sync android
    gradle:
      - assembleFdroid
    output: app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
```

This is the pattern F-Droid reviewers most often request for Capacitor/Cordova/Electron apps. It runs in `subdir: android`'s parent (the repo root), not in `subdir:` itself — `prebuild` runs before the work directory is changed into `subdir`.

If the F-Droid build server's `npm install -g pnpm@9` fails because the server has no network access to the npm registry, the build will fail. In that case the reviewer will ask for a pinned node + pnpm via `sudo`:

```yaml
sudo:
  - apt-get update
  - apt-get install -y curl
  - curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  - apt-get install -y nodejs
  - npm install -g pnpm@9
```

Note: `sudo` runs in a clean VM, so installs do not persist between builds. The reviewer will tell you which approach is preferred for our case.

### 4.2 JDK version

Our `android/app/build.gradle` declares `JavaVersion.VERSION_21` and our CI installs JDK 21 (Zulu). The F-Droid build server ships with multiple JDKs; you can pin ours with `sudo` if the default is older:

```yaml
sudo:
  - update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java
```

The simpler path is to add to `MaintainerNotes` so the reviewer knows what to expect.

### 4.3 Native code (none in this project)

We ship no JNI/native libraries, so `buildjni` is not needed. `scandelete` is also not needed — there are no test fixtures or third-party blobs in the source tree.

---

## 5. Upstream fastlane metadata (recommended by F-Droid since 2023)

The F-Droid [Submitting Guide](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/) strongly encourages maintaining the app store metadata (`summary`, `description`, `icon`, `screenshots`, `changelogs`) in the **source repository** rather than only in `fdroiddata`. F-Droid's build pipeline auto-detects these via `fastlane/metadata/android/<locale>/` (or the equivalent `metadata/<locale>/`) and will use the upstream copy if it is present. Benefits:

- Translations and updates flow automatically from the source repo.
- The source repo stays the single source of truth for app store copy.
- Future maintainers (without GitLab access) can still update the listing.

### 5.1 Directory layout to add

```
fastlane/
└── metadata/
    └── android/
        └── en-US/
            ├── title.txt                 (≤ 50 chars)
            ├── short_description.txt     (≤ 80 chars, no trailing dot)
            ├── full_description.txt      (≤ 4000 chars)
            ├── icon.png                  (512×512 or 192×192 PNG)
            ├── images/
            │   ├── phoneScreenshots/
            │   │   ├── 1.png
            │   │   └── 2.png
            │   └── featureGraphic.png    (optional, 1024×500)
            └── changelogs/
                └── 1.txt                 (max 500 chars, one per versionCode)
```

> **Note**: F-Droid's own client uses `metadata/en-US/` instead of `fastlane/metadata/android/en-US/`. Both paths are supported; `fastlane/` is the F-Droid-canonical location and avoids clashes with other store tools (Google Play, IzzyOnDroid, etc.).

### 5.2 Concrete files to add for v0.2.0

`fastlane/metadata/android/en-US/title.txt`:

```
d.o. Gist Hub
```

`fastlane/metadata/android/en-US/short_description.txt`:

```
Offline-first GitHub Gist manager
```

`fastlane/metadata/android/en-US/full_description.txt` (copy from `.fdroid.yml` `Description:` field):

```
d.o. Gist Hub is an offline-first Progressive Web App (PWA) for managing
GitHub Gists. It wraps the web app in a native Android shell via Capacitor.

Features:
  • Full Gist CRUD — create, read, update, delete gists
  • Star/unstar/fork/revisions
  • Offline-first — read cached gists, queue writes for sync
  • Conflict detection with local-wins/remote-wins/manual resolution
  • OAuth Device Flow (opt-in) or fine-grained PAT authentication
  • Token-driven responsive design — works from 320px phones to 1536px+ desktops
  • Dark mode first with light theme override
  • Strict Content Security Policy — zero unsafe-inline
  • AES-GCM encrypted token storage at rest

No proprietary dependencies. No Google Play Services.
No third-party analytics; limited local auth telemetry collected for login diagnostics only.
Fully open source under the MIT license.
```

`fastlane/metadata/android/en-US/changelogs/1.txt`:

```
Initial F-Droid release (v0.2.0):
  • Full Gist CRUD
  • Star/unstar/fork/revisions
  • Offline-first storage with sync queue
  • OAuth Device Flow and PAT auth
  • Dark mode first, 320px–1536px responsive
```

### 5.3 Icon and screenshots

F-Droid will use the `icon.png` here in preference to the one bundled in the APK. Use the same source asset as the PWA manifest icon (`src/assets/icons/`). Take screenshots on a 360×640 device profile with Chrome's mobile emulator and `prefers-color-scheme: dark`. Re-take per major release.

### 5.4 When to update

Every release: add `changelogs/<versionCode>.txt` and bump `fastlane/metadata/android/en-US/full_description.txt` if features changed. F-Droid's `checkupdates` bot will detect the new tag and submit a `fdroiddata` MR that picks up the new changelog automatically.

---

## 6. GitLab MR submission (issue #213)

Issue #213 is the only remaining open task for F-Droid publication. It cannot be automated because it requires a GitLab account with push access to a fork of `fdroid/fdroiddata` and a manual MR — there is no API on the GitLab side that we can drive from a GitHub Action without storing long-lived GitLab credentials.

### 6.1 The missing `scripts/submit-to-fdroid.sh` helper

Issue #213 references a helper script `scripts/submit-to-fdroid.sh` that does not exist. Either:

- **(a)** create it as a thin wrapper that copies `.fdroid.yml` to `metadata/com.dogisthub.app.yml` after substituting any environment-specific values, or
- **(b)** drop the reference from issue #213 and document the manual copy step here.

Recommendation: **(a)**. A helper ensures the `fdroiddata` copy is regenerated from the canonical `.fdroid.yml` (no drift) and that the build metadata stays in lockstep with the source repo. Proposed implementation:

```bash
#!/usr/bin/env bash
# scripts/submit-to-fdroid.sh — generate the F-Droid submission metadata.
# Reads the canonical .fdroid.yml from the repo root and emits the
# metadata/<packageId>.yml file expected by the fdroiddata fork.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/.fdroid.yml"
DEST_DIR="${1:-$REPO_ROOT/dist/fdroid}"
PACKAGE_ID="$(grep '^applicationId' "$REPO_ROOT/android/app/build.gradle" \
  | sed -E 's/.*"([^"]+)".*/\1/')"

mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST_DIR/${PACKAGE_ID}.yml"

# Substitute build.gradle-derived values for fields that .fdroid.yml
# keeps as placeholders (currently none — versionName/versionCode
# are already in .fdroid.yml).
# sed -i '' "s|PLACEHOLDER_PACKAGE_ID|$PACKAGE_ID|g" "$DEST_DIR/${PACKAGE_ID}.yml"

echo "Wrote $DEST_DIR/${PACKAGE_ID}.yml"
echo "Next: copy this file into your fdroiddata fork at metadata/${PACKAGE_ID}.yml"
echo "Then commit and open an MR with title: New App: $PACKAGE_ID"
```

This script does not require a GitLab token and is safe to run locally; it just produces a single file. Commit it on a docs/chore commit alongside the fastlane metadata.

### 6.2 Fork `fdroiddata` and add the metadata file

```bash
# 1. Create a GitLab account (free) at https://gitlab.com
# 2. Fork https://gitlab.com/fdroid/fdroiddata from the GitLab UI
# 3. Clone your fork
git clone https://gitlab.com/<your-username>/fdroiddata.git ~/fdroiddata
cd ~/fdroiddata
git checkout -b com.dogisthub.app
```

Then either run the helper:

```bash
bash /path/to/do-gist-hub/scripts/submit-to-fdroid.sh ~/fdroiddata/metadata
```

or manually copy:

```bash
cp /path/to/do-gist-hub/.fdroid.yml ~/fdroiddata/metadata/com.dogisthub.app.yml
# (then add the prebuild block from §4.1)
```

### 6.3 Validate via the GitLab CI in your fork

```bash
cd ~/fdroiddata
git add metadata/com.dogisthub.app.yml
git commit -m "New App: com.dogisthub.app"
git push origin com.dogisthub.app
```

Pushing triggers the `fdroiddata` GitLab CI which runs `fdroid lint`, `fdroid checkupdates`, and (on label `~"Build Request"`) `fdroid build`. Watch the pipeline at `https://gitlab.com/<your-username>/fdroiddata/-/pipelines`. Common failures at this stage:

| Error | Fix |
|---|---|
| `Metadata missing required field X` | Add the field (see [Build Metadata Reference](https://f-droid.org/docs/Build_Metadata_Reference/)) |
| `versionCode must be a positive integer` | Quote it in YAML (`versionCode: '1'`) or ensure it parses as int |
| `output path does not exist` | Verify the path; remember `subdir: android` shifts the root |
| `Binary blob detected in source tree` | Add `scandelete:` entries or use `rm:` to exclude |
| `Build failed: gradle task not found` | Verify `assembleFdroid` runs locally with `./gradlew assembleFdroid` |
| `Node.js not found` during Capacitor prebuild | Add the `prebuild:` block from §4.1 or the `sudo:` install path |

### 6.4 File a Request for Packaging (RfP) issue

Per the F-Droid submission guide (since 2024), open an issue in the [`fdroid/rfp`](https://gitlab.com/fdroid/rfp/-/issues) tracker:

```text
Title: Request for Packaging: com.dogisthub.app

App: d.o. Gist Hub
Package: com.dogisthub.app
Source: https://github.com/d-o-hub/do-gist-hub
License: MIT
Description: Offline-first GitHub Gist manager wrapped in a Capacitor Android shell.
Build dependency: Node.js 22 LTS + pnpm 9 + JDK 21 (see prebuild in metadata).
Upstream metadata: fastlane/metadata/android/en-US/ in source repo.
Antifeatures: NonFreeNet (GitHub API dependency, unavoidable for core functionality).
Reproducible builds: not yet (Capacitor 8 + Chromium webview make bit-for-bit reproducibility impractical).
MR: https://gitlab.com/fdroid/fdroiddata/-/merge_requests/<N>
```

This gives F-Droid reviewers a single place to track the conversation and is required for the MR to be accepted.

### 6.5 Open the MR

```bash
# From your fork in GitLab UI:
#   1. Branches → com.dogisthub.app → "Create merge request"
#   2. Title:    "New App: com.dogisthub.app"
#   3. Description: link to the RfP issue from §6.4 and to the source repo
#   4. Apply label: "fdroid-bot" (optional, triggers automated checks)
#   5. Apply label: "Build Request" (asks the build bot to attempt a build)
```

The F-Droid build bot will attempt a build and report back via MR comments within a few hours.

### 6.6 Responding to reviewer feedback

Reviewers will typically ask for one or more of the following:

- **Antifeature flags** — pre-declared `NonFreeNet` should be enough, but expect to add `Tracking` if any optional analytics are added later.
- **Build environment fixes** — usually a `prebuild` or `sudo` addition. See §4.
- **Upstream fastlane metadata** — see §5. F-Droid prefers this in the source repo.
- **Per-version changelogs** — add `changelogs/<versionCode>.txt` files. See §5.2.
- **Reproducible builds** — for new apps, F-Droid actively encourages it. See §8.
- **Binary / non-free asset removal** — we have none, but if reviewers flag something (e.g. an icon set that is not clearly MIT) we must replace it or add a `scandelete` entry with a justification in the MR description.

Reply inline on each MR comment thread, push follow-up commits, and re-request review.

### 6.7 Publication

Once the MR is merged, F-Droid's [build server](https://monitor.f-droid.org/builds/build) picks up the metadata and schedules a build. The full cycle (merge → first published APK) is typically **24–48 hours** because the APK signing step requires human access to the F-Droid keystore.

Confirm publication by:

- Watching [F-Droid Monitor](https://monitor.f-droid.org/) for a green build entry under `com.dogisthub.app`.
- Checking the [F-Droid package page](https://f-droid.org/packages/com.dogisthub.app/) (this URL works once published).
- Asking the F-Droid client to refresh its index from Settings → Manage repos → f-droid.org → Update.

---

## 7. F-Droid badge in `README.md`

Once the app is live, add the F-Droid badge to the badges row at the top of `README.md`. Order: F-Droid before any proprietary-store badge. Format follows the F-Droid artwork guide:

```markdown
[![F-Droid](https://fdroid.gitlab.io/artwork/badge/get-it-on.svg)](https://f-droid.org/packages/com.dogisthub.app/)
```

The badge SVG is served by F-Droid itself and links to the package page. Do **not** self-host the badge — F-Droid periodically updates the artwork.

---

## 8. Reproducible builds (best practice, optional for v0.2.0)

F-Droid's [Reproducible Builds docs](https://f-droid.org/docs/Reproducible_Builds/) describe the goal: anyone (developer, F-Droid, end user) can build the same APK from the same source and verify it bit-for-bit matches the published one. F-Droid verifies this using [apksigcopier](https://github.com/obfusk/apksigcopier) — it builds from source, then copies the developer's signature onto our build and checks the result is byte-identical.

For new apps (us) F-Droid "mainly encourage[s] [it]" but does not require it. Trade-offs:

| Pro | Con |
|---|---|
| Higher trust — both F-Droid and the developer sign the same APK | Switching to reproducible later requires re-installation by existing users (Android v1 signing does not allow key rotation without `v2`/`v3`) |
| F-Droid can ship developer-signed APKs directly | Adds 2–6h of build-environment hardening work |
| Emergency developer updates bypass the F-Droid review queue | Capacitor 8 + Chromium WebView bundle a lot of prebuilt native code that is itself not reproducible |
| Catches supply-chain attacks against either build path | Our `versionCode` is environment-driven (`GITHUB_RUN_NUMBER`) so build metadata would also need to be normalised |

**Recommendation**: defer reproducible builds to a v0.4.0 milestone. The concrete blockers are:

1. `versionCode` and `versionName` come from CI env vars. Reproducible builds need a single source of truth baked into the source tree.
2. `pnpm-lock.yaml` pins our JS deps, but the Capacitor + Chromium WebView native blobs are not reproducible across hosts.
3. ProGuard mapping files and resource IDs may vary between runs unless the SDK and build tools are bit-for-bit pinned.

The v0.4.0 plan would be: (a) move `versionCode`/`versionName` to static values in `app/build.gradle`, (b) enable `signingConfig` in CI for a developer-keyed signed APK, (c) add a `Binaries:` URL to the `fdroiddata` metadata pointing to our GitHub release APK. Then F-Droid will automatically switch to upstream-signed APKs once the byte-identical check passes.

---

## 9. Update workflow (per release, post-publication)

Per ADR-016/Plan 047, we accept a one-time-per-release manual metadata update. The update cycle is ~5 minutes per release. Steps:

### 9.1 Source repo (in this project)

```bash
# 1. Bump VERSION
echo "0.2.1" > VERSION

# 2. Update CHANGELOG and fastlane changelog
echo "• ..." >> fastlane/metadata/android/en-US/changelogs/2.txt  # versionCode=2

# 3. Commit
git add VERSION fastlane/metadata/android/en-US/changelogs/
git commit -m "chore: bump version to 0.2.1"

# 4. Tag and push
git tag v0.2.1
git push origin main v0.2.1
```

The push triggers the normal release workflow which builds and signs the Play-Store / GitHub-Release APK. F-Droid ignores GitHub Releases and watches git tags directly.

### 9.2 fdroiddata fork (manual, 5 min)

```bash
cd ~/fdroiddata
git checkout master && git pull
git checkout -b com.dogisthub.app-0.2.1
# Edit metadata/com.dogisthub.app.yml
# Add a new entry to the Builds: list:
#
#   - versionName: 0.2.1
#     versionCode: 2
#     commit: v0.2.1
#     subdir: android
#     prebuild:
#       - npm install -g pnpm@9
#       - pnpm install --frozen-lockfile
#       - pnpm run build
#       - pnpm exec cap sync android
#     gradle:
#       - assembleFdroid
#     output: app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
#
# Update CurrentVersion: 0.2.1
# Update CurrentVersionCode: 2

fdroid rewritemeta com.dogisthub.app
git diff metadata/com.dogisthub.app.yml
git add metadata/com.dogisthub.app.yml
git commit -m "com.dogisthub.app: update to 0.2.1"
git push origin com.dogisthub.app-0.2.1
# Open MR from GitLab UI
```

F-Droid's `checkupdates` bot can also do this automatically, but only if `versionCode` is statically visible (see §8). Until we move to reproducible builds, the manual update is the contract.

### 9.3 Closing the loop

After F-Droid publishes 0.2.1:

- Update `plans/047-v0.3.0-scope.md` — mark Goal 1 fully complete.
- Update `plans/_index.md` and `plans/_status.json` if there is a "F-Droid status" entry.
- Optionally tweet / post the F-Droid link.

---

## 10. Troubleshooting

### 10.1 Build fails: "No matching variant of project :capacitor-android was found"

Already fixed in commit `56123fe`. If you see this on a fresh F-Droid build, the matching `matchingFallbacks` is missing from your `fdroiddata` metadata. Re-add the line from `android/app/build.gradle:59` to the build context — note that `matchingFallbacks` is a Gradle-internal config, **not** a metadata field. F-Droid picks up the Gradle config from the source repo, so the fix is to rebase onto the `rescue/implementation-gaps` branch (or whichever branch contains the commit).

### 10.2 Build fails: "Node.js not found" or "pnpm: command not found"

The Capacitor prebuild steps in §4.1 are missing. Add them to the `prebuild:` block. F-Droid reviewers will usually suggest the exact form.

### 10.3 Build fails: "versionCode mismatch — expected 1, found X"

The APK's `versionCode` (from `GITHUB_RUN_NUMBER` in our CI) doesn't match the `versionCode: 1` declared in `fdroiddata`. Two fixes:

- **(a)** Set `versionCode` from `VERSION` instead of `GITHUB_RUN_NUMBER` (and parse `VERSION` to an int).
- **(b)** Override the `versionCode` in the `fdroiddata` `Builds:` entry to match the CI's `GITHUB_RUN_NUMBER` for the tag.

(b) is fragile. (a) is the right long-term fix. Either way, document the choice in `MaintainerNotes:`.

### 10.4 App is published but with a "tracking" antifeature we did not declare

Reviewer judgement call. Common sources:

- The auth telemetry module (ADR-016) collects anonymous counts of `pat` vs `device-flow` auth methods. By F-Droid's strict definition, this may qualify as `Tracking`. Mitigation: gate the telemetry behind an opt-in flag in-app settings, or document why it is "local-only and not transmitted" in `MaintainerNotes:`.

### 10.5 App is published but users cannot update from a previous version

F-Droid signing key changed between releases. Possible causes:

- The `signingConfig` in our `fdroid` build type was modified between releases.
- F-Droid rotated their signing key (very rare, but it has happened for compromised apps).
- The previous version was installed from a different source (Play Store, GitHub Release) — these have different signatures, so F-Droid cannot update them.

Document the install path in the README and consider linking a "uninstall first" notice on the F-Droid package page.

### 10.6 Local `fdroid build` is slow or hangs on Gradle

The first build downloads the Android SDK + Gradle distribution (~1.5 GB). Subsequent builds are cached. Use `--no-clean` to skip Gradle's clean step during iteration. For a single-file metadata check, `fdroid lint` is much faster.

---

## 11. References (2026 best-practice sources)

- [F-Droid Build Metadata Reference](https://f-droid.org/docs/Build_Metadata_Reference/) — canonical field documentation
- [F-Droid Submitting to F-Droid Quick Start Guide](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/) — submission workflow
- [F-Droid Inclusion Policy](https://f-droid.org/docs/Inclusion_Policy/) — what is and is not allowed
- [F-Droid Reproducible Builds](https://f-droid.org/docs/Reproducible_Builds/) — what they verify, how
- [F-Droid Antifeatures](https://f-droid.org/docs/Anti-Features/) — full list and rationale
- [`fdroiddata` repository](https://gitlab.com/fdroid/fdroiddata) — where to fork and open the MR
- [`fdroidserver`](https://gitlab.com/fdroid/fdroidserver) — local tooling for lint / build
- [F-Droid Request for Packaging](https://gitlab.com/fdroid/rfp/-/issues) — required submission ticket
- [F-Droid Monitor](https://monitor.f-droid.org/builds/build) — live build status
- [Towards a reproducible F-Droid](https://f-droid.org/en/2023/01/15/towards-a-reproducible-fdroid.html) — long-form explainer on reproducible builds
- [Reproducible builds, signing keys, and binary repos](https://f-droid.org/en/2023/09/03/reproducible-builds-signing-keys-and-binary-repos.html) — how F-Droid verifies reproducibility
- [apksigcopier](https://github.com/obfusk/apksigcopier) — tool F-Droid uses to copy the developer's signature
- [F-Droid app metadata fastlane layout](https://gitlab.com/fdroid/fdroidclient/-/tree/master/metadata/en-US) — example upstream metadata tree
- [All About Descriptions, Graphics and Screenshots](https://f-droid.org/docs/All_About_Descriptions_Graphics_and_Screenshots) — what to put where

In-repo references:

- [`.fdroid.yml`](../../.fdroid.yml) — canonical F-Droid build metadata
- [`android/app/build.gradle`](../../android/app/build.gradle) — `fdroid` build type + `matchingFallbacks`
- [`android/app/capacitor.build.gradle`](../../android/app/capacitor.build.gradle) — Capacitor integration
- [`.github/workflows/ci.yml` `android-fdroid-build` job](../../.github/workflows/ci.yml) — CI that validates `assembleFdroid`
- [`docs/CAPACITOR_ANDROID.md`](./CAPACITOR_ANDROID.md) — Capacitor-specific build notes
- [`docs/FDROID_DEPLOYMENT.md`](./FDROID_DEPLOYMENT.md) — historical pre-2026 deployment overview (kept for reference)
- [`docs/FDROID_SUBMISSION_CHECKLIST.md`](./FDROID_SUBMISSION_CHECKLIST.md) — historical quick checklist (kept for reference)
- [`plans/047-v0.3.0-scope.md`](../plans/047-v0.3.0-scope.md) — Goal 1 (F-Droid Publication) tracker
- Issue [#213](https://github.com/d-o-hub/do-gist-hub/issues/213) — the only remaining open F-Droid task (manual GitLab MR)

---

## 12. Open follow-ups for v0.3.0 and beyond

| Item | Target | Notes |
|---|---|---|
| F-Droid badge in `README.md` | v0.3.0 (post-publication) | Single-line change in `README.md` badges row |
| `fastlane/metadata/android/en-US/` tree | v0.3.0 (pre-MR) | 4–5 small text files + an icon + 1–2 screenshots |
| `scripts/submit-to-fdroid.sh` helper | v0.3.0 (pre-MR) | ~20 lines, no secrets, no network |
| Reproducible builds | v0.4.0 | Requires (a) static `versionCode`, (b) developer signing in CI, (c) `Binaries:` in fdroiddata |
| Static `versionCode` in `build.gradle` | v0.4.0 | Pre-req for auto-updates and reproducibility |
| Capacitor WebView reproducibility | v0.4.0+ | Likely blocked by Chromium build pipeline; assess with maintainer |
