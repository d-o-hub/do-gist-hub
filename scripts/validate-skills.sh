#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$ROOT_DIR/.agents/skills"

# Source validation library
source "$SCRIPT_DIR/lib/skill-validation.sh"

# Reset counters in case library was already sourced
sv::reset_counters

REPO_VERSION="$(sv::get_repo_version "$ROOT_DIR")"

sv::info "Validating skills against repo version: ${REPO_VERSION:-<unknown>}"
echo ""

# Check each skill directory
for skill_dir in "$SKILLS_DIR"/*/; do
  # Skip if not a directory
  [[ -d "$skill_dir" ]] || continue

  skill_name="$(basename "$skill_dir")"
  skill_md="$skill_dir/SKILL.md"

  sv::validate_skill_md "$skill_md" "$skill_name" "$REPO_VERSION"
done

# Also validate AGENTS.md
sv::validate_agents_md "$ROOT_DIR/AGENTS.md"

# Summary and exit
sv::print_summary
