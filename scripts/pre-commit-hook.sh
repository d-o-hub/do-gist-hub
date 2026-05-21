#!/bin/bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"

# Guard Rails: Prevent global hooks from overriding local
GLOBAL_HOOKS_PATH=$(git config --global core.hooksPath 2>/dev/null || echo "")
if [[ -n "$GLOBAL_HOOKS_PATH" && -z "${SKIP_GLOBAL_HOOKS_CHECK:-}" ]]; then
  echo "⚠️  Global hooks detected at: $GLOBAL_HOOKS_PATH"
  echo "Run 'git config --global --unset core.hooksPath' or use SKIP_GLOBAL_HOOKS_CHECK=true"
  exit 1
fi

# Warn if commit-msg hook is not installed (prevents late CI failures)
if [[ ! -f "$REPO_ROOT/.git/hooks/commit-msg" ]]; then
  echo "⚠️  commit-msg hook not installed. Run: cp scripts/commit-msg-hook.sh .git/hooks/commit-msg && chmod +x .git/hooks/commit-msg"
fi

# Run lint-staged on staged files only
if command -v npx >/dev/null 2>&1; then
  npx lint-staged
fi

# Run quality gate
if [[ -n "$REPO_ROOT" && -f "$REPO_ROOT/scripts/quality_gate.sh" ]]; then
  "$REPO_ROOT/scripts/quality_gate.sh"
fi
