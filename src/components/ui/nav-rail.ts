/**
 * Navigation Rail Component (2026)
 * Token-driven rail navigation for tablet breakpoint (768-1023px).
 * Follows bottom-sheet.ts patterns with proper ARIA and keyboard support.
 */

import { announcer } from '../../utils/announcer';

export type NavRailRoute =
  | 'home'
  | 'starred'
  | 'create'
  | 'settings'
  | 'offline'
  | 'detail'
  | 'conflicts';

interface NavItem {
  route: NavRailRoute;
  label: string;
  testId: string;
}

const NAV_ITEMS: NavItem[] = [
  { route: 'home', label: 'Home', testId: 'nav-home' },
  { route: 'starred', label: 'Starred', testId: 'nav-starred' },
  { route: 'create', label: 'Create', testId: 'nav-create' },
  { route: 'conflicts', label: 'Conflicts', testId: 'nav-conflicts' },
  { route: 'offline', label: 'Offline', testId: 'nav-offline' },
  { route: 'settings', label: 'Settings', testId: 'settings-btn' },
];

export class NavRail {
  private container: HTMLElement | null = null;
  private abortController = new AbortController();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof document === 'undefined') return;
    this.container = document.querySelector('.rail-nav');
  }

  public render(route: NavRailRoute): string {
    const itemsHtml = NAV_ITEMS.map(
      (item) => `
      <button
        class="rail-item ${route === item.route ? 'active' : ''}"
        data-route="${item.route}"
        data-testid="${item.testId}"
        aria-label="${item.label}"
        ${route === item.route ? 'aria-current="page"' : ''}
      >
        <span class="rail-label">${item.label}</span>
      </button>
    `
    ).join('');

    return `
      <aside class="rail-nav" role="navigation" aria-label="Rail navigation">
        ${itemsHtml}
      </aside>
    `;
  }

  public updateActive(route: NavRailRoute): void {
    if (!this.container) return;

    const buttons = this.container.querySelectorAll('.rail-item');
    buttons.forEach((btn) => {
      const railButton = btn as HTMLButtonElement;
      const btnRoute = railButton.dataset.route as NavRailRoute;
      const isActive = btnRoute === route;

      railButton.classList.toggle('active', isActive);
      if (isActive) {
        railButton.setAttribute('aria-current', 'page');
      } else {
        railButton.removeAttribute('aria-current');
      }
    });

    announcer.announce(`Navigation rail updated for ${route}`);
  }

  public mount(element: HTMLElement, route: NavRailRoute): void {
    this.container = element;
    this.setupEventListeners();
    this.updateActive(route);
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    this.container.addEventListener(
      'keydown',
      (e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('rail-item')) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          (target as HTMLButtonElement).click();
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const buttons = Array.from(this.container!.querySelectorAll('.rail-item'));
          const currentIndex = buttons.indexOf(target);
          const nextIndex =
            e.key === 'ArrowDown'
              ? (currentIndex + 1) % buttons.length
              : (currentIndex - 1 + buttons.length) % buttons.length;
          (buttons[nextIndex] as HTMLButtonElement).focus();
        }
      },
      { signal: this.abortController.signal }
    );
  }

  public destroy(): void {
    this.abortController.abort();
  }
}

export const navRail = new NavRail();
