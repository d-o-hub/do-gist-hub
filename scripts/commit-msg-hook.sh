#!/bin/bash
set -euo pipefail

# Validate commit message format with commitlint
if command -v npx >/dev/null 2>&1; then
  npx commitlint --edit "$1"
fi
