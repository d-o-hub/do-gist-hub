/**
 * Screen Reader Announcer (2026)
 * ARIA live region announcements for dynamic content
 */

export class Announcer {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.politeRegion = this.createRegion('polite');
      this.assertiveRegion = this.createRegion('assertive');
    }
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;

    if (!region) return;

    // Clear previous content and set new message
    region.textContent = '';

    // Use requestAnimationFrame for better screen reader support
    requestAnimationFrame(() => {
      region.textContent = message;
    });

    // Clear after announcement (screen readers typically announce within 1s)
    setTimeout(() => {
      region.textContent = '';
    }, 1000);
  }

  /**
   * Announce success message
   */
  success(message: string): void {
    this.announce(`Success: ${message}`, 'polite');
  }

  /**
   * Announce error message (assertive)
   */
  error(message: string): void {
    this.announce(`Error: ${message}`, 'assertive');
  }

  /**
   * Announce loading state
   */
  loading(message: string = 'Loading'): void {
    this.announce(`${message}...`, 'polite');
  }

  private createRegion(priority: string): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
    return region;
  }
}

/**
 * Singleton instance
 */
export const announcer = new Announcer();
