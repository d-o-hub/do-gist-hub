/**
 * Focus Trap Utility (2026)
 * Manages focus within a container for accessibility
 */

export class FocusTrap {
  private container: HTMLElement | null = null;
  private previousFocus: Element | null = null;
  private abortController: AbortController | null = null;

  /**
   * Activate focus trap within container
   */
  activate(container: HTMLElement): void {
    this.deactivate();
    this.container = container;
    this.previousFocus = document.activeElement;
    this.abortController = new AbortController();

    const focusable = this.getFocusableElements();
    if (focusable.length > 0) {
      focusable[0]?.focus();
    }

    container.addEventListener('keydown', this.handleKeyDown, {
      signal: this.abortController.signal,
    });
  }

  /**
   * Deactivate focus trap and restore previous focus
   */
  deactivate(): void {
    this.abortController?.abort();
    this.abortController = null;

    if (this.previousFocus instanceof HTMLElement) {
      this.previousFocus.focus();
    }

    this.container = null;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab' || !this.container) return;

    const focusable = this.getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first && last) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last && first) {
      e.preventDefault();
      first.focus();
    }
  };

  private getFocusableElements(): HTMLElement[] {
    if (!this.container) return [];

    return Array.from(
      this.container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el): el is HTMLElement => {
      if (!(el instanceof HTMLElement)) return false;
      if (el.hasAttribute('hidden')) return false;
      if (el.offsetParent === null) return false;
      if ('disabled' in el && (el as HTMLButtonElement).disabled) return false;
      return true;
    });
  }
}

/**
 * Singleton instance for app-wide use
 */
export const focusTrap = new FocusTrap();
