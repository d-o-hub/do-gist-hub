/**
 * Bottom Sheet Component (2026)
 * Accessible mobile-first sheet for navigation and actions.
 */

import { announcer } from '../../utils/announcer';
import { focusTrap } from '../../utils/focus-trap';
import { withViewTransition } from '../../utils/view-transitions';

export class BottomSheet {
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private isOpen = false;
  private abortController = new AbortController();

  constructor() {
    this.createElements();
  }

  private createElements(): void {
    if (typeof document === 'undefined') return;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'bottom-sheet-backdrop';
    this.backdrop.addEventListener('click', () => this.close(), {
      signal: this.abortController.signal,
    });

    this.container = document.createElement('div');
    this.container.className = 'bottom-sheet';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-modal', 'true');
    this.container.setAttribute('aria-hidden', 'true');

    const handle = document.createElement('div');
    handle.className = 'bottom-sheet-handle';
    this.container.appendChild(handle);

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.container);
  }

  async open(content: DocumentFragment, title?: string): Promise<void> {
    if (!this.container || !this.backdrop || this.isOpen) return;

    this.isOpen = true;

    this.container.replaceChildren();

    const handleDiv = document.createElement('div');
    handleDiv.className = 'bottom-sheet-handle';
    this.container.appendChild(handleDiv);

    if (title) {
      const h2 = document.createElement('h2');
      h2.className = 'bottom-sheet-title';
      h2.textContent = title;
      this.container.appendChild(h2);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'bottom-sheet-content';
    contentDiv.appendChild(content);
    this.container.appendChild(contentDiv);

    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void this.close();
      }
    };
    this.container.addEventListener('keydown', handleKeydown, {
      once: true,
      signal: this.abortController.signal,
    });

    await withViewTransition(() => {
      this.backdrop!.classList.add('visible');
      this.container!.classList.add('open');
      this.container!.setAttribute('aria-hidden', 'false');
    });

    focusTrap.activate(this.container);
    announcer.announce(title ? `Opened ${title} sheet` : 'Opened sheet');
  }

  async close(): Promise<void> {
    if (!this.container || !this.backdrop || !this.isOpen) return;

    focusTrap.deactivate();
    this.isOpen = false;

    await withViewTransition(() => {
      this.backdrop!.classList.remove('visible');
      this.container!.classList.remove('open');
      this.container!.setAttribute('aria-hidden', 'true');
    });
  }

  destroy(): void {
    this.abortController.abort();
    this.container?.remove();
    this.backdrop?.remove();
  }
}

export const bottomSheet = new BottomSheet();
