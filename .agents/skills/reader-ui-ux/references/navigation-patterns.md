# Navigation Patterns (2026)

Responsive navigation patterns for mobile-first applications.

## Navigation Architecture

### Three-Layer Navigation

1. **Primary Navigation**: Main app sections (always visible or easily accessible)
2. **Secondary Navigation**: Contextual actions within a section
3. **Tertiary Navigation**: Page-level navigation, tabs, filters

### Viewport-Based Navigation Matrix

| Viewport    | Primary    | Secondary         | Pattern         |
| ----------- | ---------- | ----------------- | --------------- |
| 320-479px   | Bottom tab | Sheet drawer      | Mobile-first    |
| 480-767px   | Bottom tab | Sheet drawer      | Relaxed mobile  |
| 768-1023px  | Rail nav   | Collapsible panel | Tablet hybrid   |
| 1024-1279px | Sidebar    | Persistent panel  | Desktop compact |
| 1280px+     | Sidebar    | Persistent panel  | Desktop full    |

## Mobile Navigation (320-767px)

### Bottom Tab Bar

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 72px;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--color-background-elevated);
  border-top: 1px solid var(--color-border-default);
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: var(--z-index-fixed);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  min-width: 64px;
  min-height: 44px;
  border-radius: var(--radius-full);
  color: var(--color-foreground-muted);
  transition: all var(--motion-duration-fast) ease;
}

.nav-item.active {
  color: var(--color-accent-primary);
  background: var(--color-accent-subtle);
}
```

### Bottom Sheet (Secondary Navigation)

```typescript
class BottomSheet {
  private sheet: HTMLElement;
  private backdrop: HTMLElement;
  private startY: number = 0;
  private currentY: number = 0;

  open() {
    this.sheet.classList.add("open");
    this.backdrop.classList.add("visible");
    this.trapFocus();
  }

  close() {
    this.sheet.classList.remove("open");
    this.backdrop.classList.remove("visible");
    this.restoreFocus();
  }

  private setupDrag() {
    this.sheet.addEventListener("touchstart", (e) => {
      this.startY = e.touches[0].clientY;
      this.sheet.classList.add("dragging");
    });

    this.sheet.addEventListener("touchmove", (e) => {
      this.currentY = e.touches[0].clientY;
      const delta = this.currentY - this.startY;
      if (delta > 0) {
        this.sheet.style.transform = `translateY(${delta}px)`;
      }
    });

    this.sheet.addEventListener("touchend", () => {
      this.sheet.classList.remove("dragging");
      const delta = this.currentY - this.startY;
      if (delta > 100) {
        this.close();
      } else {
        this.sheet.style.transform = "";
      }
    });
  }
}
```

```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 90vh;
  background: var(--color-background-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  transform: translateY(100%);
  transition: transform 350ms var(--ease-out-expo);
  z-index: var(--z-index-modal);
}

.bottom-sheet.open {
  transform: translateY(0);
}

.bottom-sheet.dragging {
  transition: none;
}

.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 200ms ease,
    visibility 200ms;
  z-index: calc(var(--z-index-modal) - 1);
}

.bottom-sheet-backdrop.visible {
  opacity: 1;
  visibility: visible;
}
```

### Floating Action Button (FAB)

```css
.fab {
  position: fixed;
  right: var(--spacing-4);
  bottom: calc(72px + var(--spacing-4) + env(safe-area-inset-bottom));
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-fixed);
  transition:
    transform var(--motion-duration-fast) ease,
    box-shadow var(--motion-duration-fast) ease;
}

.fab:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-xl);
}

.fab:active {
  transform: scale(0.95);
}
```

## Tablet Navigation (768-1023px)

### Navigation Rail

```css
.rail-nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 72px;
  background: var(--color-background-elevated);
  border-right: 1px solid var(--color-border-default);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: var(--spacing-4);
  gap: var(--spacing-2);
  z-index: var(--z-index-fixed);
}

.rail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  width: 56px;
  padding: var(--spacing-2) 0;
  border-radius: var(--radius-lg);
  color: var(--color-foreground-muted);
  font-size: var(--font-size-xs);
  transition: all var(--motion-duration-fast) ease;
}

.rail-item.active {
  color: var(--color-accent-primary);
  background: var(--color-accent-subtle);
}

