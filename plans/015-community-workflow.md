<!-- Last Audit: 2026-05-11 -->
# Plan-015: Contributing Guidelines and Community Workflow

**Status**: Implemented
**Date**: 2026-04-25
**Deciders**: Project Lead, Community Agent

## Objective

Lower the barrier for external contributors and standardize issue/PR workflows.

## Deliverables

### 1. CONTRIBUTING.md

Create `CONTRIBUTING.md` at repository root:

```markdown
# Contributing to d.o. Gist Hub

## Getting Started

1. Fork the repository
2. Clone your fork
3. Run `pnpm install && ./scripts/setup-skills.sh`
4. Run `pnpm dev` to start the dev server

## Development Workflow

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `./scripts/quality_gate.sh`
4. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
5. Push and open a Pull Request

## Code Standards

- TypeScript strict mode, no `any`
- Mobile-first CSS
- Tokens only (no hardcoded values)
- Unit tests for new logic
- E2E tests for user-facing features

## Reporting Bugs

Use the bug report template and include:
- Browser/OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
```

### 2. Issue Templates

Create `.github/ISSUE_TEMPLATE/`:

**bug_report.md:**
```yaml
---
name: Bug Report
about: Report a bug
title: '[Bug] '
labels: bug
---

**Description**
A clear description of the bug.

**Reproduction**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen.

**Environment**
- OS: [e.g. Android 14]
- Browser: [e.g. Chrome 120]
- App Version: [from VERSION file]

**Screenshots**
If applicable.
```

**feature_request.md:**
```yaml
---
name: Feature Request
about: Suggest a feature
title: '[Feature] '
labels: enhancement
---

**Problem**
What problem does this solve?

**Proposed Solution**
Description of the feature.

**Alternatives**
Other approaches considered.

**Scope**
Is this v1 or v2?
```

### 3. Pull Request Template

Create `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Summary

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring
- [ ] Performance

## Testing

- [ ] Unit tests pass (`pnpm test:unit`)
- [ ] E2E tests pass (`pnpm test`)
- [ ] Manual testing on [desktop/mobile]

## Checklist

- [ ] Code follows style guide
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
```

### 4. CODEOWNERS

Create `CODEOWNERS`:
```
# Global fallback
* @project-lead

# Security-sensitive
src/services/security/ @security-lead
src/services/github/auth.ts @security-lead

# UI/UX
src/components/ @ui-lead
src/styles/ @ui-lead
src/tokens/ @ui-lead

# Infrastructure
.github/ @devops-lead
scripts/ @devops-lead
vite.config.ts @devops-lead
```

## Implementation Order

1. Create `CONTRIBUTING.md`
2. Create `.github/ISSUE_TEMPLATE/`
3. Create `.github/PULL_REQUEST_TEMPLATE.md`
4. Create `CODEOWNERS`
5. Update README.md with contributor section

## References

- GitHub Docs: [Setting guidelines for repository contributors](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions)
- AGENTS.md: Code style and commit conventions

---

*Last Audit: 2026-05-11. Status: Implemented — CONTRIBUTING.md, issue templates, PR template, and CODEOWNERS all exist.*
