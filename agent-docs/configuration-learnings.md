# Configuration Learnings

## ESLint (2025 Best Practice)

**Use Flat Config** (ESLint 9+):

```javascript
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['src/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'error' } }
);
```

**Key Rules**:

- `@typescript-eslint/no-explicit-any`: error
- `@typescript-eslint/explicit-function-return-type`: warn
- `@typescript-eslint/no-unused-vars`: error (argsIgnorePattern: '^\_')
- Separate test file rules

---

## TypeScript Strict Mode

**Required Options**:

- `strict: true`
- `noImplicitAny: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noUncheckedIndexedAccess: true`

**Optional Enhancements**:

- `exactOptionalPropertyTypes: true`
- `noPropertyAccessFromIndexSignature: true`

---

## Playwright Configuration

**Multi-Browser Projects**:

- Desktop: chromium, firefox, webkit
- Mobile: Pixel 7, iPhone 14, iPad Mini
- Special: offline, accessibility

**Key Settings**:

```typescript
{
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: { trace: 'on-first-retry', screenshot: 'only-on-failure' }
}
```

---

## Vite Build Optimization

**Performance Budgets**:

```typescript
const BUDGETS = {
  initialJS: 150 * 1024, // 150KB gzipped
  routeChunk: 150 * 1024,
};
```

**Code Splitting**:

```typescript
manualChunks: {
  vendor: ['idb'];
}
```

---

## Git Hooks

**Use Local Hook**:

```bash
cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Check Before Commit**:

- Type check passes
- Lint passes
- Format check passes
- Tests pass (optional in pre-commit, required in CI)

---

## Missing Files Checklist

- [ ] README.md (high priority)
- [ ] CONTRIBUTING.md (high priority)
- [ ] .vscode/settings.json (medium)
- [ ] .vscode/extensions.json (medium)
- [ ] .shellcheckrc (medium)
- [ ] CHANGELOG.md (low)
- [ ] .github/PULL_REQUEST_TEMPLATE.md (low)

---

## CI/CD Pattern

```yaml
jobs:
  quality-gate: # Fast (2-3 min)
  tests: # Slow (10-20 min)
  build: # After tests pass
```

**Dependabot**: Weekly grouped updates for minor/patch.

---

## Quality Gate

```bash
npm run check  # typecheck + lint + format:check
npm run test   # playwright
```

**Pre-commit**:

```bash
./scripts/quality_gate.sh
```

---

_Last updated: 2026-04-21_
