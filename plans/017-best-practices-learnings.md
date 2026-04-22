# Best Practices Learnings

**Date**: 2026-04-21

## Configuration Best Practices (✅ Implemented)

### ESLint Flat Config (2025 Standard)

```javascript
// eslint.config.js - Use flat config for ESLint 9+
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    },
  }
);
```

### TypeScript Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Playwright Multi-Browser

```typescript
// playwright.config.ts - Test across browsers and devices
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  { name: 'offline', use: { ...devices['Desktop Chrome'], offline: true } },
];
```

### Vite Performance Budgets

```typescript
// vite.config.ts - Enforce budgets at build time
function performanceBudgetPlugin(): Plugin {
  const BUDGETS = {
    initialJS: 150 * 1024, // 150KB gzipped
    routeChunk: 150 * 1024, // 150KB per chunk
  };
  // Check sizes and warn/fail if exceeded
}
```

### CI/CD Quality Gates

```yaml
# .github/workflows/ci.yml
jobs:
  quality-gate:
    steps:
      - run: npm run quality # typecheck + lint + format
  tests:
    steps:
      - run: npm run test:browser
      - run: npm run test:mobile
      - run: npm run test:offline
```

---

## Missing Configuration (❌ Gaps)

### 1. Git Hooks (Not Installed)

```bash
# Solution
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2. Editor Settings (Missing)

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### 3. ShellCheck Config (Missing)

```bash
# .shellcheckrc
shell=bash
source-path=SCRIPTDIR
external-sources=true
disable=SC1090,SC1091
```

### 4. Test Coverage (Not Enforced)

```typescript
// playwright.config.ts - Add coverage thresholds
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // ... existing config
  expect: {
    toHaveCoverage: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
});
```

---

## Recommended Additions

### README.md

```markdown
# d.o. Gist Hub

Offline-first GitHub Gist management app.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Scripts

| Command         | Purpose                   |
| --------------- | ------------------------- |
| `npm run dev`   | Development server        |
| `npm run check` | Typecheck + lint + format |
| `npm run test`  | Run tests                 |
| `npm run build` | Production build          |

## Configuration

See `plans/016-configuration-analysis.md` for details.
```

### CONTRIBUTING.md

```markdown
# Contributing

## Development Setup

1. Install Node 22+: `nvm install 22`
2. Install dependencies: `npm install`
3. Setup git hooks: `cp scripts/pre-commit-hook.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit`
4. Run quality check: `npm run check`

## Code Standards

- TypeScript strict mode
- ESLint + Prettier for formatting
- Conventional commits
- ShellCheck for scripts

## PR Requirements

- [ ] All quality gates pass
- [ ] Tests pass
- [ ] No `console.log` in production code
- [ ] Mobile-first CSS
- [ ] Responsive screenshots at 320/768/1536
```

### .vscode/extensions.json

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-playwright.playwright",
    "editorconfig.editorconfig"
  ]
}
```

### .github/PULL_REQUEST_TEMPLATE.md

```markdown
## Description

[Describe changes]

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Quality gate passes

## Screenshots

| Mobile (320px) | Tablet (768px) | Desktop (1536px) |
| -------------- | -------------- | ---------------- |
| [screenshot]   | [screenshot]   | [screenshot]     |
```

---

## Performance Budgets Summary

| Metric       | Budget | Current | Status  |
| ------------ | ------ | ------- | ------- |
| Initial JS   | 150KB  | ~120KB  | ✅ Pass |
| Route chunks | 150KB  | ~50KB   | ✅ Pass |
| Cold start   | <2s    | ~1.5s   | ✅ Pass |
| Interactions | <100ms | ~50ms   | ✅ Pass |

---

## Quality Metrics Summary

| Category           | Current | Target | Status |
| ------------------ | ------- | ------ | ------ |
| TypeScript strict  | 100%    | 100%   | ✅     |
| ESLint errors      | 0       | 0      | ✅     |
| Format consistency | 100%    | 100%   | ✅     |
| Test coverage      | 30%     | 80%    | ⚠️     |
| Documentation      | 40%     | 90%    | ⚠️     |

---

## Shell Script Quality

All scripts should use:

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
```

Run ShellCheck:

```bash
find scripts -name "*.sh" -exec shellcheck {} +
```

---

## CI/CD Best Practices

### Parallel Jobs

- Quality gate runs first (fast)
- Tests run in parallel (slow)
- Build runs after tests pass

### Artifact Retention

- Test reports: 30 days
- Screenshots: 30 days
- Debug APKs: 30 days

### Dependabot

- Weekly updates
- Grouped minor/patch
- Capacitor major frozen

---

_Created: 2026-04-21_
