---
name: repo-bootstrap
description: Initialize repository structure from github-template-ai-agents. Creates baseline docs, config, and normalizes repo conventions for AI agent workflow.
---

# Repo Bootstrap Skill

Initialize repository structure following `github-template-ai-agents` patterns.

## When to Use

- New project setup from template
- Adding missing baseline infrastructure
- Normalizing repo conventions
- Creating skill symlinks

## Workflow

### Step 1: Create Directory Structure

```bash
# Core directories
mkdir -p .agents/skills
mkdir -p plans
mkdir -p agents-docs
mkdir -p scripts
mkdir -p src/{lib,components,routes,services,stores,styles,tokens}
mkdir -p docs/{design,api,testing}
mkdir -p tests/{browser,mobile,offline,android}
```

### Step 2: Copy Template Assets

From `github-template-ai-agents`:
- `scripts/setup-skills.sh` - Create skill symlinks
- `scripts/pre-commit-hook.sh` - Git pre-commit validation
- `scripts/quality_gate.sh` - Pre-commit quality checks
- `scripts/validate-skills.sh` - Validate skill structure

### Step 3: Create Baseline Config Files

```json
// package.json base
{
  "name": "gist-app",
  "version": "0.1.0",
  "private": true,
  "type": "module"
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@tokens/*": ["src/tokens/*"],
      "@components/*": ["src/components/*"],
      "@services/*": ["src/services/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "android", "ios"]
}
```

### Step 4: Create Setup Scripts

```bash
#!/bin/bash
# scripts/setup-skills.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
SKILLS_DIR="$ROOT_DIR/.agents/skills"

# Agent directories to create symlinks in
AGENT_DIRS=(".claude" ".gemini" ".qwen" ".cursor")

for agent_dir in "${AGENT_DIRS[@]}"; do
  target="$ROOT_DIR/$agent_dir/skills"
  if [[ ! -d "$target" ]]; then
    mkdir -p "$(dirname "$target")"
    ln -sf "../../.agents/skills" "$target"
    echo "Created symlink: $target -> ../../.agents/skills"
  fi
done

echo "✓ Skill symlinks created"
```

### Step 5: Create Pre-commit Hook

```bash
#!/bin/bash
# scripts/pre-commit-hook.sh
set -euo pipefail

# Guard Rails: Prevent global hooks from overriding local
GLOBAL_HOOKS_PATH=$(git config --global core.hooksPath 2>/dev/null || echo "")
if [[ -n "$GLOBAL_HOOKS_PATH" && -z "${SKIP_GLOBAL_HOOKS_CHECK:-}" ]]; then
  echo "⚠️  Global hooks detected at: $GLOBAL_HOOKS_PATH"
  echo "Run 'git config --global --unset core.hooksPath' or use SKIP_GLOBAL_HOOKS_CHECK=true"
  exit 1
fi

# Run quality gate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/quality_gate.sh"
```

### Step 6: Create Quality Gate Script

```bash
#!/bin/bash
# scripts/quality_gate.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Running quality gates..."

# Type check
if command -v pnpm &> /dev/null; then
  pnpm run typecheck || { echo "✗ Type check failed"; exit 1; }
  echo "✓ Type check passed"
fi

# Lint
if command -v pnpm &> /dev/null; then
  pnpm run lint || { echo "✗ Lint failed"; exit 1; }
  echo "✓ Lint passed"
fi

# Validate skills
"$SCRIPT_DIR/validate-skills.sh" || { echo "✗ Skill validation failed"; exit 1; }
echo "✓ Skill validation passed"

echo "✓ All quality gates passed"
```

### Step 7: Create Skill Validation Script

```bash
#!/bin/bash
# scripts/validate-skills.sh
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
```

## Gotchas

- Symlinks must be relative, not absolute
- Pre-commit hook must be executable: `chmod +x`
- Quality gate should fail fast on first error
- Skill frontmatter must start with `---` on line 1

## Required Outputs

- Directory structure created
- Setup scripts functional
- Skill symlinks working
- Quality gate executable
- Pre-commit hook installed

## Verification

```bash
# Verify symlinks
ls -la .claude/skills
ls -la .gemini/skills

# Validate skills
./scripts/validate-skills.sh

# Test quality gate
./scripts/quality_gate.sh
```

## References

- `github-template-ai-agents` - Source template structure
- `AGENTS.md` - Repository conventions
- `agents-docs/WORKFLOW.md` - Agent workflow patterns
