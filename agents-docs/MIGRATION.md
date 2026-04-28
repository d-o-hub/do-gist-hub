# Adoption Guide for Existing Projects

> How to incrementally adopt d.o. Gist Hub patterns in existing codebases.

## Token System Adoption

### Phase 1: Primitive Tokens (1-2 hours)

1. **Create `src/tokens/primitive/`**
   ```css
   :root {
     --color-blue-500: #2563eb;
     --color-gray-100: #f3f4f6;
     --spacing-1: 0.25rem;
     --spacing-2: 0.5rem;
     --font-sans: system-ui, sans-serif;
   }
   ```

2. **Import in global CSS** (`src/styles/tokens.css`)
3. **Replace obvious hardcoded values** in one component as proof of concept

### Phase 2: Semantic Tokens (2-4 hours)

Map primitives to meaning:

```css
:root {
  --color-bg-primary: var(--color-gray-100);
  --color-text-primary: var(--color-gray-900);
  --color-accent: var(--color-blue-500);
}
```

Update components to use semantic names. Run `npm run check`.

### Phase 3: Component Tokens (ongoing)

```css
.btn {
  --btn-bg: var(--color-accent);
  --btn-padding: var(--spacing-2) var(--spacing-4);
}
```

**Rule**: Never create a component token before its semantic parent exists.

## Mobile-First CSS Migration

### Step 1: Audit Current CSS

```bash
# Find desktop-first patterns
grep -rn "@media (max-width" src/

# Find unstyled elements
grep -rn "<button\|<a " src/ --include="*.ts" | grep -v 'class='
```

### Step 2: Invert Media Queries

**Before (desktop-first)**:
```css
.sidebar { display: flex; }
@media (max-width: 767px) {
  .sidebar { display: none; }
}
```

**After (mobile-first)**:
```css
.sidebar { display: none; }
@media (min-width: 768px) {
  .sidebar { display: flex; }
}
```

### Step 3: Add Dynamic Viewport

```css
.app-shell {
  min-height: 100vh;
  min-height: 100dvh; /* add this */
}
```

### Step 4: Safe Areas

```css
.app-header {
  padding-top: calc(var(--spacing-3) + env(safe-area-inset-top, 0px));
}
```

## Offline-First Patterns

### Incremental Strategy

| Phase | Feature | Files to Touch |
|-------|---------|---------------|
| 1 | **Read cache** | `src/services/db/` — store gist list in IndexedDB |
| 2 | **Optimistic writes** | `src/stores/gist-store.ts` — update UI before API |
| 3 | **Sync queue** | `src/services/sync/queue.ts` — queue failed writes |
| 4 | **Background sync** | `src/services/network/offline-monitor.ts` — retry on reconnect |
| 5 | **Conflict detection** | `src/services/sync/conflict.ts` — detect diverged state |

### Minimal IndexedDB Setup

```typescript
// src/services/db/schema.ts
import { openDB } from 'idb';
import { APP } from '../../config/app.config';

export const db = openDB(APP.dbName, 1, {
  upgrade(db) {
    db.createObjectStore('gists', { keyPath: 'id' });
    db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
  },
});
```

### Adding Optimistic Updates

```typescript
// Before: await api.updateGist(id, data);
// After:
const previous = get(gistStore, id);
gistStore.update(id, data); // optimistic

try {
  await api.updateGist(id, data);
} catch (err) {
  gistStore.update(id, previous); // rollback
  syncQueue.push({ type: 'update', id, data });
}
```

## Incremental Adoption Strategy

### For Greenfield Components

Use all patterns from day one:
- Token-driven CSS
- Mobile-first layout
- Offline-first data flow
- Error boundaries

### For Existing Components

1. **Touch only what you change** — Don't refactor untouched files
2. **One pattern per PR** — Don't mix token migration with logic changes
3. **Add tests before refactoring** — Playwright coverage prevents regressions
4. **Screenshot diff** — `agent-browser` before/after at 320px, 768px, 1536px

### Migration Order of Operations

```
1. Config consolidation     → src/config/app.config.ts
2. Token primitives         → src/tokens/primitive/
3. Token semantic layer     → src/tokens/semantic/
4. Base CSS refactor        → src/styles/base.css (mobile-first)
5. Component token layer    → src/tokens/component/
6. Error boundaries         → src/components/error/
7. IndexedDB schema         → src/services/db/
8. Optimistic updates       → src/stores/
9. Sync queue               → src/services/sync/
10. PWA shell               → public/sw.js + manifest
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Refactoring everything at once | One layer per commit; validate at each step |
| Forgetting to migrate tests | Update Playwright locators for new CSS classes |
| Hardcoded breakpoints | Use token variables: `--bp-md: 768px` |
| Missing rollback logic | Always store previous state before optimistic update |
| No offline indicator | Add sync status UI from the start |

## Validation Checklist

After each migration phase:

- [ ] `npm run check` passes
- [ ] Screenshots at 320px, 768px, 1536px match expectations
- [ ] Offline mode works (simulate in DevTools Network tab)
- [ ] No console errors
- [ ] Quality gate passes: `./scripts/quality_gate.sh`

## References

- `AGENTS.md` — Domain rules (tokens, responsive, offline-first)
- `.agents/skills/design-token-system/SKILL.md` — Token architecture deep dive
- `.agents/skills/responsive-system/SKILL.md` — Breakpoint and layout patterns
- `.agents/skills/offline-indexeddb/SKILL.md` — IndexedDB schema and operations
- `plans/002-architecture.md` — System layering
