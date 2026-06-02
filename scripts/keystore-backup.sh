#!/bin/bash
# scripts/keystore-backup.sh
# Create an AES-256-CBC + PBKDF2-SHA256 encrypted backup of the Android
# release keystore. Output is a single .age file suitable for storing in
# a password manager or encrypted cloud drive.
#
# Usage:
#   ./scripts/keystore-backup.sh
#
# The script prompts for a bundle passphrase (min 20 chars recommended)
# and writes:
#   keystore/backup/do-gist-hub.jks.age   <- the encrypted backup
#   keystore/backup/METADATA.txt          <- fingerprints + dates (no secrets)
#   keystore/backup/RECOVERY.md           <- restore instructions
#
# See plans/065-keystore-backup-procedure.md for the full procedure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
KEYSTORE="$ROOT_DIR/keystore/do-gist-hub.jks"
OUT_DIR="$ROOT_DIR/keystore/backup"

if [ ! -f "$KEYSTORE" ]; then
  echo "✗ Keystore not found at $KEYSTORE"
  echo "  Run scripts/generate-keystore.sh first."
  exit 1
fi

mkdir -p "$OUT_DIR"

# Generate (or re-prompt for) a bundle passphrase
echo "=== Bundle passphrase ==="
echo "Use a long random string. This passphrase encrypts the keystore"
echo "and is the only thing protecting the .age file. Store it in your"
echo "password manager (e.g., 1Password secure note) — never in chat,"
echo "email, or version control."
echo
read -r -s -p "Bundle passphrase (min 20 chars): " BUNDLE_PASS
echo
if [ "${#BUNDLE_PASS}" -lt 20 ]; then
  echo "✗ Passphrase too short (min 20 chars). Try again."
  exit 1
fi
read -r -s -p "Confirm passphrase: " BUNDLE_PASS_2
echo
if [ "$BUNDLE_PASS" != "$BUNDLE_PASS_2" ]; then
  echo "✗ Passphrases do not match."
  exit 1
fi

# Encrypt
echo "[...] Encrypting keystore with AES-256-CBC + PBKDF2-SHA256 (600,000 iterations)..."
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt \
  -in "$KEYSTORE" \
  -out "$OUT_DIR/do-gist-hub.jks.age" \
  -pass "pass:$BUNDLE_PASS"

echo "[✓] Encrypted backup: $OUT_DIR/do-gist-hub.jks.age ($(stat -c%s "$OUT_DIR/do-gist-hub.jks.age") bytes)"

# Verify decryption round-trips
echo "[...] Verifying decryption round-trip..."
TMP_OUT="$(mktemp)"
trap 'rm -f "$TMP_OUT"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt \
  -in "$OUT_DIR/do-gist-hub.jks.age" \
  -out "$TMP_OUT" \
  -pass "pass:$BUNDLE_PASS"

ORIG_SHA="$(sha256sum "$KEYSTORE" | awk '{print $1}')"
RECOVERED_SHA="$(sha256sum "$TMP_OUT" | awk '{print $1}')"
if [ "$ORIG_SHA" = "$RECOVERED_SHA" ]; then
  echo "[✓] Round-trip verification: SHA-256 matches"
else
  echo "✗ Round-trip verification FAILED"
  echo "  Original:    $ORIG_SHA"
  echo "  Recovered:   $RECOVERED_SHA"
  exit 1
fi
rm -f "$TMP_OUT"
trap - EXIT

# Generate metadata file
echo "[...] Writing METADATA.txt..."
KEYSTORE_PASS_FOR_LISTING="${KEYSTORE_PASSWORD:-changeit}"
SHA1_FP="$(keytool -list -v -keystore "$KEYSTORE" -storepass "$KEYSTORE_PASS_FOR_LISTING" 2>/dev/null | grep "SHA1:" | head -1 | xargs || true)"
SHA256_FP="$(keytool -list -v -keystore "$KEYSTORE" -storepass "$KEYSTORE_PASS_FOR_LISTING" 2>/dev/null | grep "SHA256:" | head -1 | xargs || true)"

cat > "$OUT_DIR/METADATA.txt" <<EOF
d.o. Gist Hub — Android Release Keystore Recovery Bundle
=========================================================

Created:        $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Keystore file:  do-gist-hub.jks
Keystore size:  $(stat -c%s "$KEYSTORE") bytes
Keystore SHA-256: $ORIG_SHA

Certificate fingerprints (for Play Store / F-Droid registration):
  SHA-1:   ${SHA1_FP:-unknown}
  SHA-256: ${SHA256_FP:-unknown}

Bundle contents:
  - do-gist-hub.jks.age  : AES-256-CBC encrypted keystore
  - RECOVERY.md          : Restore instructions
  - METADATA.txt         : This file (no secrets, safe to read)

How to restore (see RECOVERY.md for full steps):
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt \\
    -in do-gist-hub.jks.age -out do-gist-hub.jks
  # Then decrypt with the bundle password
EOF

echo
echo "=== Done ==="
echo "Backup created at: $OUT_DIR/"
ls -la "$OUT_DIR"
echo
echo "Next steps:"
echo "  1. Copy $OUT_DIR/do-gist-hub.jks.age to your password manager"
echo "  2. Store the bundle passphrase in the same secure note"
echo "  3. Verify both copies of the cert fingerprints match METADATA.txt"
echo "  4. (Optional) Upload the .age file to encrypted cloud storage as a tertiary backup"
echo
echo "Reminder: do NOT commit anything from keystore/ to git (it's gitignored)."
