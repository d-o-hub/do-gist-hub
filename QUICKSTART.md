# Quick Start Guide

Get d.o. Gist Hub running locally in under 5 minutes.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (with npm)
- [Git](https://git-scm.com/) 2.30+
- (Optional) [pnpm](https://pnpm.io/) for faster dependency installs

## Installation

```bash
# Clone the repository
git clone https://github.com/d-o-hub/do-gist-hub.git
cd do-gist-hub

# Install dependencies
npm install

# Set up AI agent skill symlinks
./scripts/setup-skills.sh
```

## Development

```bash
# Start the dev server
npm run dev

# Open http://localhost:5173 in your browser
```

## Pre-Commit Setup (Recommended)

```bash
# Option A: Use the custom pre-commit hook
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Option B: Use pre-commit framework (requires pip)
pip install pre-commit
pre-commit install
```

## Verify Everything Works

```bash
# Run the full quality gate
./scripts/quality_gate.sh

# Or run individual checks
npm run check        # typecheck + lint + format:check
npm run lint:fix     # auto-fix lint issues
```

Expected output:

```
Type check passed
Lint passed
Format check passed
Skill validation passed
Quality gate complete
```

## Next Steps

- [Read AGENTS.md](./AGENTS.md) for engineering principles and coding standards
- [Read CONTRIBUTING.md](./CONTRIBUTING.md) to start contributing
- [Explore the Plans](./plans/) for architecture decisions and roadmaps
