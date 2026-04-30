/**
 * Bottom Sheet Component (2026)
 * Accessible mobile-first sheet for navigation and actions.
 */

import { focusTrap } from '../../utils/focus-trap';
import { announcer } from '../../utils/announcer';
import { withViewTransition } from '../../utils/view-transitions';
import { sanitizeHtml } from '../../services/security/dom';

export class BottomSheet {
  private container: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private isOpen = false;

  constructor() {
    this.createElements();
  }

  private createElements(): void {
    if (typeof document === 'undefined') return;

    this.backdrop = document.createElement('div');
    this.backdrop.className = 'bottom-sheet-backdrop';
    this.backdrop.onclick = () => this.close();

    this.container = document.createElement('div');
    this.container.className = 'bottom-sheet';
    this.container.setAttribute('role', 'dialog');
    this.container.setAttribute('aria-modal', 'true');
    this.container.setAttribute('aria-hidden', 'true');

    // Handle for dragging
    const handle = document.createElement('div');
    handle.className = 'bottom-sheet-handle';
    this.container.appendChild(handle);

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.container);
  }

  async open(content: string, title?: string): Promise<void> {
    if (!this.container || !this.backdrop || this.isOpen) return;

    this.isOpen = true;

    // Set content
    const header = title ? `<h2 class="bottom-sheet-title">${sanitizeHtml(title)}</h2>` : '';
    this.container.innerHTML = `
      <div class="bottom-sheet-handle"></div>
      ${header}
      <div class="bottom-sheet-content">${content}</div>
    `;

    // Escape key to close
    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void this.close();
      }
    };
    this.container.addEventListener('keydown', handleKeydown, { once: true });

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
}

export const bottomSheet = new BottomSheet();
