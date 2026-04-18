# Architecture Overview

## System Context

```
┌──────────────┐
│   User       │
└──────┬───────┘
       │ interacts with
       ▼
┌──────────────┐     ┌──────────────┐
│  d.o. Gist Hub │────▶│   GitHub     │
│   (PWA)      │ REST│   API        │
└──────┬───────┘     └──────────────┘
       │
       │ reads/writes
       ▼
┌──────────────┐
│  IndexedDB   │
│  (Local)     │
└──────────────┘
```

## Layered Architecture

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Screens │  │Components│  │ Tokens  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
├─────────────────────────────────────────┤
│            Application Layer            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Routing │  │  State  │  │ Errors  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
├─────────────────────────────────────────┤
│              Domain Layer               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  Gist   │  │  Auth   │  │  Sync   │ │
│  └─────────┘  └─────────┘  └─────────┘ │
├─────────────────────────────────────────┤
│             Data Layer                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │IndexedDB│  │ GitHub  │  │  Cache  │ │
│  │ Repository│  │ Client │  │         │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── main.ts              # App entry point
├── app.ts               # Root component
├── routes/              # Route definitions
│   ├── home.ts
│   ├── gist-detail.ts
│   ├── create-edit.ts
│   ├── offline.ts
│   └── settings.ts
├── components/          # UI components
│   ├── layout/
│   ├── gist/
│   ├── editor/
│   ├── navigation/
│   └── error/
├── services/            # Business logic
│   ├── github/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── error-handler.ts
│   ├── db/
│   │   ├── index.ts
│   │   ├── schema.ts
│   │   └── migrations.ts
│   ├── sync/
│   │   ├── queue.ts
│   │   └── conflict.ts
│   └── network/
│       └── offline-monitor.ts
├── stores/              # State management
│   ├── gist-store.ts
│   ├── auth-store.ts
│   └── ui-store.ts
├── tokens/              # Design tokens
│   ├── primitive/
│   ├── semantic/
│   ├── component/
│   └── index.ts
├── styles/              # Global styles
│   ├── base.css
│   └── tokens.css
├── lib/                 # Utilities
│   ├── errors/
│   ├── logging/
│   └── utils/
└── types/               # TypeScript types
    ├── gist.ts
    ├── api.ts
    └── db.ts
```

## Key Design Decisions

### 1. Vanilla TypeScript
- No framework overhead
- Full control over rendering
- Smaller bundle size
- Easier for AI agents to maintain

### 2. Token-Driven CSS
- All styles from design tokens
- CSS custom properties for theming
- Responsive via token scaling

### 3. Repository Pattern
- Abstract data source (IndexedDB vs GitHub API)
- Easy to test with mocks
- Clear separation of concerns

### 4. Optimistic Updates
- UI updates immediately
- Sync happens in background
- Rollback on failure

### 5. Event-Driven Sync
- Offline monitor triggers sync
- Queue processes pending operations
- Retry with exponential backoff

## Data Flow

### Read Flow (Online)
```
User → Component → Store → GitHub API → Cache → UI
```

### Read Flow (Offline)
```
User → Component → Store → IndexedDB → UI
```

### Write Flow
```
User → Component → Optimistic Update → Queue → Sync → GitHub
                                      ↓
                                  IndexedDB
```

## Error Boundaries

```
GlobalErrorBoundary (catches fatal errors)
├── RouteBoundary (per-route errors)
│   └── Screen Components
└── AsyncErrorBoundary (handles promise rejections)
```

## Security Boundaries

```
┌─────────────────────────────────────┐
│         Trusted Zone                │
│  - App code                         │
│  - Design tokens                    │
│  - IndexedDB                        │
└─────────────────────────────────────┘
              │
              │ HTTPS only
              ▼
┌─────────────────────────────────────┐
│         Untrusted Zone              │
│  - GitHub API responses             │
│  - Raw gist content                 │
│  - External links                   │
└─────────────────────────────────────┘
```

## Performance Strategy

1. **Code Splitting**: Routes loaded on demand
2. **Lazy Loading**: Heavy features (editor) loaded when needed
3. **Caching**: Aggressive cache for shell, strategic for data
4. **Virtualization**: Long lists virtualized if needed
5. **Debouncing**: Search and input debounced

---

*Created: 2026. Status: Completed.*
