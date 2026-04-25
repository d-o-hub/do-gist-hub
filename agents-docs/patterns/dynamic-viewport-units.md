# Pattern: Dynamic Viewport Units

## Context
Handling mobile browser address bar resizing.

## Good Pattern
Use `100dvh` for full-height containers to account for dynamic browser chrome.
```css
.app-shell {
  min-height: 100dvh;
}
```

## Bad Pattern
Using `100vh`, which doesn't account for the address bar on mobile devices, leading to bottom-docked elements (like bottom nav) being cut off or obscured.
