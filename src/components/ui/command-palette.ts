/**
 * Command Palette Component (2026)
 * Cmd+K searchable action interface.
 */

import { sanitizeHtml } from '../../services/security';
import { announcer } from '../../utils/announcer';
import { focusTrap } from '../../utils/focus-trap';
import { withViewTransition } from '../../utils/view-transitions';

export interface Command {
  id: string;
  title: string;
  description?: string;
  action: () => void;
  category?: string;
}

export class CommandPalette {
  private container: HTMLElement | null = null;
  private commands: Command[] = [];
  private filteredCommands: Command[] = [];
  private selectedIndex = 0;
  private _isOpen = false;
  private abortController = new AbortController();

  constructor() {
    this.createElements();
    this.setupGlobalShortcut();
  }

  private get isOpen(): boolean {
    return this._isOpen;
  }

  private createElements(): void {
    if (typeof document === 'undefined') return;

    this.container = document.createElement('div');
    this.container.className = 'command-palette';
    this.container.setAttribute('data-testid', 'command-palette');
    this.container.setAttribute('role', 'combobox');
    this.container.setAttribute('aria-expanded', 'false');
    this.container.setAttribute('aria-haspopup', 'listbox');
    this.container.setAttribute('popover', 'manual');

    document.body.appendChild(this.container);

    this.container.addEventListener(
      'click',
      (e) => {
        const item = (e.target as HTMLElement).closest('.command-item');
        if (item) {
          const index = Number.parseInt(item.getAttribute('data-index') || '-1', 10);
          if (index >= 0 && this.filteredCommands[index]) {
            void this.filteredCommands[index].action();
            void this.close();
          }
        }
      },
      { signal: this.abortController.signal }
    );
  }

  private setupGlobalShortcut(): void {
    window.addEventListener(
      'keydown',
      (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          void this.open();
        }
        if (e.key === 'Escape' && this.isOpen) {
          void this.close();
        }
      },
      { signal: this.abortController.signal }
    );
  }

  setCommands(commands: Command[]): void {
    this.commands = commands;
    this.filteredCommands = commands;
  }

  async open(): Promise<void> {
    const container = this.container;
    if (!container || this._isOpen) return;

    this._isOpen = true;
    this.selectedIndex = 0;
    this.filteredCommands = this.commands;

    this.render();

    await withViewTransition(() => {
      container.showPopover();
      container.setAttribute('aria-expanded', 'true');
    });

    focusTrap.activate(container);
    announcer.announce('Command palette opened');
  }

  async close(): Promise<void> {
    const container = this.container;
    if (!container || !this._isOpen) return;

    focusTrap.deactivate();
    this._isOpen = false;

    await withViewTransition(() => {
      container.hidePopover();
      container.setAttribute('aria-expanded', 'false');
    });
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="command-palette-search">
        <input type="text" placeholder="Search commands..." spellcheck="false" autofocus />
      </div>
      <div class="command-palette-results" role="listbox">
        ${this.renderResults()}
      </div>
      <div class="command-palette-footer">
        <span><kbd>↑↓</kbd> to navigate</span>
        <span><kbd>↵</kbd> to select</span>
        <span><kbd>esc</kbd> to close</span>
      </div>
    `;

    const input = this.container.querySelector('input');
    input?.addEventListener(
      'input',
      (e) => this.handleSearch((e.target as HTMLInputElement).value),
      { signal: this.abortController.signal }
    );
    input?.addEventListener('keydown', (e) => this.handleKeyDown(e), {
      signal: this.abortController.signal,
    });
  }

  private renderResults(): string {
    if (this.filteredCommands.length === 0) {
      return '<div class="no-results">No commands found</div>';
    }

    let lastCategory = '';
    return this.filteredCommands
      .map((cmd, index) => {
        let categoryHeader = '';
        if (cmd.category && cmd.category !== lastCategory) {
          categoryHeader = `<div class="category-header">${sanitizeHtml(cmd.category)}</div>`;
          lastCategory = cmd.category;
        }

        return `
        ${categoryHeader}
        <div class="command-item ${index === this.selectedIndex ? 'selected' : ''}"
             role="option"
             aria-selected="${index === this.selectedIndex}"
             data-index="${index}">
          <div class="command-info">
            <div class="command-title">${sanitizeHtml(cmd.title)}</div>
            ${cmd.description ? `<div class="command-desc">${sanitizeHtml(cmd.description)}</div>` : ''}
          </div>
        </div>
      `;
      })
      .join('');
  }

  private handleSearch(query: string): void {
    const q = query.toLowerCase();
    this.filteredCommands = this.commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.category?.toLowerCase().includes(q)
    );
    this.selectedIndex = 0;
    this.updateResults();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % this.filteredCommands.length;
      this.updateResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex =
        (this.selectedIndex - 1 + this.filteredCommands.length) % this.filteredCommands.length;
      this.updateResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = this.filteredCommands[this.selectedIndex];
      if (cmd) {
        void cmd.action();
        void this.close();
      }
    }
  }

  private updateResults(): void {
    const resultsContainer = this.container?.querySelector('.command-palette-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = this.renderResults();
    }
  }

  destroy(): void {
    this.abortController.abort();
    this.container?.remove();
  }
}

export const commandPalette = new CommandPalette();