/* Content margin to account for rail */
.main-content {
  margin-left: 72px;
}
```

### Collapsible Side Panel

```css
.side-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 320px;
  background: var(--color-background-elevated);
  border-left: 1px solid var(--color-border-default);
  transform: translateX(100%);
  transition: transform 300ms var(--ease-out-expo);
  z-index: var(--z-index-modal);
}

.side-panel.open {
  transform: translateX(0);
}
```

## Desktop Navigation (1024px+)

### Persistent Sidebar

```css
.sidebar-nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 240px;
  background: var(--color-background-primary);
  border-right: 1px solid var(--color-border-default);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  overflow-y: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2-5) var(--spacing-3);
  border-radius: var(--radius-full);
  color: var(--color-foreground-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--motion-duration-fast) ease;
}

.sidebar-item:hover {
  background: var(--color-interactive-hover);
  color: var(--color-foreground-primary);
}

.sidebar-item.active {
  background: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
}

/* App shell with sidebar */
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  min-height: 100vh;
}

.sidebar-nav {
  grid-area: sidebar;
}
.app-header {
  grid-area: header;
}
.app-main {
  grid-area: main;
}
```

### Collapsible Sections

```css
.settings-section {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.settings-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  cursor: pointer;
  list-style: none;
  transition: background-color var(--motion-duration-fast) ease;
}

.settings-section-header:hover {
  background: var(--color-interactive-hover);
}

.settings-section-header::-webkit-details-marker {
  display: none;
}

.section-toggle-icon {
  transition: transform var(--motion-duration-fast) ease;
}

.settings-section[open] .section-toggle-icon {
  transform: rotate(180deg);
}

.settings-section-content {
  padding: 0 var(--spacing-4) var(--spacing-4);
}
```

## Command Palette (Power Users)

```typescript
class CommandPalette {
  private isOpen = false;
  private commands: Command[] = [];

  constructor() {
    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });
  }

  open() {
    this.isOpen = true;
    // Render palette
    // Focus input
    // Trap focus
  }

  close() {
    this.isOpen = false;
    // Hide palette
    // Restore focus
  }

  filter(query: string) {
    return this.commands.filter((cmd) =>
      cmd.title.toLowerCase().includes(query.toLowerCase()),
    );
  }
}
```

```css
.command-palette {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: min(600px, 90vw);
  background: var(--color-background-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  z-index: var(--z-index-popover);
}

.command-palette-input {
  width: 100%;
  padding: var(--spacing-4);
  border: none;
  border-bottom: 1px solid var(--color-border-default);
  background: transparent;
  font-size: var(--font-size-lg);
}

.command-palette-list {
  max-height: 400px;
  overflow-y: auto;
}

.command-item {
  padding: var(--spacing-3) var(--spacing-4);
  cursor: pointer;
  transition: background-color var(--motion-duration-fast) ease;
}

.command-item:hover,
.command-item.selected {
  background: var(--color-interactive-hover);
}
```

## Breadcrumb Navigation

```css
.breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
  color: var(--color-foreground-muted);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.breadcrumb-item:not(:last-child)::after {
  content: "/";
  color: var(--color-border-default);
}

.breadcrumb-item a {
  color: var(--color-foreground-secondary);
  text-decoration: none;
  transition: color var(--motion-duration-fast) ease;
}

.breadcrumb-item a:hover {
  color: var(--color-accent-primary);
}

.breadcrumb-item:last-child {
  color: var(--color-foreground-primary);
  font-weight: var(--font-weight-medium);
}
```

## Focus Management

### Focus Trap

```typescript
function trapFocus(container: HTMLElement) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  container.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  });

  firstFocusable.focus();
}
```

### Skip Link

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--spacing-4);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
  border-radius: var(--radius-md);
  z-index: var(--z-index-popover);
  transition: top var(--motion-duration-fast) ease;
}

.skip-link:focus {
  top: var(--spacing-4);
}
```

## Responsive Navigation Checklist

- [ ] Mobile: Bottom tab bar with 72px height + safe area
- [ ] Mobile: Touch targets minimum 44x44px
- [ ] Tablet: Rail navigation (72px width)
- [ ] Desktop: Persistent sidebar (240px width)
- [ ] All: Current route visually indicated
- [ ] All: Keyboard navigation support
- [ ] All: Focus management for modals/drawers
- [ ] All: ARIA labels for icon-only buttons
- [ ] All: Reduced motion support
