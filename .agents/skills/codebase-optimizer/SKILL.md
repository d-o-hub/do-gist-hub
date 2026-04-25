---
name: codebase-optimizer
description: "Autonomous codebase optimization with self-learning, pattern detection, and automated fixing. Analyzes code, identifies issues, learns from fixes, and prevents regressions through continuous monitoring."
license: MIT
metadata:
  author: d.o.
  version: "1.0"
  spec: "agentskills.io"
---

# Codebase Optimizer

Autonomous optimization system that analyzes code, detects patterns, learns from fixes, and prevents regressions.

## When To Use

- After making changes that might have unintended side effects
- When screenshots show visual regressions
- Before committing to ensure no issues were introduced
- To proactively scan for common anti-patterns
- To learn from fixes and update documentation automatically

## Core Workflow

### 1. Autonomous Analysis Loop

```
Analyze → Detect → Fix → Validate → Learn → Document
```

### 2. Self-Learning Pattern

Every fix generates knowledge:

```
Issue Detected → Root Cause Analysis → Fix Applied → 
Pattern Extracted → Rule Updated → Prevention Documented
```

## Usage

### Quick Scan
```bash
# Analyze current codebase state
./scripts/analyze-codebase.sh

# Auto-fix detected issues
./scripts/analyze-codebase.sh --fix

# Validate with screenshots
./scripts/analyze-codebase.sh --validate
```

### Continuous Monitoring
```bash
# Watch mode - runs on file changes
./scripts/analyze-codebase.sh --watch

# Pre-commit hook integration
./scripts/analyze-codebase.sh --pre-commit
```

## Detection Categories

### Visual/CSS Issues
- Unstyled elements (missing CSS classes)
- Layout gaps (header/content spacing)
- Responsive breakpoints not working
- Missing safe area insets
- Default browser styles visible

### Code Structure Issues
- Missing base styles before media queries
- Hardcoded values instead of tokens
- Missing error boundaries
- Memory leak patterns
- Type safety gaps

### Performance Issues
- Unused CSS/JS
- Large bundle sizes
- Missing lazy loading
- Inefficient re-renders

## Self-Learning Database

Issues and fixes are stored in `agents-docs/`:

```
agents-docs/
├── patterns/           # Detected patterns (good and bad)
│   ├── css-layouts.md
│   ├── navigation-patterns.md
│   └── responsive-anti-patterns.md
├── issues/            # Issue instances with context
│   ├── 2026-04-14-unstyled-sidebar.md
│   └── 2026-04-14-layout-gap.md
├── fixes/             # Applied fixes with verification
│   ├── 2026-04-14-sidebar-fix.md
│   └── 2026-04-14-layout-fix.md
└── references/        # Auto-generated best practices
    ├── mobile-layout-2026.md
    └── production-ui-standards.md
```

## Integration Points

### With AGENTS.md
- Updates "Common Regressions" section automatically
- Adds new rules to "Stop Conditions"
- Documents learned patterns in "Self-Learning" sections

### With Skills
- Updates skill documentation with new patterns
- Adds eval cases for detected issues
- Creates reference files for complex fixes

### With Scripts
- `quality_gate.sh` - runs analysis before commit
- `validate-skills.sh` - checks skill consistency
- `analyze-codebase.sh` - main analysis entry point

## Required Outputs

- `agents-docs/issues/` - Issue reports with context
- `agents-docs/fixes/` - Fix documentation with verification
- `agents-docs/patterns/` - Extracted patterns
- Updated `AGENTS.md` with learned rules
- Updated skill reference files

## Verification Commands

```bash
# Check analysis ran
ls agents-docs/issues/*.md 2>/dev/null | wc -l

# Check patterns documented
cat agents-docs/patterns/*.md | grep -c "Pattern:"

# Validate fixes applied
grep -r "Fix Applied" agents-docs/fixes/ | wc -l
```
