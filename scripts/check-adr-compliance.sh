#!/usr/bin/env bash
# ============================================================================
# check-adr-compliance.sh — Automated ADR Compliance Check
# ============================================================================
#
# Verifies that all ADR files in plans/ are:
# 1. Present on disk
# 2. Registered in plans/_status.json
# 3. Have compliance notes matching codebase patterns (basic checks)
#
# Usage:
#   ./scripts/check-adr-compliance.sh
#   ./scripts/check-adr-compliance.sh --verbose   # Show all checks
#   ./scripts/check-adr-compliance.sh --json      # Output as JSON
#
# Exit codes:
#   0 — All checks pass
#   1 — ADR compliance issues found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERBOSE=false
JSON_OUTPUT=false
EXIT_CODE=0

# Parse arguments
for arg in "$@"; do
  case "$arg" in
    --verbose) VERBOSE=true ;;
    --json) JSON_OUTPUT=true ;;
  esac
done

# --- Helper Functions ---

log() {
  if $JSON_OUTPUT; then return; fi
  echo "$@"
}

log_ok() {
  if $JSON_OUTPUT; then return; fi
  echo "  $1"
}

log_warn() {
  if $JSON_OUTPUT; then return; fi
  echo "  $1"
}

log_fail() {
  if $JSON_OUTPUT; then return; fi
  echo "  $1"
  EXIT_CODE=1
}

# --- Phase 1: Check ADR files exist on disk ---

log ""
log "=== Phase 1: ADR File Inventory ==="

declare -a ADR_FILES=()
while IFS= read -r -d '' file; do
  ADR_FILES+=("$(basename "$file")")
done < <(find "$SCRIPT_DIR/plans" -maxdepth 1 -name 'adr-*.md' -print0 | sort -z)

log "Found ${#ADR_FILES[@]} ADR files:"
for f in "${ADR_FILES[@]}"; do
  log_ok "$f"
done

# --- Phase 2: Check registration in _status.json ---

log ""
log "=== Phase 2: _status.json Registration ==="

STATUS_FILE="$SCRIPT_DIR/plans/_status.json"

if [[ ! -f "$STATUS_FILE" ]]; then
  log_fail "plans/_status.json not found!"
  exit 1
fi

UNREGISTERED=0
for f in "${ADR_FILES[@]}"; do
  if grep -q "\"$f\"" "$STATUS_FILE"; then
    $VERBOSE && log_ok "$f registered in _status.json"
  else
    log_fail "$f NOT registered in _status.json"
    UNREGISTERED=$((UNREGISTERED + 1))
  fi
done

if [[ $UNREGISTERED -eq 0 ]]; then
  log_ok "All ${#ADR_FILES[@]} ADR files registered in _status.json"
fi

# --- Phase 3: Check for orphan ADR entries in _status.json ---

log ""
log "=== Phase 3: _status.json Orphan Check ==="

ORPHANS=0
while IFS= read -r key; do
  key=$(echo "$key" | sed 's/^[[:space:]]*"//;s/"$//')
  if [[ "$key" == adr-* ]]; then
    found=false
    for f in "${ADR_FILES[@]}"; do
      if [[ "$f" == "$key" ]]; then
        found=true
        break
      fi
    done
    if ! $found; then
      log_fail "ADR entry '$key' in _status.json but file not found on disk"
      ORPHANS=$((ORPHANS + 1))
    fi
  fi
done < <(grep -o '"adr-[^"]*\.md"' "$STATUS_FILE")

if [[ $ORPHANS -eq 0 ]]; then
  log_ok "No orphan ADR entries in _status.json"
fi

# --- Phase 4: Basic codebase pattern checks ---

log ""
log "=== Phase 4: Basic Pattern Compliance ==="

# ADR-001: Design tokens
if grep -rq -- '--color-' "$SCRIPT_DIR/src/styles/" 2>/dev/null; then
  log_ok "ADR-001: Design tokens present in styles"
else
  log_fail "ADR-001: No design tokens found in styles"
fi

# ADR-003: IndexedDB
if grep -rq 'openDB' "$SCRIPT_DIR/src/services/db.ts" 2>/dev/null; then
  log_ok "ADR-003: IndexedDB (openDB) in db.ts"
else
  log_fail "ADR-003: IndexedDB not found in db.ts"
fi

# ADR-005: No backend server
if [[ -d "$SCRIPT_DIR/server" ]] || [[ -d "$SCRIPT_DIR/backend" ]]; then
  log_fail "ADR-005: Backend server directory found (violates no-backend)"
else
  log_ok "ADR-005: No server directory - clean"
fi

# ADR-009: AbortController
if grep -rq 'new AbortController' "$SCRIPT_DIR/src/" --include='*.ts' 2>/dev/null; then
  log_ok "ADR-009: AbortController usage found in src/"
else
  log_fail "ADR-009: No AbortController usage found in src/"
fi

# ADR-011: Vitest
if [[ -f "$SCRIPT_DIR/vitest.config.ts" ]]; then
  log_ok "ADR-011: vitest.config.ts exists"
else
  log_fail "ADR-011: vitest.config.ts not found"
fi

# ADR-013: Request deduplication
if grep -rq 'inFlightRequests' "$SCRIPT_DIR/src/" --include='*.ts' 2>/dev/null; then
  log_ok "ADR-013: Request deduplication (inFlightRequests) found"
else
  log_fail "ADR-013: No request deduplication found"
fi

# ADR-014: Exponential backoff
if grep -rq 'calculateBackoff\|RETRY_BACKOFF' "$SCRIPT_DIR/src/" --include='*.ts' 2>/dev/null; then
  log_ok "ADR-014: Exponential backoff found in sync queue"
else
  log_fail "ADR-014: No exponential backoff found"
fi

# ADR-016: ETags
if grep -rq 'If-None-Match\|ETag' "$SCRIPT_DIR/src/" --include='*.ts' 2>/dev/null; then
  log_ok "ADR-016: ETag caching found"
else
  log_fail "ADR-016: No ETag caching found"
fi

# --- Summary ---

log ""
log "=== Summary ==="
if [[ $EXIT_CODE -eq 0 ]]; then
  log "All ADR compliance checks passed."
else
  log "ADR compliance issues found. Review the items above."
fi

if $JSON_OUTPUT; then
  cat <<EOF
{
  "adrFiles": ${#ADR_FILES[@]},
  "unregistered": $UNREGISTERED,
  "orphanEntries": $ORPHANS,
  "exitCode": $EXIT_CODE,
  "pass": $([ $EXIT_CODE -eq 0 ] && echo true || echo false)
}
EOF
fi

exit $EXIT_CODE
