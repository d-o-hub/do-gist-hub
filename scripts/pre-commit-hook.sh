#!/bin/bash
set -euo pipefail

# Guard Rails: Prevent global hooks from overriding local
GLOBAL_HOOKS_PATH=$(git config --global core.hooksPath 2>/dev/null || echo "")
if [[ -n "$GLOBAL_HOOKS_PATH" && -z "${SKIP_GLOBAL_HOOKS_CHECK:-}" ]]; then
  echo "⚠️  Global hooks detected at: $GLOBAL_HOOKS_PATH"
  echo "Run 'git config --global --unset core.hooksPath' or use SKIP_GLOBAL_HOOKS_CHECK=true"
  exit 1
fi

# Run quality gate
ROOT_DIR="$(git rev-parse --show-toplevel)"
"$ROOT_DIR/scripts/quality_gate.sh"
