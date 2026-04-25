#!/bin/bash
set -euo pipefail

# Guard Rails: Prevent global hooks from overriding local
GLOBAL_HOOKS_PATH=$(git config --global core.hooksPath 2>/dev/null || echo "")
if [[ -n "$GLOBAL_HOOKS_PATH" && -z "${SKIP_GLOBAL_HOOKS_CHECK:-}" ]]; then
  echo "⚠️  Global hooks detected at: $GLOBAL_HOOKS_PATH"
  echo "Run 'git config --global --unset core.hooksPath' or use SKIP_GLOBAL_HOOKS_CHECK=true"
  exit 1
fi

# Run lint-staged on staged files only
if command -v npx >/dev/null 2>&1; then
  npx lint-staged
fi

# Run quality gate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/quality_gate.sh"
