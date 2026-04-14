# AGENTS.md Formatting Rules

## Conventions

### Header Format
- Start with `# AGENTS.md`
- Include project identity in blockquote

### Constants Syntax
Use `readonly` bash syntax:
```bash
readonly FILE_SIZE_LIMIT=500
```

### Tables
Use markdown table syntax for structured data.

### Lists
- Unordered: `- Item`
- Ordered: `1. Step`

### Code Blocks
- Bash: ```bash
- TypeScript: ```typescript
- JSON: ```json

## Required Links

| Link | URL |
|------|-----|
| Template repo | https://github.com/d-o-hub/github-template-ai-agents |
| Agents spec | https://agents.md/ |
| Skills spec | https://agentskills.io/specification |

## Section Order

1. Header + Identity
2. Constants
3. Mission
4. Source-of-Truth Rules
5. Setup Commands
6. Quality Gate
7. Code Style Rules
8. Repository Structure
9. Domain Rules (grouped)
10. Scope Rules
11. Agent Guidance
12. Available Skills
13. Reference Docs

## Naming Conventions

- Files: kebab-case
- Variables: camelCase
- Types: PascalCase
- Constants: UPPER_SNAKE_CASE