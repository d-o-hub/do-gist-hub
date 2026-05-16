#!/usr/bin/env bash
# ============================================================================
# check-bundle-size.sh — Bundle Size Budget Enforcement (ADR-008)
# ============================================================================
#
# Builds the app and checks that the main entry JS bundle stays within budget.
# Intended for CI use after a production build.
#
# Usage:
#   ./scripts/check-bundle-size.sh          # Build + check budget
#   ./scripts/check-bundle-size.sh --skip-build  # Check existing dist/ only
#
# Exit codes:
#   0 — All bundles within budget
#   1 — Bundle exceeds budget or missing
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUDGET_GZIP_KB=200  # ADR-008 default: main entry gzip < 200KB
BUDGET_RAW_KB=600   # raw (uncompressed) upper bound

# Parse args
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
  esac
done

if ! $SKIP_BUILD; then
  echo "→ Building application..."
  pnpm run build 2>&1 || { echo "✗ Build failed"; exit 1; }
fi

DIST_DIR="$SCRIPT_DIR/dist"
if [[ ! -d "$DIST_DIR" ]]; then
  echo "✗ dist/ directory not found. Run 'pnpm run build' first."
  exit 1
fi

echo "→ Checking bundle sizes in dist/..."

EXIT_CODE=0

# Find main entry JS files (the largest non-vendor chunk)
while IFS= read -r file; do
  filename=$(basename "$file")
  size_bytes=$(stat -c%s "$file")
  size_kb=$((size_bytes / 1024))

  # Check gzip size if gzip is available
  if command -v gzip &> /dev/null; then
    gzip_size_bytes=$(gzip -c "$file" | wc -c)
    gzip_size_kb=$((gzip_size_bytes / 1024))
  else
    gzip_size_kb=$size_kb
  fi

  if [[ $size_kb -gt $BUDGET_RAW_KB ]]; then
    echo "  ✗ $filename: ${size_kb}KB raw exceeds budget (${BUDGET_RAW_KB}KB)"
    EXIT_CODE=1
  else
    echo "  ✓ $filename: ${size_kb}KB raw (budget: ${BUDGET_RAW_KB}KB)"
  fi

  if [[ $gzip_size_kb -gt $BUDGET_GZIP_KB ]]; then
    echo "  ✗ $filename: ${gzip_size_kb}KB gzip exceeds budget (${BUDGET_GZIP_KB}KB)"
    EXIT_CODE=1
  else
    echo "    gzip: ${gzip_size_kb}KB (budget: ${BUDGET_GZIP_KB}KB)"
  fi
done < <(find "$DIST_DIR" -name 'assets' -type d -exec find {} -name '*.js' \; 2>/dev/null | sort)

if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✓ All bundles within budget"
else
  echo "✗ Bundle budget exceeded"
fi

exit $EXIT_CODE
