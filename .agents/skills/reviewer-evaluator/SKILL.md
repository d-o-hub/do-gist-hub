---
name: reviewer-evaluator
description: Evaluate code quality, security, performance, and adherence to project conventions before merging.
---

# Reviewer-evaluator Skill

Review changed code for correctness, security, code quality, and performance.

## When to Use

- Reviewing pull requests
- Validating implementations
- Checking for security issues
- Verifying performance budgets
- Ensuring convention adherence

## Review Checklist

### Correctness

- [ ] Logic implements requirements correctly
- [ ] Edge cases handled (null, undefined, empty)
- [ ] Error handling present for async operations
- [ ] No silent failures
- [ ] Type safety maintained (no `any`)

### Security

- [ ] No secrets, tokens, or credentials in code
- [ ] User input sanitized before rendering
- [ ] PAT never logged or exposed in URLs
- [ ] CSP headers configured
- [ ] External links use `rel="noopener noreferrer"`
- [ ] No HTML injection vulnerabilities

### Code Quality

- [ ] Follows naming conventions (camelCase, PascalCase)
- [ ] Max 500 lines per source file
- [ ] Max 250 lines per SKILL.md
- [ ] Functions are small and focused
- [ ] No code duplication
- [ ] Clear, meaningful variable names

### Performance

- [ ] No unnecessary re-renders
- [ ] Large lists virtualized or paginated
- [ ] Images/icons optimized (SVG preferred)
- [ ] Code splitting used for heavy features
- [ ] Memory leaks prevented (cleanup in place)
- [ ] AbortController used for fetch requests

### Testing

- [ ] Tests added for new functionality
- [ ] Tests are deterministic
- [ ] Edge cases covered
- [ ] Offline behavior tested
- [ ] Mobile responsiveness tested

### Conventions

- [ ] Conventional commit format
- [ ] Imports grouped and sorted
- [ ] Absolute paths from `src/`
- [ ] TypeScript strict mode
- [ ] Shell scripts shellcheck compliant

## Review Process

### Step 1: Gather Changes

```bash
# Review all changes
git status
git diff HEAD

# Review recent commits
git log -n 5 --oneline
```

### Step 2: Analyze by Category

Review code systematically:
1. **Correctness**: Does it work as intended?
2. **Security**: Are there vulnerabilities?
3. **Performance**: Will it scale?
4. **Quality**: Is it maintainable?
5. **Testing**: Is it verified?

### Step 3: Provide Feedback

Structure feedback clearly:
```markdown
## Review Summary

**Status**: Approved | Changes Requested | Blocked

### Issues Found

🔴 **Critical** (must fix):
- Security vulnerability description
- Data loss potential

🟡 **Warning** (should fix):
- Performance concern
- Missing error handling

🟢 **Suggestion** (consider):
- Code style improvement
- Refactoring opportunity

### Positive Notes
- Good error handling pattern
- Clear component structure
```

## Automated Checks

```bash
# Run quality gate
./scripts/quality_gate.sh

# Type check
npm run typecheck

# Lint
npm run lint

# Tests
npm run test

# Build
npm run build
```

## Gotchas

- **No Blind Approval**: Actually read and understand the code
- **Context Matters**: Consider the broader impact of changes
- **Security First**: Security issues always block approval
- **Be Constructive**: Suggest solutions, not just problems
- **Check Dependencies**: Verify new dependencies are necessary and safe
- **Review Tests**: Ensure tests actually test the right things
- **Performance Budgets**: Verify bundle size hasn't grown unexpectedly

## Required Outputs

- Review summary with status
- Specific issues categorized by severity
- Constructive feedback with suggestions
- Verification that automated checks pass

## Verification

```bash
# Run all checks
./scripts/quality_gate.sh && npm run test && npm run build

# Check bundle size
npm run build
ls -lh dist/assets/*.js
```

## References

- `AGENTS.md` - All project rules and conventions
- `./scripts/quality_gate.sh` - Quality gate script
- `github-gist-api` skill - API implementation standards
- `security-hardening` skill - Security requirements
