# plans/

Canonical planning and decision memory for **d.o. Gist Hub**.
All durable decisions, active work, investigations, and outcomes live here.

---

## Folder structure

```
plans/
  README.md       ← this file (immutable conventions)
  _index.md       ← human-readable active plan registry
  _status.json    ← machine-readable registry for agents/scripts
  NNN-slug.md     ← numbered plans (000-project-charter, 005-data-model, etc.)
  adr-NNN-slug.md ← Architecture Decision Records
  plan-slug.md    ← feature/initiative plans (plan-ui-ux-modernization, etc.)
  strict-slug.md  ← temporary enforcement plans (strict-unused-vars, etc.)
  archive/        ← completed or superseded files
```

---

## File types and rules

| Type            | Prefix                           | Rule                                                                                                           |
| --------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| ADR             | `adr-NNN-`                       | Long-lived, immutable once accepted. Status: proposed → accepted → superseded. Never delete — supersede.       |
| Numbered plan   | `NNN-`                           | Foundational docs, task decompositions, GOAP-like active plans. Update in-place; archive when complete.        |
| Progress update | `NNN-progress-update-YYYY-MM-DD` | Execution snapshots (`021-`, `023-`, `024-`, `025-`). Read-only after merge. Move to `archive/` after 60 days. |
| Feature plan    | `plan-`                          | Short-lived research or design. Promote to ADR if stable, else archive.                                        |
| Strictness      | `strict-`                        | Enforcement plans (`strict-unused-vars`). Archive when enforcement is complete.                                |

---

## Naming conventions

- Numbers zero-padded to 3 digits: `000`, `001`, `002`
- **Next available plan number**: `042`
- **Next available ADR number**: `adr-030`
- Dates: ISO 8601 `YYYY-MM-DD`
- Slugs: lowercase kebab-case, max 40 chars

---

## Rules

- **One progress update per sprint**: Append to an existing progress update instead of creating a new file on the same day. This prevents clutter from multiple same-day updates (see also E5 in plan 038).

## Lifecycle

```
draft → active → complete → archived
```

Move completed files to `plans/archive/` — never delete them.

---

## Status header (required in every file)

```markdown
> **Status**: Active
> **Type**: ADR | Plan | Progress | Analysis
> **Created**: YYYY-MM-DD
> **Updated**: YYYY-MM-DD
> **Owner**: agent | human
> **Related**: adr-NNN, NNN-plan
```

---

## What goes where

| Path           | Content                                                             |
| -------------- | ------------------------------------------------------------------- |
| `plans/`       | All planning, decisions, and analysis                               |
| `docs/`        | User-facing documentation only                                      |
| `agents-docs/` | Agent skill definitions                                             |
| `AGENTS.md`    | Canonical agent behavior; model files reference it, never duplicate |

---

## Maintaining \_index.md and \_status.json

- Update `_index.md` when adding, completing, or archiving any plan.
- Update `_status.json` on every status change (agents must do this automatically).
- Both are the first thing an agent reads when resuming work on this repo.
