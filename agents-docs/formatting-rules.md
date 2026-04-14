# AGENTS.md Formatting Rules

## Conventions

### Header Format
- Start with `# AGENTS.md`
- Include project identity in blockquote: `> **App Name** — description`

### Constants Syntax
Use `readonly` bash syntax for named limits:
```bash
readonly FILE_SIZE_LIMIT=500
readonly RETRY_MAX_ATTEMPTS=3
```

### Tables
Use markdown tables for structured data (identity mapping, directory structure).

### Lists
- Unordered: `- Item`
- Ordered: `1. Step`

### Code Blocks
- Bash: \`\`\`bash
- TypeScript: \`\`\`typescript
- JSON: \`\`\`json

## Required Links

| Link | URL |
|------|-----|
| Template repo | https://github.com/d-o-hub/github-template-ai-agents |
| Agents spec | https://agents.md/ |
| Skills spec | https://agentskills.io/home |

## Section Order

1. Header + Identity
2. App Identity (source-of-truth table)
3. Constants
4. Mission (one paragraph)
5. Source-of-Truth Rules
6. Setup and Quality Gate (combined)
7. Code Style Rules
8. Repository Structure
9. Domain Rules (consolidated):
   - Token Architecture
   - Responsive Design
   - Error Handling
   - Security
   - Memory Prevention
   - Performance Budgets
   - Offline-First
   - GitHub API
10. Scope Rules (v1 vs v2)
11. Agent Guidance (TRIZ-first)
12. Plans/ADR Workflow (TRIZ-based)
13. Validation-Before-Commit
14. Available Skills
15. Reference Docs

## Naming Conventions

- Files: kebab-case
- Variables: camelCase
- Types: PascalCase
- Constants: UPPER_SNAKE_CASE
- Functions: camelCase

## TRIZ Workflow References

- Use `triz-analysis` for contradiction audits
- Use `triz-solver` for systematic problem-solving
- Reference IFR (Ideal Final Result) concept
- Document contradictions in ADRs
