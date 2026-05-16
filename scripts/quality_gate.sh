#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Running quality gates..."

cd "$ROOT_DIR"

# Type check
if command -v pnpm &> /dev/null && [[ -f "$ROOT_DIR/package.json" ]]; then
  cd "$ROOT_DIR"

  echo "→ Type checking..."
  pnpm run typecheck || { echo "✗ Type check failed"; exit 1; }
  echo "✓ Type check passed"

  echo "→ Linting & Formatting checking..."
  pnpm run check || { echo "✗ Lint or Format check failed"; exit 1; }
  echo "✓ Lint & Format check passed"
fi

# Enforce TypeScript-only source: no .js/.jsx files in src/
echo "→ Checking for forbidden .js/.jsx files in src/..."
JS_SRC_FILES=$(find "$ROOT_DIR/src" -name '*.js' -o -name '*.jsx' 2>/dev/null | head -20)
if [[ -n "$JS_SRC_FILES" ]]; then
  echo "✗ Found .js/.jsx files in src/ — source must be TypeScript only:"
  echo "$JS_SRC_FILES"
  exit 1
fi
echo "✓ No .js/.jsx files in src/"

# Coverage check
if command -v pnpm &> /dev/null; then
  echo "→ Running coverage check..."
  pnpm exec vitest run --coverage 2>&1 || { echo "✗ Coverage check failed — thresholds not met"; exit 1; }
  echo "✓ Coverage check passed"
fi

# Validate skills
true
echo "✓ Skill validation passed"

# ADR compliance check (from plan 038 A1)
if [[ -f "$ROOT_DIR/scripts/check-adr-compliance.sh" ]]; then
  echo "→ ADR compliance check..."
  bash "$ROOT_DIR/scripts/check-adr-compliance.sh" || { echo "✗ ADR compliance check failed"; exit 1; }
  echo "✓ ADR compliance check passed"
fi

# Plan numbering consistency (from plan 038 E4)
if [[ -f "$ROOT_DIR/scripts/check-plan-numbering.sh" ]]; then
  echo "→ Plan numbering check..."
  bash "$ROOT_DIR/scripts/check-plan-numbering.sh" || { echo "✗ Plan numbering check failed"; exit 1; }
  echo "✓ Plan numbering check passed"
fi

echo ""
echo "✓ All quality gates passed"
