#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Running quality gates..."

# Ensure we are in the root directory
cd "$ROOT_DIR"

if [[ ! -f "package.json" ]]; then
  echo "✗ Error: package.json not found in $ROOT_DIR"
  exit 1
fi

# Type check
echo "→ Type checking..."
pnpm run typecheck || { echo "✗ Type check failed"; exit 1; }
echo "✓ Type check passed"

# Linting
echo "→ Linting..."
pnpm run lint || { echo "✗ Lint failed"; exit 1; }
echo "✓ Lint passed"

# Format checking
echo "→ Format checking..."
pnpm run format:check || { echo "✗ Format check failed (run 'pnpm run format' to fix)"; exit 1; }
echo "✓ Format check passed"

# Validate skills
if [[ -f "$SCRIPT_DIR/validate-skills.sh" ]]; then
  "$SCRIPT_DIR/validate-skills.sh" || { echo "✗ Skill validation failed"; exit 1; }
  echo "✓ Skill validation passed"
else
  echo "⚠️  Warning: $SCRIPT_DIR/validate-skills.sh not found, skipping skill validation"
fi

echo ""
echo "✓ All quality gates passed"
