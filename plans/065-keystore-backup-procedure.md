# 065 — Keystore Backup Procedure

> **Date**: 2026-06-02
> **Type**: Runbook
> **Status**: Active (reusable procedure)
> **Related**: `adr-029-android-release-signing.md`, `docs/CAPACITOR_ANDROID.md`, `scripts/generate-keystore.sh`

## Why this exists

The Android release-signing keystore is the cryptographic root of trust for the published app. Once the first APK is uploaded to Google Play, **the same certificate must sign every subsequent update** for the lifetime of the app. Losing the keystore is unrecoverable — Google does not have it, you cannot reset it, and the only option is to publish a new app under a new package name.

Per ADR-029, the keystore lives in the CI runner's volatile filesystem during release builds (decoded from `ANDROID_KEYSTORE_BASE64` and discarded at teardown). The secrets are protected by GitHub's secret storage, but GitHub secrets are not a backup — they can be rotated, lost, or revoked. A separate, durable copy of the keystore must exist outside of GitHub.

## Threat model

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Local disk loss (laptop stolen / hard drive dies) | Medium | Total | Off-host encrypted backup |
| GitHub secret revoked or rotated by accident | Low | Total (during rotation window) | Independent backup that's also rotated when the secret is |
| Keystore password forgotten | Medium | Total (without password, the .jks is opaque) | Password stored in password manager |
| Backup file itself compromised | Low | Total (if unencrypted) | Strong encryption (AES-256-CBC + PBKDF2-SHA256, 600k iterations) |
| Phishing / social engineering | Medium | Total | Encryption key never shared in chat/email |

## The procedure

### 1. Generate the keystore (already done in this repo)

```bash
keytool -genkeypair -v \
  -keystore keystore/do-gist-hub.jks \
  -alias do-gist-hub \
  -keyalg RSA -keysize 2048 -validity 9125 \
  -dname "CN=d.o. Gist Hub, OU=Mobile, O=d-o-hub, L=Berlin, S=Berlin, C=DE"
```

The `9125` validity = 25 years. After 25 years, the keystore is unusable
but already-published APKs remain valid (Android only checks signing
cert validity at install time for newer Android versions; older
versions accept expired certs).

### 2. Create an encrypted backup bundle

Run `scripts/keystore-backup.sh` (or the inline commands below) to produce a single self-contained encrypted file:

```bash
BUNDLE_PASS="<long-random-passphrase-from-password-manager>"
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt \
  -in keystore/do-gist-hub.jks \
  -out keystore/backup/do-gist-hub.jks.age \
  -pass "pass:$BUNDLE_PASS"
```

The output is a ~3 KB binary file. The filename suffix `.age` is
chosen for clarity (it is **not** the `age` tool format — the
algorithm is AES-256-CBC + PBKDF2-SHA256, decryptable with any
OpenSSL 3.x installation).

### 3. Store the bundle in three places

A single backup copy is not a backup. The "rule of three" applies:
- **Primary**: Password manager secure note (1Password, Bitwarden, KeePassXC) — file attached as blob, password in the same note's password field
- **Secondary**: Encrypted cloud drive (iCloud Drive, Google Drive, Dropbox) — file uploaded, accessible from any device with the password manager
- **Tertiary**: Offline (USB drive in a safe, paper backup, or safe deposit box) — for true disaster recovery

All three copies should be encrypted with the same `BUNDLE_PASS`. The
bundle password itself is a high-entropy random string generated once
and stored in the password manager.

### 4. Record the cert fingerprints

Run:

```bash
keytool -list -v -keystore keystore/do-gist-hub.jks -storepass "$KEYSTORE_PASSWORD"
```

Copy the `SHA1:` and `SHA256:` lines into:

- `plans/_keystore-fingerprints.md` (gitignored, see `.gitignore` rules) — for in-repo reference
- 1Password secure note as plain text — so you can confirm a recovered keystore is the correct one without needing the bundle password
- Play Store and F-Droid registration forms

If a recovered keystore's fingerprints do not match these values, the
recovery failed and you must try another copy of the bundle.

### 5. Recovery drill (do this once after first backup, then annually)

1. Pick a clean machine that has never seen the keystore.
2. Download `do-gist-hub.jks.age` from the password manager.
3. Decrypt:
   ```bash
   openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -salt \
     -in do-gist-hub.jks.age -out recovered.jks
   ```
4. Verify the certificate fingerprints match.
5. Optional: sign a known-good APK and verify with `apksigner verify`:
   ```bash
   apksigner verify --print-certs recovered-test.apk
   ```
6. Time the full drill. If it takes more than 5 minutes, simplify the steps and update the bundle docs.

## This repo's current keystore

| Property | Value |
|---|---|
| File | `keystore/do-gist-hub.jks` |
| Size | 2754 bytes |
| SHA-256 | `3a:71:29:b7:3c:b3:05:c4:75:3f:c7:12:9d:71:b0:5e:2c:ba:d0:f9:08:cf:46:f0:5a:ef:31:71:bd:83:5c:af` |
| Cert SHA-1 | `F3:E8:C8:2D:46:73:CF:38:C7:26:1A:31:71:4B:E9:B7:BF:EC:78:88` |
| Cert SHA-256 | `3A:71:29:B7:3C:B3:05:C4:75:3F:C7:12:9D:71:B0:5E:2C:BA:D0:F9:08:CF:46:F0:5A:EF:31:71:BD:83:5C:AF` |
| Subject | `CN=d.o. Gist Hub, OU=Mobile, O=d-o-hub, L=Berlin, ST=Berlin, C=DE` |
| Algorithm | RSA 2048, SHA384withRSA |
| Validity | 9,125 days (~25 years) from 2026-06-02 |
| Encrypted backup | `keystore/backup/do-gist-hub.jks.age` (2784 bytes, AES-256-CBC + PBKDF2-SHA256) |
| Bundle password | stored in 1Password only (never in repo, never in chat) |

## What NOT to do

- ❌ Commit the keystore, the encrypted backup, or the password to git (even in a private repo)
- ❌ Store the password in a chat, email, ticket, or PR comment
- ❌ Store the encrypted backup in the same place as the password (defeats the purpose)
- ❌ Re-generate the keystore once an APK has been published (Play Store will reject updates signed by a different cert)
- ❌ Share the cert fingerprints publicly until after the first APK is published (allows targeted attacks on signing infrastructure)
- ❌ Set the keystore password to anything short or memorable — it should be a long random string; the keystore's value is in the file itself, not the password's memorability

## What TO do annually

1. Verify all three backup copies still decrypt successfully.
2. Verify the cert fingerprints are unchanged.
3. Update this document with the current keystore metadata.
4. Confirm the bundle password is still accessible in the password manager.
5. (Optional) If a safer password manager / cloud storage has become available, migrate the bundle to it.

## See also

- `adr-029-android-release-signing.md` — why CI signs release APKs
- `docs/CAPACITOR_ANDROID.md` § "Generate a keystore" — the keystore generation procedure
- `scripts/generate-keystore.sh` — helper that outputs the keystore to `/tmp` (not the repo)
- `.gitignore` — `keystore/`, `*.jks`, `*.keystore`, `*.b64` all excluded
