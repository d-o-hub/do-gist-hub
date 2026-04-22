#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Running quality gates..."
pnpm run typecheck || false
pnpm run lint || false
pnpm run format:check || false
"$SCRIPT_DIR/validate-skills.sh" || false
if command -v agent-browser &> /dev/null; then
  "$SCRIPT_DIR/dogfood-agent-browser.sh" || false
fi
"$SCRIPT_DIR/benchmark.sh" || false
echo "✓ All quality gates passed"
