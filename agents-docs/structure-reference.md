# AGENTS.md Structure Reference

## Required Sections

### 1. Header + Identity

```
# AGENTS.md

> **App Name** — single source of truth for AI coding agents.
> Built with: [tech stack]
> Version: [version]
```

### 2. App Identity

Source-of-truth table mapping config constants to derived files:

| File | Field | Source constant |
|------|-------|----------------|

### 3. Constants

```bash
readonly VARIABLE_NAME=value
```

Named limits for file sizes, character limits, retry limits.

### 4. Mission

One paragraph: what the project builds and key features.

### 5. Source-of-Truth Rules

File precedence order (repository files > AGENTS.md > skills > plans > official docs).

### 6. Setup and Quality Gate

Combined section with setup commands and quality gate requirements.

### 7. Code Style

Naming conventions, max lines per file type, TypeScript rules, import ordering.

### 8. Repository Structure

Directory purposes in table format.

### 9. Domain Rules (Consolidated)

Each domain rule as a concise bullet list:

- **Token Architecture**: Tokens First → No hardcoded → Layered → Themeable → Responsive → DTCG
- **Responsive Design**: Mobile-first → 7 breakpoints → clamp() → touch targets → safe areas
- **Error Handling**: Structured → User-safe → Recoverable → No silent → Bounded → Redacted
- **Security**: No PAT logs → Auth header → CSP → Validation → HTTPS → No secrets
- **Memory Prevention**: Cleanup → AbortController → Route cleanup → No retained bodies
- **Performance**: Budget limits → Cold start → Interactions → Code splitting
- **Offline-First**: IndexedDB → Optimistic writes → Pending queue → Backoff → Conflicts
- **GitHub API**: Typed → Pagination → Rate limits → Accept header → Bearer auth

### 10. Scope Rules

v1 (now) vs v2 (future) feature boundaries.

### 11. Agent Guidance

TRIZ-first workflow: `triz-analysis` → `triz-solver` → atomic commits → context discipline.

### 12. Plans/ADR Workflow

1. Analyze contradictions with `triz-analysis`
2. Solve with `triz-solver` (define IFR)
3. Write ADR in `plans/adr-*.md`
4. Implement and revise as needed

### 13. Validation-Before-Commit

Quality gate, type check, tests, lint, responsive, memory stable.

### 14. Available Skills

Skill list with one-line descriptions.

### 15. Reference Docs

Official documentation links only.

## Line Count Targets

| File Type    | Target | Max                           |
| ------------ | ------ | ----------------------------- |
| SKILL.md     | < 200  | 250                           |
| AGENTS.md    | < 150  | 150 (exceed for completeness) |
| Source files | < 400  | 500                           |

## TRIZ Integration

- **Replace GOAP**: Use TRIZ contradiction analysis instead of GOAP planning
- **Contradiction-First**: Identify "improving X worsens Y" before implementing
- **IFR**: Define Ideal Final Result before solution design
- **ADR Documentation**: Document resolved contradictions in ADRs

## Template Locations

- Template: https://github.com/d-o-hub/github-template-ai-agents
- Spec: https://agents.md/
- Skills: https://agentskills.io/home
