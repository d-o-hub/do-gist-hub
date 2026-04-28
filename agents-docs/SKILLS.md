# Skills Authoring Guide

> How to create, validate, and maintain skills in the `.agents/skills/` directory.

## What Is a Skill?

A skill extends agent capabilities with specialized knowledge, workflows, and tools. Skills live in `.agents/skills/<skill-name>/` and are symlinked into agent-specific directories (`.claude/`, `.gemini/`, `.qwen/`) via `scripts/setup-skills.sh`.

## Creating a New Skill

### 1. Directory Scaffold

```bash
mkdir -p .agents/skills/<skill-name>/{evals,scripts,references,assets}
touch .agents/skills/<skill-name>/SKILL.md
```

### 2. SKILL.md Structure

```markdown
---
name: skill-name
description: Imperative description of what this skill does and when to use it. Max 1024 chars.
license: MIT
---

# Skill Name

Brief summary of purpose.

## When to Use

- Bullet list of trigger conditions
- Specific contexts where this skill applies

## Instructions

Step-by-step workflow.

## Examples

```
Example input/output or command sequence
```

## Quality Checklist

- [ ] Check 1
- [ ] Check 2

## Reference Files

- `references/guide.md` - Detailed guide
- `references/patterns.md` - Common patterns
```

### 3. Frontmatter Requirements

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars. Lowercase letters, numbers, hyphens only. |
| `description` | Yes | Max 1024 chars. Must describe what the skill does **AND** when to use it. |
| `version` | Recommended | Semantic version of the skill itself. |
| `template_version` | Recommended | Minimum template version required (matches `VERSION` file). |
| `license` | No | License name or reference to bundled license file. |
| `compatibility` | No | Max 500 chars. Environment requirements. |
| `metadata` | No | Arbitrary key-value mapping. |
| `allowed-tools` | No | Space-delimited list of pre-approved tools. |

**Description Writing Rules**:
- Use **imperative phrasing** — "Use this skill when..." rather than "This skill does..."
- Focus on **user intent**, not implementation
- Err on the side of being **pushy** — explicitly list applicable contexts
- Keep it **concise** — a few sentences, max 1024 characters

### 4. Progressive Disclosure Pattern

Keep `SKILL.md` under **250 lines**. Move detailed content to `references/`.

```
skill-name/
├── SKILL.md              # ≤ 250 lines. Workflow, checklist, references list.
├── evals/
│   └── evals.json        # Required. At least 3-5 realistic test cases.
├── references/
│   ├── guide.md          # Detailed step-by-step guide
│   ├── patterns.md       # Common patterns and anti-patterns
│   └── examples.md       # Extended examples
└── scripts/              # Optional executable helpers
```

**Rule**: `SKILL.md` should be scannable in under 2 minutes. Deep content belongs in `references/`.

## Symlink Architecture

After running `scripts/setup-skills.sh`:

```
.agents/skills/           ← Canonical source (read-write)
├── skill-a/
└── skill-b/

.claude/skills -> ../.agents/skills    ← Symlink (read-only reference)
.gemini/skills -> ../.agents/skills    ← Symlink
.qwen/skills   -> ../.agents/skills    ← Symlink
.cursor/skills -> ../.agents/skills    ← Symlink
```

**Agent-specific overrides**: If an agent needs a modified version, create `.claude/skills-local/skill-a/` (real directory, not symlink) with the override. The harness should check local first, then fallback to canonical.

## Skill Validation Rules

### Structural Validation (`scripts/validate-skills.sh`)

| Check | Requirement |
|-------|-------------|
| Frontmatter present | YAML block at top of `SKILL.md` |
| `name` valid | Lowercase, hyphens, numbers only; ≤ 64 chars |
| `description` present | Non-empty, ≤ 1024 chars |
| `evals/evals.json` exists | At least 3 test cases |
| Directory naming | Matches `name` in frontmatter |
| Line count | `SKILL.md` ≤ 250 lines (soft limit) |

### Content Quality Rules

1. **No evaluating-skills.md in references** — That file belongs only in `skill-evaluator`
2. **No self-promotion in description** — Focus on user task, not skill features
3. **Trigger clarity** — A user reading the description should know immediately whether to invoke this skill
4. **Cross-reference AGENTS.md** — Skills must not contradict `AGENTS.md` domain rules

### Running Validation

```bash
# Validate all skills
./scripts/validate-skills.sh

# Validate single skill
./scripts/validate-skills.sh .agents/skills/<skill-name>
```

## Skill Improvement Workflow

1. **Identify gap** — Agent misses a pattern or produces suboptimal output
2. **Update SKILL.md** — Add instruction, example, or checklist item
3. **Add eval case** — Document in `evals/evals.json` with expected output
4. **Run eval** — `skill-evaluator` against the updated skill
5. **Iterate** — Benchmark with variance analysis (3+ runs)
6. **Commit** — `./scripts/quality_gate.sh` → conventional commit (`docs:`, `feat:`, or `refactor:`)

## References

- `.agents/skills/skill-creator/SKILL.md` — Complete skill creation spec
- `.agents/skills/skill-evaluator/SKILL.md` — Evaluating and benchmarking skills
- `AGENTS.md` — Domain rules that all skills must respect
- `agents-docs/AVAILABLE_SKILLS.md` — Auto-generated skill catalog
