# AGENTS.md Structure Reference

## Required Sections

### 1. Header

```
# AGENTS.md

> [One-line description]
```

### 2. App Identity

- Project name, description, tech stack
- Version info

### 3. Constants

```bash
readonly VARIABLE_NAME=value
```

Named limits for:

- File size limits
- Character limits
- Retry limits

### 4. Mission

What the project builds

### 5. Source-of-Truth Rules

File precedence order

### 6. Setup Commands

```bash
# Install
npm install

# Setup skills
./scripts/setup-skills.sh
```

### 7. Quality Gate

Pre-commit requirements and scripts

### 8. Code Style

- Naming conventions
- Max lines per file type
- TypeScript rules

### 9. Repository Structure

Directory purposes in table format

### 10. Domain Rules

- Token architecture
- Responsive design
- Error handling
- Security
- Memory leak prevention

### 11. Scope Rules

v1 vs v2 boundaries

### 12. Agent Guidance

Workflow conventions

### 13. Available Skills

Skill list with descriptions

### 14. Reference Docs

Official documentation links

## Line Count Targets

| File Type    | Target | Max                           |
| ------------ | ------ | ----------------------------- |
| SKILL.md     | < 200  | 250                           |
| AGENTS.md    | < 150  | 150 (exceed for completeness) |
| Source files | < 400  | 500                           |

## Template Locations

- Template repo: https://github.com/d-o-hub/github-template-ai-agents
- Specification: https://agents.md/
- Skills spec: https://agentskills.io/specification
