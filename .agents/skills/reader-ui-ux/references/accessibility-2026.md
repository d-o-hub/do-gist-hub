# Accessibility Patterns (2026)

Modern accessibility patterns for inclusive web applications.

## Core Principles

1. **Perceivable**: Information available to all senses
2. **Operable**: Interface works with keyboard, touch, voice, mouse
3. **Understandable**: Content clear, navigation consistent
4. **Robust**: Works with assistive technologies

## Focus Management

### Visible Focus Indicators

```css
/* Never remove focus indicators without replacement */
*:focus {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

/* Enhanced focus for interactive elements */
button:focus-visible,
a:focus-visible,
input:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--color-accent-subtle);
}

/* Custom focus for specific components */
.card:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--color-accent-primary),
    0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### Focus Traps

```typescript
class FocusTrap {
  private container: HTMLElement;
  private previousFocus: Element | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  activate() {
    this.previousFocus = document.activeElement;
    const focusable = this.getFocusableElements();
    focusable[0]?.focus();

    this.container.addEventListener("keydown", this.handleKeyDown);
  }

  deactivate() {
    this.container.removeEventListener("keydown", this.handleKeyDown);
    (this.previousFocus as HTMLElement)?.focus();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const focusable = this.getFocusableElements();
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  private getFocusableElements(): HTMLElement[] {
    return Array.from(
      this.container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
  }
}
```

### Skip Links

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<nav>...</nav>
<main id="main-content" tabindex="-1"></main>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--spacing-4);
  padding: var(--spacing-2) var(--spacing-4);
  background: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
  border-radius: var(--radius-md);
  z-index: 9999;
  transition: top 200ms ease;
}

.skip-link:focus {
  top: var(--spacing-4);
}
```

## ARIA Patterns

### Button States

```html
<!-- Icon-only button -->
<button aria-label="Close dialog">×</button>

<!-- Toggle button -->
<button aria-pressed="false" aria-label="Star gist">
  <span aria-hidden="true">☆</span>
</button>

<!-- Loading button -->
<button aria-busy="true" aria-label="Saving, please wait" disabled>
  <span class="spinner" aria-hidden="true"></span>
  Saving...
</button>
```

### Navigation Regions

```html
<header>
  <a href="#main" class="skip-link">Skip to content</a>
  <nav aria-label="Main navigation">
    <ul role="menubar">
      <li role="none">
        <a href="/" role="menuitem" aria-current="page">Home</a>
      </li>
    </ul>
  </nav>
</header>

<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li aria-current="page">Current Page</li>
  </ol>
</nav>

<main id="main" tabindex="-1">
  <h1>Page Title</h1>
</main>

<aside aria-label="Related content">
  <!-- Supplementary content -->
</aside>

<footer>
  <nav aria-label="Footer">
    <!-- Footer links -->
  </nav>
</footer>
```

### Live Regions

```typescript
class Announcer {
  private politeRegion: HTMLElement;
  private assertiveRegion: HTMLElement;

  constructor() {
    this.politeRegion = this.createRegion("polite");
    this.assertiveRegion = this.createRegion("assertive");
  }

  announce(message: string, priority: "polite" | "assertive" = "polite") {
    const region =
      priority === "assertive" ? this.assertiveRegion : this.politeRegion;

    region.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      region.textContent = "";
    }, 1000);
  }

  private createRegion(priority: string): HTMLElement {
    const region = document.createElement("div");
    region.setAttribute("aria-live", priority);
    region.setAttribute("aria-atomic", "true");
    region.className = "sr-only";
    document.body.appendChild(region);
    return region;
  }
}

// Usage
const announcer = new Announcer();
announcer.announce("5 gists loaded");
announcer.announce("Error saving gist", "assertive");
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Modal/Dialog

```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
>
  <h2 id="dialog-title">Confirm Delete</h2>
  <p id="dialog-desc">This action cannot be undone.</p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

### Disclosure (Collapsible Sections)

```html
<details>
  <summary aria-expanded="false" aria-controls="content-1">Settings</summary>
  <div id="content-1">
    <!-- Content -->
  </div>
</details>
```

### Tabs

```html
<div class="tabs">
  <div role="tablist" aria-label="Gist views">
    <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">
      Code
    </button>
    <button
      role="tab"
      aria-selected="false"
      aria-controls="panel-2"
      id="tab-2"
      tabindex="-1"
    >
      Preview
    </button>
  </div>

  <div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
    <!-- Code content -->
  </div>
  <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
    <!-- Preview content -->
  </div>
</div>
```

## Form Accessibility

### Labels

```html
<!-- Explicit association (preferred) -->
<label for="gist-description">Description</label>
<input id="gist-description" type="text" />

<!-- Implicit association -->
<label>
  Description
  <input type="text" />
</label>

<!-- ARIA labeling -->
<input aria-label="Gist description" type="text" />
<input aria-labelledby="description-label" type="text" />
<span id="description-label">Description</span>
```

### Error Messages

```html
<input
  aria-invalid="true"
  aria-describedby="description-error"
  id="gist-description"
/>
<span id="description-error" role="alert"> Description is required </span>
```

### Required Fields

```html
<label for="filename">
  Filename
  <span aria-label="required">*</span>
</label>
<input id="filename" required aria-required="true" />
```

### Fieldsets

```html
<fieldset>
  <legend>Visibility</legend>
  <label>
    <input type="radio" name="visibility" value="public" />
    Public
  </label>
  <label>
    <input type="radio" name="visibility" value="secret" />
    Secret
  </label>
</fieldset>
```

## Color and Contrast

### Contrast Requirements

| Element            | Ratio | Level |
| ------------------ | ----- | ----- |
| Normal text        | 4.5:1 | AA    |
| Large text (18pt+) | 3:1   | AA    |
| UI components      | 3:1   | AA    |
| Normal text        | 7:1   | AAA   |

### Don't Rely on Color Alone

```css
/* Bad: Only color indicates state */
.error {
  color: red;
}

/* Good: Color + icon + text */
.error {
  color: var(--color-status-error-fg);
  border-left: 3px solid var(--color-status-error-fg);
}
.error::before {
  content: "⚠️ ";
}
```

### High Contrast Mode Support

```css
@media (prefers-contrast: high) {
  .button {
    border: 2px solid currentColor;
  }

  .card {
    border: 1px solid;
  }

  .focus-ring {
    outline: 3px solid;
    outline-offset: 2px;
  }
}

/* Windows High Contrast Mode */
@media (forced-colors: active) {
  .button {
    border: 2px solid ButtonText;
  }

  .button:hover {
    background: Highlight;
    color: HighlightText;
  }
}
```

## Keyboard Shortcuts

```typescript
class KeyboardShortcuts {
  private shortcuts = new Map<string, () => void>();

  register(key: string, callback: () => void) {
    this.shortcuts.set(key.toLowerCase(), callback);
  }

  handleKeydown(e: KeyboardEvent) {
    const key = this.getKeyCombo(e);
    const callback = this.shortcuts.get(key);

    if (callback) {
      e.preventDefault();
      callback();
    }
  }

  private getKeyCombo(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push("ctrl");
    if (e.metaKey) parts.push("meta");
    if (e.altKey) parts.push("alt");
    if (e.shiftKey) parts.push("shift");
    parts.push(e.key.toLowerCase());
    return parts.join("+");
  }
}

// Usage
const shortcuts = new KeyboardShortcuts();
shortcuts.register("ctrl+k", () => openCommandPalette());
shortcuts.register("ctrl+s", () => saveGist());
shortcuts.register("?", () => showHelp());

document.addEventListener("keydown", (e) => shortcuts.handleKeydown(e));
```

### Shortcut Help Dialog

```html
<dialog aria-labelledby="shortcuts-title">
  <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
  <dl>
    <dt><kbd>Ctrl</kbd> + <kbd>K</kbd></dt>
    <dd>Open command palette</dd>
    <dt><kbd>Ctrl</kbd> + <kbd>S</kbd></dt>
    <dd>Save gist</dd>
    <dt><kbd>?</kbd></dt>
    <dd>Show this help</dd>
  </dl>
</dialog>
```

```css
kbd {
  display: inline-block;
  padding: var(--spacing-0-5) var(--spacing-2);
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
}
```

## Screen Reader Testing

### NVDA (Windows)

- Download: https://www.nvaccess.org/
- Key commands: Insert + F7 (elements list), Insert + Q (quit)

### VoiceOver (macOS)

- Enable: Cmd + F5
- Key commands: Ctrl + Option + U (rotor), Ctrl + Option + Right (next element)

### TalkBack (Android)

- Enable: Settings → Accessibility → TalkBack
- Navigation: Swipe right/left

### axe DevTools

Browser extension for automated accessibility testing.

## Accessibility Checklist

### Structure

- [ ] Single H1 per page
- [ ] Logical heading hierarchy (no skips)
- [ ] Landmark regions (header, nav, main, aside, footer)
- [ ] Skip link to main content

### Interactive Elements

- [ ] All buttons accessible by keyboard
- [ ] All links have visible focus
- [ ] Focus order is logical
- [ ] No keyboard traps
- [ ] Escape closes modals/drawers

### Forms

- [ ] All inputs have labels
- [ ] Error messages associated with inputs
- [ ] Required fields marked
- [ ] Fieldsets for grouped controls

### Visual

- [ ] Color contrast ≥ 4.5:1 for text
- [ ] Information not conveyed by color alone
- [ ] Focus indicators visible
- [ ] Text resizable to 200%

### Screen Readers

- [ ] ARIA labels on icon buttons
- [ ] Live regions for dynamic updates
- [ ] Status messages announced
- [ ] Decorative images hidden

### Motion

- [ ] Respects prefers-reduced-motion
- [ ] No auto-playing content without pause
- [ ] No flashing more than 3 times per second
