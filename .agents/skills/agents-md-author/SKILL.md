---
name: agents-md-author
description: Create, update, and maintain AGENTS.md files following the agents.md specification and template conventions.
---

# Agents-md-author Skill

Create and maintain AGENTS.md files as the single source of truth for AI coding agents.

## When to Use

- Initializing repository from template
- Updating agent instructions
- Adding project-specific conventions
- Normalizing agent workflow documentation

## Workflow

### Step 1: Analyze Current State

Review existing AGENTS.md and identify gaps:
```bash
# Check current structure
ls -la .agents/skills/
ls -la plans/
wc -l AGENTS.md
```

### Step 2: Reference Template

Use `github-template-ai-agents` as reference:
- https://github.com/d-o-hub/github-template-ai-agents
- https://agents.md/
- https://agentskills.io/specification

### Step 3: Create or Update AGENTS.md

Include these sections:
1. **Header**: Project description and tech stack
2. **Constants**: Named limits and configurations
3. **Mission**: What the project builds
4. **Source-of-Truth Rules**: File precedence
5. **Setup Commands**: How to get started
6. **Quality Gate**: Pre-commit requirements
7. **Code Style**: Naming, formatting, limits
8. **Repository Structure**: Directory purposes
9. **Domain Rules**: Token, responsive, error, security rules
10. **Scope Rules**: v1 vs v2 boundaries
11. **Agent Guidance**: Workflow conventions
12. **Available Skills**: Skill list and descriptions

### Step 4: Validate

```bash
# Check line count (target: < 150, may exceed for completeness)
wc -l AGENTS.md

# Verify skills directory
ls .agents/skills/
```

## AGENTS.md Structure Rules

1. **Start with header**: `# AGENTS.md` with description
2. **Define constants**: Use `readonly` bash syntax for limits
3. **Be specific**: Include actual commands, not placeholders
4. **Domain rules**: Capture project-specific conventions
5. **Reference docs**: Link to official documentation
6. **Keep current**: Update as project evolves

## Gotchas

- **No Placeholders**: Avoid TODO markers in AGENTS.md
- **Concise**: Target 150 lines, exceed only for necessary domain rules
- **Single Source**: No conflicting instructions across files
- **Markdown Format**: Valid markdown, no broken links
- **Skill Sync**: Run `./scripts/setup-skills.sh` after creating new skills

## Required Outputs

- Updated `AGENTS.md` at repository root
- Consistent with `.agents/skills/` directory
- Aligned with project's actual stack and conventions

## Verification

```bash
# Validate format
markdownlint AGENTS.md

# Check skill references match actual skills
ls .agents/skills/ | sort
```

## References

- https://github.com/d-o-hub/github-template-ai-agents - Template repository
- https://agents.md/ - Agent skills specification
- https://agentskills.io/specification - Skills specification
- `AGENTS.md` - Current file being maintained
