# Plan: Enforce Strict Unused Variables Rule

## Objective
Update `eslint.config.js` to strictly enforce the `@typescript-eslint/no-unused-vars` rule by removing ignore patterns and setting `"caughtErrors": "all"`. Resolve all resulting lint errors across the codebase.

## Steps

### 1. Update ESLint Configuration
Modify `eslint.config.js`:
- Change `@typescript-eslint/no-unused-vars` to:
  `['error', { 'caughtErrors': 'all' }]`
- Remove `{ argsIgnorePattern: '^_' }` or any similar ignores.

### 2. Fix Unused Catch Bindings
- Search for `catch (e)` or `catch (err)` where the error variable is unused.
- Replace with optional catch bindings: `catch {`.

### 3. Fix Other Unused Variables
- Run `pnpm check`.
- Fix any new linting errors related to unused variables (e.g., unused parameters, unused imports).

### 4. Verify
- Ensure `pnpm check` passes with zero linting errors.
