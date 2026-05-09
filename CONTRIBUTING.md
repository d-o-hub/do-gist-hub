# Contributing to d.o. Gist Hub

Thank you for your interest in contributing! This document will help you get started.

---

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/do-gist-hub.git
   cd do-gist-hub
   ```
3. Install dependencies and set up skills:
   ```bash
   pnpm install && ./scripts/setup-skills.sh
   ```
4. Start the dev server:
   ```bash
   pnpm run dev
   ```

## Development Environment

- **Node.js**: 20+ (check with `node -v`)
- **Package manager**: npm (or pnpm)
- **Recommended IDE**: VS Code with extensions in `.vscode/extensions.json`

## Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   # or: git checkout -b fix/bug-description
   ```

2. **Make your changes** following the code standards below.

3. **Run the quality gate** before committing:
   ```bash
   ./scripts/quality_gate.sh
   ```

4. **Commit with conventional commits**:
   ```bash
   git commit -m "feat: add gist filtering by language"
   git commit -m "fix: resolve sync queue deadlock"
   git commit -m "docs: update README badges"
   ```

5. **Push and open a Pull Request**.

## Code Standards

- **TypeScript**: strict mode, no `any`, explicit return types on public APIs
- **CSS**: Mobile-first, tokens only (no hardcoded px/hex), `100dvh` for app shell
- **Imports**: absolute from `src/`, grouped (stdlib → external → internal)
- **Tests**: Unit tests for new logic (`tests/unit/`), E2E tests for user-facing features (`tests/browser/`)
- **Documentation**: Update `AGENTS.md` or `plans/` if you change architecture or conventions

## Good First Issues

Look for issues labeled `good first issue` or `help wanted`.

## Pull Request Process

1. Ensure `./scripts/quality_gate.sh` passes locally.
2. Update relevant documentation (README, AGENTS.md, plans/) if needed.
3. Link related issues in the PR description.
4. Request review from maintainers.
5. Address feedback promptly.

## Reporting Bugs

Use the [bug report template](https://github.com/d-o-hub/do-gist-hub/issues/new?template=bug_report.md) and include:

- Browser and OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or screen recordings if applicable

## Reporting Security Issues

See [SECURITY.md](./SECURITY.md) for responsible disclosure.

## Questions?

- Open a [Discussion](https://github.com/d-o-hub/do-gist-hub/discussions) for general questions
- Check [AGENTS.md](./AGENTS.md) for coding conventions and agent workflows

---

**Built with AI agents. Maintained by humans.**
