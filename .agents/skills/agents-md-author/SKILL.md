---
name: agents-md-author
description: Create, update, and maintain AGENTS.md files following the agents.md specification and template conventions.
version: "0.1.0"
template_version: "0.1.0"
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
ls -la .agents/skills/ && ls -la plans/ && wc -l AGENTS.md
```

### Step 2: Reference Templates

1. **Local reference files** in `agents-docs/`:
   - `agents-docs/structure-reference.md` - Required sections
   - `agents-docs/formatting-rules.md` - Conventions and syntax

2. **External templates**:
   - https://github.com/d-o-hub/github-template-ai-agents
   - https://agents.md/
   - https://agentskills.io/specification

### Step 3: Create or Update AGENTS.md

Include these sections in order:

1. **Header**: Project description and tech stack
2. **App Identity**: Source-of-truth for app constants
3. **Constants**: Named limits and configurations
4. **Mission**: What the project builds
5. **Source-of-Truth Rules**: File precedence
6. **Setup and Quality Gate**: Commands and scripts
7. **Code Style Rules**: Naming, formatting, limits
8. **Repository Structure**: Directory purposes
9. **Domain Rules**: Token, responsive, error, security, memory, performance, offline, API
10. **Scope Rules**: v1 vs v2 boundaries
11. **Agent Guidance**: TRIZ-first workflow, atomic commits
12. **Plans/ADR Workflow**: TRIZ analysis → TRIZ solver → ADR
13. **Validation-Before-Commit**: Quality gate steps
14. **Available Skills**: Skill list with descriptions

### Step 4: Validate

```bash
wc -l AGENTS.md && ls .agents/skills/
```

## AGENTS.md Structure Rules

1. **Header first**: `# AGENTS.md` with description in blockquote
2. **Constants**: Use `readonly` bash syntax for named limits
3. **Specific commands**: Real commands, no placeholders
4. **Domain rules**: Capture project-specific conventions concisely
5. **TRIZ-first**: Emphasize `triz-analysis` and `triz-solver` over planning
6. **Reference docs**: Link to official documentation only

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
markdownlint AGENTS.md && ls .agents/skills/ | sort
```

## References

- https://github.com/d-o-hub/github-template-ai-agents
- https://agents.md/
- https://agentskills.io/specification
