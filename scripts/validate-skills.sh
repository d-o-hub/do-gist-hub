#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$ROOT_DIR/.agents/skills"

errors=0

# Check each skill directory
for skill_dir in "$SKILLS_DIR"/*/; do
  skill_md="$skill_dir/SKILL.md"
  if [[ ! -f "$skill_md" ]]; then
    echo "✗ Missing SKILL.md in $skill_dir"
    ((errors++))
  else
    # Validate frontmatter
    first_line=$(head -n 1 "$skill_md")
    if [[ "$first_line" != "---" ]]; then
      echo "✗ Invalid frontmatter in $skill_md (must start with ---)"
      ((errors++))
    fi
  fi
done

if [[ $errors -gt 0 ]]; then
  echo "✗ $errors skill validation errors"
  exit 1
fi

echo "✓ All skills valid"
