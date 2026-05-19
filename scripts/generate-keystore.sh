#!/usr/bin/env bash
# scripts/generate-keystore.sh
#
# Generate an Android upload keystore and export GitHub Secrets values.
# Run this once to prepare for Play Store deployment.
#
# Prerequisites: JDK 11+ (keytool binary)
#
# Usage:
#   chmod +x scripts/generate-keystore.sh
#   ./scripts/generate-keystore.sh
#
# Output:
#   - release-key.keystore       ← The JKS keystore file
#   - upload_cert.pem            ← Upload certificate (PEM) for Play Console
#   - github_secrets.txt         ← Values ready to paste into GitHub Secrets

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${DIR}/android/app"
KEYSTORE_FILE="${OUT_DIR}/release-key.keystore"
ALIAS="my-key-alias"
VALIDITY=10000
CERT_FILE="${OUT_DIR}/upload_cert.pem"
# Secrets file written to temp dir outside the repo
#     to prevent accidental commit.
SECRETS_FILE="/tmp/do-gist-hub-github-secrets.txt"

echo "============================================="
echo "  d.o. Gist Hub — Keystore Generator"
echo "============================================="
echo ""

# ── Prevent accidental overwrite ─────────────────────────────────
if [ -f "${KEYSTORE_FILE}" ]; then
  echo "WARNING: Keystore already exists at ${KEYSTORE_FILE}"
  echo "  Generating a new one will INVALIDATE the upload key"
  echo "  registered in Google Play Console for this app."
  read -r -p "Overwrite? (yes/no): " CONFIRM
  if [ "${CONFIRM}" != "yes" ]; then
    echo "Aborted."
    exit 0
  fi
fi

# ── Check prerequisites ──────────────────────────────────────────
if ! command -v keytool &>/dev/null; then
  echo "ERROR: keytool not found. Install JDK 11+."
  echo "  Ubuntu/Debian: sudo apt install openjdk-21-jdk"
  echo "  macOS:          brew install openjdk"
  echo "  Codespaces:     JDK is pre-installed — create a Codespace on main"
  exit 1
fi

KEYTOOL_VERSION="$(keytool -version 2>&1 || true)"
echo "[✓] keytool found: ${KEYTOOL_VERSION}"

# ── Detect platform for base64 flags ─────────────────────────────
case "$(uname -s)" in
  Darwin)  BASE64_FLAGS="-b 0" ;;
  *)       BASE64_FLAGS="-w 0" ;;
esac
echo "[✓] Detected $(uname -s) — using base64 ${BASE64_FLAGS}"
echo ""

# ── Gather passwords ─────────────────────────────────────────────
echo "You will be prompted for keystore and key passwords."
echo "Enter a STRONG password (min 12 chars, mixed case + numbers)."
echo ""

read -r -s -p "Keystore password: " KEYSTORE_PASSWORD
echo ""
read -r -s -p "Confirm keystore password: " KEYSTORE_PASSWORD2
echo ""
if [ "${KEYSTORE_PASSWORD}" != "${KEYSTORE_PASSWORD2}" ]; then
  echo "ERROR: Passwords do not match."
  exit 1
fi
if [ ${#KEYSTORE_PASSWORD} -lt 12 ]; then
  echo "ERROR: Password must be at least 12 characters."
  exit 1
fi

read -r -s -p "Key password (can match keystore password): " KEY_PASSWORD
echo ""
read -r -s -p "Confirm key password: " KEY_PASSWORD2
echo ""
if [ "${KEY_PASSWORD}" != "${KEY_PASSWORD2}" ]; then
  echo "ERROR: Passwords do not match."
  exit 1
fi

# ── Generate keystore ────────────────────────────────────────────
echo ""
echo "[...] Generating keystore (validity ${VALIDITY} days)..."
echo "      You may optionally fill in distinguished name fields."
echo "      Press Enter to skip each field."
echo ""

keytool -genkey -v \
  -keystore "${KEYSTORE_FILE}" \
  -alias "${ALIAS}" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "${VALIDITY}" \
  -storetype jks \
  -storepass "${KEYSTORE_PASSWORD}" \
  -keypass "${KEY_PASSWORD}"

echo ""
echo "[✓] Keystore created: ${KEYSTORE_FILE}"
ls -lh "${KEYSTORE_FILE}"

# ── Export upload certificate ────────────────────────────────────
keytool -export -rfc \
  -alias "${ALIAS}" \
  -keystore "${KEYSTORE_FILE}" \
  -storepass "${KEYSTORE_PASSWORD}" \
  -file "${CERT_FILE}"

echo "[✓] Upload certificate exported: ${CERT_FILE}"
echo ""

# ── Encode keystore to base64 ────────────────────────────────────
BASE64_OUTPUT="$(base64 "${BASE64_FLAGS}" "${KEYSTORE_FILE}")"

# ── Write secrets file ───────────────────────────────────────────
cat > "${SECRETS_FILE}" <<-SEOF
# d.o. Gist Hub — GitHub Secrets Configuration
# Copy these values into GitHub → Settings → Secrets and variables → Actions
#
# Created: $(date -u +%Y-%m-%d)
# Keystore: ${KEYSTORE_FILE}
# Alias:    ${ALIAS}
#
# 🔒 DELETE THIS FILE after configuring GitHub secrets.
#    It contains plain-text passwords.
# =================================================================

Secret: ANDROID_KEYSTORE_BASE64
Value:
${BASE64_OUTPUT}

Secret: ANDROID_KEYSTORE_PASSWORD
Value: ${KEYSTORE_PASSWORD}

Secret: ANDROID_KEY_ALIAS
Value: ${ALIAS}

Secret: ANDROID_KEY_PASSWORD
Value: ${KEY_PASSWORD}

# =================================================================
# 🔒 KEEP THIS FILE SAFE — add its name to .gitignore if committed.
#    File: ${SECRETS_FILE}
#    Delete after GitHub secrets are configured.
# =================================================================
SEOF

echo "[✓] GitHub secrets file created: ${SECRETS_FILE}"
echo "    ${SECRETS_FILE}"
echo ""

# ── Summary ──────────────────────────────────────────────────────
echo "============================================="
echo "  NEXT STEPS"
echo "============================================="
echo ""
echo "1. Go to GitHub → Settings → Secrets and variables → Actions"
echo "   Add the 4 secrets from: ${SECRETS_FILE}"
echo ""
echo "2. In Google Play Console → App Signing:"
echo "   Upload the certificate from: ${CERT_FILE}"
echo ""
echo "3. Push a v* tag to trigger the release workflow:"
echo "   git tag v0.2.1 && git push origin v0.2.1"
echo ""
echo "4. Download app-release.aab from the GitHub Release and"
echo "   upload it to Play Console → Internal Testing"
echo ""
echo "⚠  Keep the keystore and secrets file in a secure location"
echo "   (e.g., password manager). You will need them for every update."
echo ""
echo "⚡  F-Droid Alternative (Free, no Play Console account needed):"
echo "    See docs/FDROID_DEPLOYMENT.md for publishing via F-Droid."
echo "============================================="
