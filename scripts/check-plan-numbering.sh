#!/usr/bin/env bash
# ============================================================================
# check-plan-numbering.sh — Verifies plan/ADR numbering consistency.
# ============================================================================
#
# Checks that plans/README.md counters match plans/_status.json.
#
# Usage:
#   ./scripts/check-plan-numbering.sh
#
# Exit codes:
#   0 — Counters match
#   1 — Mismatch found
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXIT_CODE=0

STATUS_FILE="$SCRIPT_DIR/plans/_status.json"
README_FILE="$SCRIPT_DIR/plans/README.md"

# Get next plan number from _status.json
NEXT_PLAN=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); print(d['nextAvailable']['plan'])")

# Get next ADR from _status.json
NEXT_ADR=$(python3 -c "import json; d=json.load(open('$STATUS_FILE')); print(d['nextAvailable']['adr'])")

echo "→ Checking plan numbering..."
echo "  _status.json: next plan=$NEXT_PLAN, next ADR=$NEXT_ADR"

# Check README (format: `**Next available plan number**: `040``)
README_NEXT_PLAN=$(grep -oP 'Next available plan number.*?`\K\d+' "$README_FILE" || echo "")
README_NEXT_ADR=$(grep -oP 'Next available ADR number.*?`\Kadr-\d+' "$README_FILE" || echo "")

echo "  README.md:    next plan=$README_NEXT_PLAN, next ADR=$README_NEXT_ADR"

if [[ "$NEXT_PLAN" != "$README_NEXT_PLAN" ]]; then
  echo "  ✗ Plan number mismatch: _status.json says $NEXT_PLAN, README says $README_NEXT_PLAN"
  EXIT_CODE=1
fi

if [[ "$NEXT_ADR" != "$README_NEXT_ADR" ]]; then
  echo "  ✗ ADR number mismatch: _status.json says $NEXT_ADR, README says $README_NEXT_ADR"
  EXIT_CODE=1
fi

if [[ $EXIT_CODE -eq 0 ]]; then
  echo "  ✓ Plan numbering consistent"
fi

exit $EXIT_CODE
