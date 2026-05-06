#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Running quality gates..."
FAILED=0

# Type check
if command -v npm &> /dev/null && [[ -f "$ROOT_DIR/package.json" ]]; then
  cd "$ROOT_DIR"

  echo "→ Type checking..."
  npm run typecheck || { echo "✗ Type check failed"; FAILED=1; }

  if [ $FAILED -eq 0 ]; then
    echo "✓ Type check passed"
  fi

  echo "→ Linting..."
  # skipcq: JS-0308 used in code but ESLint might still complain if not configured
  npm run lint || { echo "→ Lint failed, but continuing for local checks..."; FAILED=1; }

  echo "→ Format checking..."
  npm run format:check || { echo "✗ Format check failed (run 'npm run format' to fix)"; FAILED=1; }

  if [ $FAILED -eq 0 ]; then
    echo "✓ Format check passed"
  fi

  echo "→ Local DeepSource-style checks..."

  # 1. Check for 'any' usage in src/
  # Refined regex to handle varying whitespace
  VIOLATIONS=$(grep -rE "(:\s*any|as\s+any|<any>|\[any\])" src/ --include="*.ts" --include="*.tsx" | grep -v "skipcq" || true)

  if [ -n "$VIOLATIONS" ]; then
    echo "✗ 'any' type usage detected in src/. Use specific types or 'unknown' with type guards."
    echo "$VIOLATIONS"
    echo "→ Please add // skipcq: JS-0308 to suppress this if 'any' is absolutely necessary."
    FAILED=1
  fi

  # 2. Check for missing 'async' in page.evaluate in tests/
  TEST_VIOLATIONS=$(grep -rE "page\.evaluate\(\(\s*\)\s*=>" tests/ --include="*.ts" | grep -v "skipcq" || true)
  if [ -n "$TEST_VIOLATIONS" ]; then
    echo "✗ Missing 'async' in page.evaluate callback detected in tests/."
    echo "$TEST_VIOLATIONS"
    echo "→ Standardized: page.evaluate(async () => ...)"
    FAILED=1
  fi

  # 3. Check for duplicate test titles in test files (both .spec.ts and .test.ts)
  for file in $(find tests -name "*.spec.ts" -o -name "*.test.ts"); do
    FILE_DUPS=$(grep -E "test\(['\"]" "$file" | cut -d: -f2- | sort | uniq -d || true)
    if [ -n "$FILE_DUPS" ]; then
      echo "✗ Duplicate test titles detected in $file:"
      echo "$FILE_DUPS"
      FAILED=1
    fi
  done

  # 4. Actionlint (if available)
  if command -v actionlint &> /dev/null; then
    echo "→ Linting GitHub Actions..."
    actionlint .github/workflows/*.yml || { echo "✗ Actionlint failed"; FAILED=1; }
  elif [ -f "./actionlint" ]; then
    echo "→ Linting GitHub Actions (local)..."
    ./actionlint .github/workflows/*.yml || { echo "✗ Actionlint failed"; FAILED=1; }
  else
    echo "→ INFO: actionlint not found, skipping workflow linting."
  fi

  echo "✓ Local checks finished"
fi

# Validate skills
"$SCRIPT_DIR/validate-skills.sh" || { echo "✗ Skill validation failed"; FAILED=1; }

if [ $FAILED -ne 0 ]; then
  echo ""
  echo "✗ Quality gate failed. Please fix the issues above."
  exit 1
fi

echo ""
echo "✓ All quality gates passed"
