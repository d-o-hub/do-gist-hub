---
name: plan-adr-goap
description: Generate structured implementation plans and Architecture Decision Records (ADRs) using Goal-Oriented Action Planning.
---

# Plan-adr-goap Skill

Create implementation plans and ADRs following GOAP methodology.

## When to Use

- Before implementing features
- When architectural decisions needed
- For complex multi-step tasks
- When trade-offs must be documented

## GOAP Planning Process

### Step 1: Define Goal

```markdown
## Goal
[Clear statement of what needs to be achieved]

## Success Criteria
- [ ] Measurable outcome 1
- [ ] Measurable outcome 2

## Constraints
- Technical constraints
- Time/scope constraints
- Dependency constraints
```

### Step 2: Identify Actions

```markdown
## Actions Required

| Action | Description | Dependencies | Estimated Effort |
|--------|-------------|--------------|------------------|
| Action 1 | What needs to be done | None | Low/Med/High |
| Action 2 | Next step | Action 1 | Low/Med/High |
```

### Step 3: Create Plan File

```markdown
<!-- plans/NNN-feature-name.md -->
# Plan: Feature Name

## Goal
[Goal statement]

## Current State
[Where we are now]

## Target State
[Where we want to be]

## Implementation Steps
1. Step 1 with details
2. Step 2 with details
3. Step 3 with details

## Files to Create/Modify
- `src/path/to/file.ts` - Purpose
- `src/path/to/another.ts` - Purpose

## Testing Strategy
- Unit tests for X
- Integration tests for Y
- Manual testing for Z

## Rollback Plan
[How to undo if needed]
```

## ADR Template

```markdown
<!-- plans/adr-NNN-title.md -->
# ADR-NNN: Title

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: YYYY-MM-DD
**Context**: Related plans/ADRs

## Context
[What is the issue, why it matters]

## Decision
[What we decided to do]

## Consequences
- Positive outcomes
- Trade-offs made
- Risks accepted

## Alternatives Considered
1. Alternative 1 - Why rejected
2. Alternative 2 - Why rejected

## References
- Links to relevant docs
- Related ADRs
```

## Workflow

### Step 1: Analyze Request

Understand the scope and complexity:
- Is this a simple fix or complex feature?
- Are there architectural implications?
- Are there trade-offs to consider?

### Step 2: Create Plan

```bash
# Find next plan number
ls plans/ | sort | tail -1

# Create plan file
touch plans/NNN-feature-name.md
```

### Step 3: Create ADR (if needed)

For decisions with lasting impact:
```bash
touch plans/adr-NNN-title.md
```

### Step 4: Get Approval

Present plan to user before implementation:
- Summarize approach
- Highlight trade-offs
- Wait for confirmation

## Gotchas

- **Keep Plans Actionable**: Vague plans lead to vague implementations
- **ADRs for Decisions**: Don't ADR everything, only meaningful decisions
- **Number Sequentially**: Use 3-digit numbering (001, 002, etc.)
- **Update Status**: Mark ADRs as Accepted/Deprecated as decisions evolve
- **Link Related Docs**: Cross-reference plans, ADRs, and AGENTS.md
- **Scope Boundaries**: Clearly state what's in and out of scope

## Required Outputs

- `plans/NNN-feature-name.md` - Implementation plan
- `plans/adr-NNN-title.md` - Architecture Decision Record (if needed)
- Updated plan status in charter documents

## Verification

```bash
# List all plans
ls plans/ | sort

# Verify plan format
head -20 plans/001-v1-scope.md
```

## References

- `plans/` - Existing plans directory
- `AGENTS.md` - Planning workflow rules
- https://github.com/d-o-hub/github-template-ai-agents - Template patterns
