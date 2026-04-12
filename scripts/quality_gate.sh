#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Running quality gates..."

# Type check
if command -v npm &> /dev/null && [[ -f "$ROOT_DIR/package.json" ]]; then
  cd "$ROOT_DIR"
  npm run typecheck || { echo "✗ Type check failed"; exit 1; }
  echo "✓ Type check passed"

  npm run lint || { echo "✗ Lint failed"; exit 1; }
  echo "✓ Lint passed"
fi

# Validate skills
"$SCRIPT_DIR/validate-skills.sh" || { echo "✗ Skill validation failed"; exit 1; }
echo "✓ Skill validation passed"

echo "✓ All quality gates passed"
