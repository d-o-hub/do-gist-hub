# Agent Documentation

Self-learning knowledge base for codebase optimization.

## Structure

```
agent-docs/
├── patterns/           # Detected code patterns (good practices and anti-patterns)
├── issues/            # Documented issues with context and root cause
├── fixes/             # Applied fixes with verification steps
├── detected/          # Auto-detected issues from pattern matching
├── resolved/          # Issues that have been fixed
└── references/        # Auto-generated best practice guides
```

## How It Works

1. **Detection**: Analysis scripts scan codebase for known patterns
2. **Documentation**: Issues are documented with full context
3. **Fixing**: Automated fixes applied where possible
4. **Learning**: Patterns extracted and documented
5. **Prevention**: Rules updated to prevent recurrence

## Usage

### Run Analysis
```bash
# Full analysis
./scripts/analyze-codebase.sh

# With auto-fix
./scripts/analyze-codebase.sh --fix

# With screenshot validation
./scripts/analyze-codebase.sh --validate

# Pattern detection
./scripts/autosearch-issues.sh

# Self-fix known issues
./scripts/self-fix.sh
```

### Watch Mode
```bash
# Continuous monitoring
./scripts/analyze-codebase.sh --watch
```

### Pre-Commit
```bash
# Run before committing
./scripts/analyze-codebase.sh --pre-commit
```

## Issue Lifecycle

1. **Detection** → `detected/YYYY-MM-DD-issue-name.md`
2. **Analysis** → Moved to `issues/` with root cause
3. **Fix** → Documented in `fixes/` with verification
4. **Resolution** → Moved to `resolved/`
5. **Pattern Extraction** → Added to `patterns/`

## Contributing

When you fix an issue:

1. Document the fix in `fixes/`
2. Extract the pattern to `patterns/`
3. Update relevant skill documentation
4. Add prevention rules to AGENTS.md
