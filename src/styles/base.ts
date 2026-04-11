/**
 * Base Styles
 * Global resets and base element styles
 */

export const baseStyles = `
/* CSS Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--color-foreground-primary);
  background-color: var(--color-background-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

/* App Layout */
#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  background-color: var(--color-background-secondary);
  border-bottom: 1px solid var(--color-border-default);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header h1 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-foreground-primary);
}

.app-main {
  flex: 1;
  padding: var(--spacing-4);
  overflow-y: auto;
}

/* Navigation */
.main-nav {
  display: flex;
  gap: var(--spacing-2);
}

.nav-btn {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: transparent;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-foreground-secondary);
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-easing-ease-out);
}

.nav-btn:hover {
  background-color: var(--color-interactive-hover);
  color: var(--color-foreground-primary);
}

.nav-btn.active {
  background-color: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
}

/* Buttons */
button {
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
}

.back-btn {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: transparent;
  border: none;
  color: var(--color-accent-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
}

.back-btn:hover {
  text-decoration: underline;
}

/* Settings */
.settings-section {
  margin-bottom: var(--spacing-6);
  padding: var(--spacing-4);
  background-color: var(--color-background-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-default);
}

.settings-section h2 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-2);
  color: var(--color-foreground-primary);
}

.settings-section button {
  padding: var(--spacing-2) var(--spacing-4);
  background-color: var(--color-accent-primary);
  color: var(--color-foreground-inverse);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--motion-duration-fast) var(--motion-easing-ease-out);
}

.settings-section button:hover {
  opacity: 0.9;
}

/* Routes */
.route-home,
.route-gist-detail,
.route-create-edit,
.route-offline,
.route-settings {
  min-height: calc(100vh - var(--spacing-20));
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .app-header {
    padding: var(--spacing-3);
  }

  .app-main {
    padding: var(--spacing-3);
  }

  .nav-btn {
    padding: var(--spacing-2);
    font-size: var(--font-size-sm);
  }
}

@media (min-width: 768px) {
  .app-header h1 {
    font-size: var(--font-size-xl);
  }
}
`;

/**
 * Inject base styles into document
 */
export function injectBaseStyles(): void {
  const existingStyle = document.getElementById('base-styles');
  if (existingStyle) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'base-styles';
  styleElement.textContent = baseStyles;
  document.head.appendChild(styleElement);
}
