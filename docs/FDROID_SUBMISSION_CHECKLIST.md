# F-Droid Submission Checklist

> **Goal**: Publish d.o. Gist Hub on F-Droid — the free open-source app store.
> **Cost**: $0 (no developer account fee).
> **Track in**: `plans/047-v0.3.0-scope.md` — Goal 1 (F-Droid Publication).

---

## Pre-Flight Checklist

### Before You Submit

- [ ] **Tag exists**: `git tag -l` shows `v0.2.0` pushed to GitHub
- [ ] **VERSION file**: `cat VERSION` matches `0.2.0`
- [ ] **CI passed**: The last release workflow completed successfully on the tag
- [ ] **Quality gate**: `./scripts/quality_gate.sh` passes (973+ tests, all green)
- [ ] **F-Droid build variant**: `./gradlew assembleFdroid` produces a valid unsigned APK
- [ ] **No proprietary deps**: `grep -r "google-services\\|firebase\\|play-services" android/ --include="*.gradle"` returns nothing (already removed ✓)
- [ ] **LICENSE file**: `cat LICENSE` shows MIT license text (F-Droid scans this)
- [ ] **`.fdroid.yml` validated**: Metadata is complete with correct `output` path

### Tag Readiness

```bash
# Check tag exists
git tag -l 'v0.2.0'

# Verify version file
cat VERSION
# → 0.2.0

# Build the F-Droid unsigned APK locally (optional but recommended)
cd android && ./gradlew assembleFdroid
# → app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
```

---

## Submission Steps

### Step 1: Fork fdroiddata

- [ ] Go to https://gitlab.com/fdroid/fdroiddata
- [ ] Click **Fork** (top right)
- [ ] Clone your fork:

```bash
git clone https://gitlab.com/<your-username>/fdroiddata.git
cd fdroiddata
```

### Step 2: Create metadata file

- [ ] Create the directory and file:

```bash
mkdir -p metadata
touch metadata/com.dogisthub.app.yml
```

- [ ] Copy the contents of `.fdroid.yml` from this repo into `metadata/com.dogisthub.app.yml`
- [ ] Verify the metadata against the [Build Metadata Reference](https://f-droid.org/docs/Build_Metadata_Reference/)

### Step 3: Validate metadata (optional)

- [ ] Install fdroidserver: `pip install fdroidserver`
- [ ] Lint: `fdroid lint metadata/com.dogisthub.app.yml`
- [ ] Check for updates: `fdroid checkupdates --human --verbose --all`

### Step 4: Submit Merge Request

- [ ] Commit metadata:

```bash
git add metadata/com.dogisthub.app.yml
git commit -m "Add d.o. Gist Hub (com.dogisthub.app)"
git push origin main
```

- [ ] Create Merge Request on GitLab from your fork → `fdroid/fdroiddata`
- [ ] In the MR description, mention:
  - App is built with Capacitor (needs Node.js + pnpm on build server)
  - `NonFreeNet` Antifeature is pre-flagged for GitHub API dependency
  - Build variant is `assembleFdroid` (unsigned release with ProGuard)

### Step 5: Respond to Reviewer Feedback

- [ ] F-Droid maintainers will review (typically 24-48h)
- [ ] Common issues for Capacitor apps:
  - Build server lacks Node.js → add `prebuild` steps to metadata
  - Non-free network dependency → already flagged with `NonFreeNet`
  - License detection → ensure `LICENSE` file is in repo root

### Step 6: Publication

- [ ] MR merged into `fdroiddata`
- [ ] Monitor build: https://monitor.f-droid.org/
- [ ] App appears on F-Droid within 24-48 hours of build completion

---

## Post-Submission Tasks

- [ ] Add F-Droid badge to `README.md`:
  ```markdown
  [![F-Droid](https://fdroid.gitlab.io/artwork/badge/get-it-on.svg)](https://f-droid.org/packages/com.dogisthub.app/)
  ```
- [ ] Update `plans/047-v0.3.0-scope.md` — mark Goal 1 as complete
- [ ] Update `plans/046-post-release-and-v0.2.0-stable.md` — mark F-Droid actions as complete
- [ ] Update `plans/_index.md` and `plans/_status.json` if applicable

---

## Future Release Checklist (v0.2.1+)

For each subsequent release:

- [ ] Push new tag (`v0.2.1`)
- [ ] Update `fdroiddata` fork:
  - Add new entry to `Builds:` list in `metadata/com.dogisthub.app.yml`
  - Increment `versionCode` (e.g., 1 → 2)
  - Update `CurrentVersion` to `0.2.1`
- [ ] Create new Merge Request in `fdroiddata`
- [ ] Monitor F-Droid build server

---

## Quick Commands Reference

```bash
# 1. List current tags
git tag -l 'v*'

# 2. Create and push a new tag
VERSION=$(cat VERSION)
git tag "v${VERSION}"
git push origin "v${VERSION}"

# 3. Build F-Droid APK locally
pnpm run build:android
cd android && ./gradlew assembleFdroid && cd ..

# 4. Verify output
ls -lh android/app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
```
