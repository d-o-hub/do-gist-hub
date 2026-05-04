# ADR-023: Commitlint Bot and Automated Message Ignores

**Status**: Implemented
**Date**: 2026-05-22
**Deciders**: Jules (Agent), DevOps

## Context

Automated commits from agents or CI bots, such as "Update SKILL.md", frequently fail Commitlint validation because they do not follow the Conventional Commits format (`type(scope): description`). This blocks CI pipelines for routine documentation or state updates.

## Decision

Implement a dual-layered approach (defense-in-depth) to allow automated commits while maintaining strict validation for human contributors.

1.  **Linter Configuration (Option A)**: Update `commitlint.config.mjs` to ignore messages starting with `Update`, `Auto-update`, or `Automatic`, and any commit containing `[skip ci]`.
2.  **CI Workflow Condition (Option B)**: Add an `if` condition to the Commitlint GitHub Action job to skip execution entirely if the commit message starts with `Update` or the actor is `github-actions[bot]`.

## Implementation

### commitlint.config.mjs
```javascript
export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [
    (commit) => /^(Update|Auto-update|Automatic)/.test(commit),
    (commit) => commit.includes('[skip ci]'),
  ],
};
```

### .github/workflows/commitlint.yml
```yaml
jobs:
  commitlint:
    if: "!startsWith(github.event.head_commit.message, 'Update') && github.actor != 'github-actions[bot]'"
```

## Tradeoffs

### Pros
- Prevents CI failures for automated documentation updates.
- Maintains high quality standards for human-authored code changes.
- Reduces "commit noise" and friction in automated workflows.

### Cons
- Slight risk of humans using "Update" prefix to bypass linting (mitigated by code review).
- Potential for inconsistent message styles in history (accepted for automated tasks).

## Consequences

- Agents can autonomously update `SKILL.md` or other docs without triggering linter errors.
- Version propagation and other bot-driven tasks will pass CI without needing explicit conventional prefixes.

## References
- Issue: Commitlint fails on automated "Update SKILL.md" commits.
- ADR-012: Pre-commit Workflow Enhancement.
