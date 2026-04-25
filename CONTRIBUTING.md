# Contributing to d.o. Gist Hub

## Getting Started

1. Fork the repository
2. Clone your fork
3. Run `npm install && ./scripts/setup-skills.sh`
4. Run `npm run dev` to start the dev server

## Development Workflow

1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes
3. Run `./scripts/quality_gate.sh`
4. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
5. Push and open a Pull Request

## Code Standards

- TypeScript strict mode, no `any`
- Mobile-first CSS
- Tokens only (no hardcoded values)
- Unit tests for new logic
- E2E tests for user-facing features

## Reporting Bugs

Use the bug report template and include:
- Browser/OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
