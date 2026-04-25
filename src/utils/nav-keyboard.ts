/**
 * Navigation Keyboard Handler
 * Provides arrow key, Home, End, and Escape navigation for nav menus.
 */

export class NavKeyboardHandler {
  private items: HTMLElement[] = [];
  private currentIndex = 0;
  private abortController: AbortController | null = null;

  constructor(container: HTMLElement) {
    this.items = Array.from(container.querySelectorAll('[role="menuitem"], [data-route]')).filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    );
    this.setupListeners(container);
  }

  private setupListeners(container: HTMLElement): void {
    const controller = new AbortController();
    this.abortController = controller;

    container.addEventListener(
      'keydown',
      (e) => {
        switch (e.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            e.preventDefault();
            this.focusItem(this.currentIndex + 1);
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            e.preventDefault();
            this.focusItem(this.currentIndex - 1);
            break;
          case 'Home':
            e.preventDefault();
            this.focusItem(0);
            break;
          case 'End':
            e.preventDefault();
            this.focusItem(this.items.length - 1);
            break;
        }
      },
      { signal: controller.signal }
    );

    // Track current index on focus
    this.items.forEach((item, index) => {
      item.addEventListener(
        'focus',
        () => {
          this.currentIndex = index;
        },
        { signal: controller.signal }
      );
    });
  }

  private focusItem(index: number): void {
    if (this.items.length === 0) return;
    if (index < 0) index = this.items.length - 1;
    if (index >= this.items.length) index = 0;
    this.currentIndex = index;
    const target = this.items[index];
    if (target) target.focus();
  }

  destroy(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.items = [];
  }
}
