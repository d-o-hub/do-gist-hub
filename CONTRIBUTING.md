# Contributing to d.o. Gist Hub

Thank you for your interest in contributing to d.o. Gist Hub! This document provides guidelines and instructions for contributing to the project.

## Development Workflow

### Prerequisites

- **Node.js**: version 22 or higher.
- **pnpm**: version 9 or higher (preferred package manager).
- **Git**: for version control.

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/d-o-hub/d-o-gist-hub.git
   cd d-o-gist-hub
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up git hooks**:
   We use a pre-commit hook to ensure code quality.
   ```bash
   cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

4. **Initialize design tokens**:
   ```bash
   pnpm run init:design
   ```

5. **Start development server**:
   ```bash
   pnpm dev
   ```

---

## Code Standards

### TypeScript

- Use **strict mode** (already configured in `tsconfig.json`).
- Avoid the `any` type; use `unknown` or explicit types/interfaces.
- Provide explicit return types for public APIs and functions.
- Follow **PascalCase** for classes and interfaces, **camelCase** for functions and variables, and **UPPER_SNAKE_CASE** for constants.

### Linting & Formatting

- **ESLint**: We use ESLint for code quality. Run `pnpm run lint` to check for issues.
- **Prettier**: We use Prettier for consistent formatting. Run `pnpm run format` to fix formatting or `pnpm run format:check` to verify.
- **Quality Gate**: Run `pnpm run check` to perform type-checking, linting, and formatting checks simultaneously.

### CSS

- **Mobile-First**: Always write base styles for mobile and use media queries for larger viewports.
- **Design Tokens**: Use CSS custom properties defined in the token system. Avoid hardcoded values.
- **Modern Features**: Use `100dvh` for viewport height and `env(safe-area-inset-*)` for safe area padding.

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:`: A new feature
- `fix:`: A bug fix
- `docs:`: Documentation only changes
- `style:`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor:`: A code change that neither fixes a bug nor adds a feature
- `perf:`: A code change that improves performance
- `test:`: Adding missing tests or correcting existing tests
- `chore:`: Changes to the build process or auxiliary tools and libraries

Example:
```
feat: add command palette search functionality
```

---

## Testing Guidelines

We use **Playwright** for E2E and component testing.

### Test Categories

- **Browser**: Desktop tests across Chrome, Firefox, and Safari.
- **Mobile**: Emulated mobile device tests (Pixel 7, iPhone 14).
- **Offline**: Verifying PWA and IndexedDB behavior without connectivity.
- **Accessibility**: ARIA and contrast checks.

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:browser      # Run desktop browser tests
pnpm test:mobile       # Run mobile emulation tests
pnpm test:offline      # Run offline scenario tests
pnpm test:a11y         # Run accessibility tests
```

---

## Pull Request Requirements

Before submitting a PR, ensure that:

1. **Quality Gate Passes**: Run `pnpm run quality` to ensure all checks (lint, type, format, etc.) pass.
2. **Tests Pass**: All relevant tests should pass. If adding a feature, include new tests.
3. **Documentation**: Update `README.md` or other relevant docs if needed.
4. **Clean Commits**: Ensure your commit history is clean and follows the conventional commit format.
5. **No Regressions**: Verify that the application is responsive and functional on various screen sizes.

### PR Checklist

- [ ] I have performed a self-review of my code.
- [ ] My changes follow the project's code style.
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] New and existing tests pass locally with my changes.
- [ ] I have updated the documentation accordingly.
- [ ] My commits follow the conventional commit format.
