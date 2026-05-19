#!/usr/bin/env bash
# scripts/build-fdroid-apk.sh
#
# Build the F-Droid unsigned APK for d.o. Gist Hub.
# Checks prerequisites (JDK, Android SDK, Node.js) and runs assembleFdroid.
#
# Usage:
#   chmod +x scripts/build-fdroid-apk.sh
#   ./scripts/build-fdroid-apk.sh
#
# Output:
#   android/app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk
#
# Docs: docs/FDROID_DEPLOYMENT.md

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="${DIR}/android"
OUTPUT_APK="${ANDROID_DIR}/app/build/outputs/apk/fdroid/app-fdroid-unsigned.apk"

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ── Header ──────────────────────────────────────────────────────
echo "=============================================="
echo "  d.o. Gist Hub — F-Droid APK Builder"
echo "=============================================="
echo ""

# ── Step 1: Check JDK ───────────────────────────────────────────
info "Step 1/4: Checking JDK..."
if ! command -v java &>/dev/null; then
  echo "  Install JDK 17+ (required for Android Gradle Plugin 8.x):"
  echo "    Ubuntu/Debian: sudo apt install openjdk-21-jdk"
  echo "    macOS:          brew install openjdk"
  echo "    Codespaces:     JDK is pre-installed"
  fail "JDK not found."
fi
JAVA_VERSION="$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d. -f1)"
if [ "${JAVA_VERSION}" -lt 17 ]; then
  fail "JDK 17+ required, found: ${JAVA_VERSION}"
fi
ok "JDK ${JAVA_VERSION} found"

# ── Step 2: Check Android SDK ────────────────────────────────────
info "Step 2/4: Checking Android SDK..."
ANDROID_HOME="${ANDROID_HOME:-${HOME}/Android/Sdk}"
if [ ! -d "${ANDROID_HOME}" ]; then
  # Check common alternative paths
  if [ -d "${HOME}/android-sdk" ]; then
    ANDROID_HOME="${HOME}/android-sdk"
  elif [ -d "/usr/lib/android-sdk" ]; then
    ANDROID_HOME="/usr/lib/android-sdk"
  elif [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -d "${ANDROID_SDK_ROOT}" ]; then
    ANDROID_HOME="${ANDROID_SDK_ROOT}"
  else
  echo "  Tried: ${ANDROID_HOME}"
  echo "  Set ANDROID_HOME to your SDK path and re-run"
  echo "  Or install: ./scripts/setup-android-sdk.sh (if available)"
  fail "ANDROID_HOME not found"
  fi
fi
export ANDROID_HOME
ok "Android SDK found at: ${ANDROID_HOME}"

# ── Step 3: Install JS dependencies ──────────────────────────────
info "Step 3/4: Installing JavaScript dependencies..."
cd "${DIR}"

# Check if pnpm is available
if ! command -v pnpm &>/dev/null; then
  fail "pnpm not found — install pnpm first (https://pnpm.io/installation)"
fi
ok "pnpm found: $(pnpm --version)"

pnpm install --frozen-lockfile 2>/dev/null || {
  echo "  Run: pnpm install --frozen-lockfile"
  fail "Frozen lockfile install failed — lockfile may be out of date"
}
ok "JS dependencies installed"

# ── Step 3b: Sync Capacitor ─────────────────────────────────────
info "Step 3b: Syncing Capacitor..."
if [ -f "${DIR}/node_modules/.bin/capacitor" ]; then
  npx capacitor sync android 2>&1 || true
  ok "Capacitor synced"
else
  warn "Capacitor not installed — skipping sync"
  echo "  Install: pnpm add -D @capacitor/cli @capacitor/android"
fi

# ── Step 4: Build F-Droid APK ───────────────────────────────────
echo ""
info "Step 4/4: Building F-Droid APK (assembleFdroid)..."
cd "${ANDROID_DIR}"

# Ensure gradlew is executable
if [ ! -f "./gradlew" ]; then
  echo "  Run: npx capacitor sync android"
  fail "gradlew not found in android/ directory"
fi
chmod +x ./gradlew

# Run the build
./gradlew assembleFdroid 2>&1 || true
BUILD_EXIT=$?

if [ ${BUILD_EXIT} -ne 0 ]; then
  echo ""
  echo "  Common fixes:"
  echo "  - Ensure ANDROID_HOME is set correctly"
  echo "  - Install missing SDK components:"
  echo "    sdkmanager 'platforms;android-35' 'build-tools;35.0.0'"
  echo "  - Check Gradle daemon: ./gradlew --stop && ./gradlew assembleFdroid"
  echo ""
  echo "  Full guide: docs/CAPACITOR_ANDROID.md"
  fail "Build failed (exit code ${BUILD_EXIT})"
fi

# ── Success ─────────────────────────────────────────────────────
echo ""
ok "Build successful!"
echo ""
echo "  Output: ${OUTPUT_APK}"
if [ -f "${OUTPUT_APK}" ]; then
  ls -lh "${OUTPUT_APK}"
else
  warn "Expected output not found at: ${OUTPUT_APK}"
  echo "  Check android/app/build/outputs/apk/fdroid/ for the APK"
fi

echo ""
echo "=============================================="
echo "  NEXT STEPS"
echo "=============================================="
echo ""
echo "  1. Verify the APK:"
echo "     ls -lh ${OUTPUT_APK}"
echo ""
echo "  2. Submit to F-Droid:"
echo "     ./scripts/submit-to-fdroid.sh"
echo ""
echo "  3. Or install locally (requires manual signing):"
echo "     jarsigner -keystore my-key.keystore ${OUTPUT_APK} my-alias"
echo "     adb install ${OUTPUT_APK}"
echo "=============================================="
