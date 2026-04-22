# d.o. Gist Hub (2026 Edition)

d.o. Gist Hub is a state-of-the-art, offline-first GitHub Gist management application. Built with 2026 best practices for security, performance, and responsive design, it offers a native-like experience on both web and mobile platforms.

## 🚀 Quick Start

Get up and running in seconds:

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

*Note: The project uses `pnpm` as the standard package manager. If you don't have it, install it via `npm install -g pnpm`.*

## 🛠 Available Scripts

The project includes a comprehensive set of scripts for development, testing, and building:

| Script | Description |
|--------|-------------|
| `pnpm dev` | Starts the Vite development server |
| `pnpm build` | Compiles TypeScript and builds the production bundle |
| `pnpm preview` | Previews the production build locally |
| `pnpm check` | Runs type-checking, linting, and formatting checks (quality gate) |
| `pnpm test` | Runs all Playwright E2E tests |
| `pnpm run test:ui` | Opens Playwright's UI for interactive test debugging |
| `pnpm run test:mobile` | Runs tests specifically for mobile viewports |
| `pnpm run quality` | Executes the full quality gate script |
| `pnpm run cap:sync` | Syncs the Capacitor project (for Android) |
| `pnpm run build:android` | Full build and sync process for Android |

## 🏗 Architecture Summary

d.o. Gist Hub follows a robust **Layered Architecture** to ensure maintainability and scalability:

- **Presentation Layer**: Vanilla TypeScript components styled with a token-driven CSS system. Responsive design is handled via a 7-breakpoint system.
- **Application Layer**: Manages routing, global state (GistStore, AuthStore), and centralized error handling.
- **Domain Layer**: Contains the core business logic for Gist management, authentication, and offline synchronization.
- **Data Layer**: Implements the Repository Pattern, abstracting interactions between the GitHub REST API and local IndexedDB storage.

### Key Design Principles

- **Offline-First**: IndexedDB acts as the source of truth, with background synchronization and optimistic updates.
- **Token-Driven Design**: All UI elements derive their styling from centralized design tokens (DTCG-aligned).
- **Hardened Security**: PATs are encrypted at rest using AES-GCM (Web Cryptography API), and all logs are automatically redacted.
- **Vanilla TS**: No framework overhead, ensuring minimal bundle sizes and maximum performance.

## 💻 Development Setup

### Prerequisites

- **Node.js**: v22+ (recommended)
- **pnpm**: v9+
- **Git**: For version control and pre-commit hooks

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd d-o-gist-hub
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Initialize design tokens**:
   ```bash
   pnpm run init:design
   ```

4. **Start the environment**:
   ```bash
   pnpm dev
   ```

### Android Development (Optional)

To build and run the application on Android, you'll need Android Studio and the Android SDK installed:

```bash
pnpm run build:android
pnpm run cap:android:open
```

## 📖 Documentation

For more detailed information, please refer to the following resources:

- **[Architecture Deep Dive](plans/002-architecture.md)**: Detailed breakdown of the system architecture.
- **[Engineering Principles (AGENTS.md)](AGENTS.md)**: Guidelines for development, coding standards, and agent workflows.
- **[V1 Scope & Roadmap](plans/001-v1-scope.md)**: Overview of implemented and planned features.
- **[Design System](plans/003-design-token-architecture.md)**: Documentation on the token-driven design system.
- **[Agent Docs](agent-docs/README.md)**: Knowledge base for codebase optimization and patterns.

---

*Built with ❤️ for the Gist community. © 2026 d.o. Hub.*
