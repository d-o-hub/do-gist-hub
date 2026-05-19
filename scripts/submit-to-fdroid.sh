#!/usr/bin/env bash
# scripts/submit-to-fdroid.sh
#
# Automates the F-Droid submission process for d.o. Gist Hub.
# Guides the user through forking fdroiddata, creating metadata,
# and opening a Merge Request.
#
# Prerequisites:
#   - git, curl, jq (optional, for config validation)
#   - A GitLab account with SSH key configured
#   - JDK 11+ (optional, for local build verification)
#
# Usage:
#   chmod +x scripts/submit-to-fdroid.sh
#   ./scripts/submit-to-fdroid.sh
#
# Output:
#   - Prints step-by-step instructions
#   - Creates a fdroiddata fork clone in ../fdroiddata/
#   - Generates the metadata file at metadata/com.dogisthub.app.yml
#
# Docs: docs/FDROID_SUBMISSION_CHECKLIST.md
#       docs/FDROID_DEPLOYMENT.md

set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="${DIR}/VERSION"
FDROID_META="${DIR}/.fdroid.yml"
CHECKLIST="${DIR}/docs/FDROID_SUBMISSION_CHECKLIST.md"

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }

# ── Header ──────────────────────────────────────────────────────
echo "=============================================="
echo "  d.o. Gist Hub — F-Droid Submission Helper"
echo "=============================================="
echo ""

# ── Step 0: Check prerequisites ─────────────────────────────────
info "Step 0/6: Checking prerequisites..."

if [ ! -f "${VERSION_FILE}" ]; then
  fail "VERSION file not found at ${VERSION_FILE}"
  exit 1
fi
VERSION="$(cat "${VERSION_FILE}" | tr -d '[:space:]')"
ok "VERSION file found: ${VERSION}"

if [ ! -f "${FDROID_META}" ]; then
  fail ".fdroid.yml not found at ${FDROID_META}"
  exit 1
fi
ok ".fdroid.yml metadata file found"

if ! git -C "${DIR}" rev-parse --git-dir >/dev/null 2>&1; then
  fail "Not a git repository"
  exit 1
fi

TAG="v${VERSION}"
if git -C "${DIR}" rev-parse "${TAG}" >/dev/null 2>&1; then
  ok "Tag ${TAG} exists locally"
else
  warn "Tag ${TAG} not found locally"
  echo "  Create it with: git tag ${TAG} && git push origin ${TAG}"
  read -r -p "  Continue without tag? (y/N): " CONTINUE
  if [ "${CONTINUE}" != "y" ]; then
    echo "  Aborted. Create the tag and re-run."
    exit 0
  fi
fi

# ── Step 0a: Quality gate check ─────────────────────────────────
info "Step 0a: Running quality gate..."
if [ -f "${DIR}/scripts/quality_gate.sh" ]; then
  if bash "${DIR}/scripts/quality_gate.sh" >/dev/null 2>&1; then
    ok "Quality gate passed"
  else
    warn "Quality gate failed — submission may be rejected"
    read -r -p "  Continue anyway? (y/N): " CONTINUE
    if [ "${CONTINUE}" != "y" ]; then
      echo "  Aborted. Fix quality gate issues and re-run."
      exit 0
    fi
  fi
else
  warn "quality_gate.sh not found — skipping"
fi

# ── Step 1: Fork fdroiddata ─────────────────────────────────────
echo ""
info "Step 1/6: Fork fdroiddata on GitLab"
echo ""
echo "  1. Go to:  https://gitlab.com/fdroid/fdroiddata"
echo "  2. Click the Fork button (top-right)"
echo "  3. Choose your GitLab namespace"
echo ""
read -r -p "  Press Enter after you have forked the repository..."

# ── Step 1a: Clone fork ─────────────────────────────────────────
FDROID_DIR="${DIR}/../fdroiddata"
if [ -d "${FDROID_DIR}" ]; then
  info "fdroiddata already cloned at ${FDROID_DIR}"
  read -r -p "  Update it? (Y/n): " UPDATE
  if [ "${UPDATE}" != "n" ]; then
    git -C "${FDROID_DIR}" pull --rebase 2>/dev/null || true
  fi
