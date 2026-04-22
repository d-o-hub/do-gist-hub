#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$ROOT_DIR/.agents/skills"

# Agent directories to create symlinks in
AGENT_DIRS=(".claude" ".gemini" ".qwen" ".cursor")

for agent_dir in "${AGENT_DIRS[@]}"; do
  target="$ROOT_DIR/$agent_dir/skills"
  mkdir -p "$(dirname "$target")"
  # Use a relative path from the target to the .agents/skills directory
  ln -sf "../.agents/skills" "$target"
  echo "Created symlink: $target -> ../.agents/skills"
done

echo "✓ Skill symlinks created"