else
  read -r -p "  Enter your GitLab username: " GITLAB_USER
  if [ -z "${GITLAB_USER}" ]; then
    fail "GitLab username required"
    exit 1
  fi
  info "Cloning fdroiddata from your fork..."
  git clone "https://gitlab.com/${GITLAB_USER}/fdroiddata.git" "${FDROID_DIR}"
  ok "Cloned to ${FDROID_DIR}"
fi

# ── Step 2: Create metadata file ────────────────────────────────
echo ""
info "Step 2/6: Creating metadata file..."

META_DIR="${FDROID_DIR}/metadata"
mkdir -p "${META_DIR}"
cp "${FDROID_META}" "${META_DIR}/com.dogisthub.app.yml"
ok "Metadata file created at: metadata/com.dogisthub.app.yml"

# ── Step 3: Validate metadata (optional) ─────────────────────────
echo ""
info "Step 3/6: Validating metadata (optional)..."
if command -v fdroid &>/dev/null; then
  if fdroid lint "${META_DIR}/com.dogisthub.app.yml"; then
    ok "Metadata lint passed"
  else
    warn "Metadata lint had issues — review before submitting"
  fi
else
  info "fdroidserver not installed — skipping validation"
  echo "  Install: pip install fdroidserver"
  echo "  Then run: fdroid lint ${META_DIR}/com.dogisthub.app.yml"
fi

# ── Step 4: Commit and push ─────────────────────────────────────
echo ""
info "Step 4/6: Committing and pushing..."
(
  cd "${FDROID_DIR}"
  git add metadata/com.dogisthub.app.yml

  if git diff --cached --quiet; then
    info "No changes to commit (already up-to-date)"
  else
    git commit -m "Add d.o. Gist Hub (com.dogisthub.app)"
    git push origin main 2>&1 || {
      warn "Push failed — you may need to set upstream or use SSH"
      echo "  Try: git remote set-url origin git@gitlab.com:${GITLAB_USER}/fdroiddata.git"
      echo "  Then: git push origin main"
    }
    ok "Committed and pushed"
  fi
)

# ── Step 5: Create Merge Request ────────────────────────────────
echo ""
info "Step 5/6: Creating Merge Request..."
echo ""
echo "  1. Go to:  https://gitlab.com/${GITLAB_USER:-<your-username>}/fdroiddata"
echo "  2. Click 'Create Merge Request'"
echo "  3. Target: fdroid/fdroiddata (main)"
echo "  4. Title: 'Add d.o. Gist Hub (com.dogisthub.app)'"
echo "  5. In the description, include:"
echo ""
cat <<-MREOS
	- Built with Capacitor (needs Node.js + pnpm on build server)
	- NonFreeNet pre-flagged for GitHub API dependency
	- Build variant: assembleFdroid (unsigned release with ProGuard)
	- Version: ${VERSION}
	MREOS
echo ""

# ── Step 6: Next steps ──────────────────────────────────────────
echo ""
echo "=============================================="
echo "  NEXT STEPS"
echo "=============================================="
echo ""
echo "  ✅ Metadata file created"
echo "  ✅ Fork cloned and pushed"
echo ""
echo "  1. Create the Merge Request on GitLab"
echo "  2. F-Droid maintainers will review (24-48h)"
echo "  3. Monitor build: https://monitor.f-droid.org/"
echo ""
echo "  Detailed checklist: ${CHECKLIST}"
echo "  Deployment guide:  docs/FDROID_DEPLOYMENT.md"
echo "=============================================="

# ── Post-submission reminder ────────────────────────────────────
echo ""
echo "  After the MR is merged, remember to:"
echo "  - Add F-Droid badge to README.md"
echo "  - Update plans/047-v0.3.0-scope.md — mark Goal 1 complete"
echo "=============================================="
