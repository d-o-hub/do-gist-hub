/**
 * Command Palette Component (2026)
 * Cmd+K searchable action interface.
 */

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

    this.container.replaceChildren();

    const searchDiv = document.createElement('div');
    searchDiv.className = 'command-palette-search';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Search commands...';
    input.spellcheck = false;
    input.autofocus = true;
    searchDiv.appendChild(input);
    this.container.appendChild(searchDiv);

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'command-palette-results';
    resultsDiv.setAttribute('role', 'listbox');
    resultsDiv.appendChild(this.buildResults());
    this.container.appendChild(resultsDiv);

    const footer = document.createElement('div');
    footer.className = 'command-palette-footer';
    for (const label of ['↑↓ to navigate', '↵ to select', 'esc to close']) {
      const span = document.createElement('span');
      span.textContent = label;
      footer.appendChild(span);
    }
    this.container.appendChild(footer);

    input.addEventListener(
      'input',
      (e) => this.handleSearch((e.target as HTMLInputElement).value),
      { signal: this.abortController.signal }
    );
    input.addEventListener('keydown', (e) => this.handleKeyDown(e), {
      signal: this.abortController.signal,
    });
  }

  private buildResults(): DocumentFragment {
    const frag = document.createDocumentFragment();

    if (this.filteredCommands.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No commands found';
      frag.appendChild(noResults);
      return frag;
    }

    let lastCategory = '';
    for (let index = 0; index < this.filteredCommands.length; index++) {
      const cmd = this.filteredCommands[index];
      if (!cmd) continue;

      if (cmd.category && cmd.category !== lastCategory) {
        const catHeader = document.createElement('div');
        catHeader.className = 'category-header';
        catHeader.textContent = cmd.category;
        frag.appendChild(catHeader);
        lastCategory = cmd.category;
      }

      const item = document.createElement('div');
      item.className = `command-item${index === this.selectedIndex ? ' selected' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === this.selectedIndex));
      item.dataset.index = String(index);

      const info = document.createElement('div');
      info.className = 'command-info';
      const title = document.createElement('div');
      title.className = 'command-title';
      title.textContent = cmd.title;
      info.appendChild(title);
      if (cmd.description) {
        const desc = document.createElement('div');
        desc.className = 'command-desc';
        desc.textContent = cmd.description;
        info.appendChild(desc);
      }
      item.appendChild(info);
      frag.appendChild(item);
    }

    return frag;
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
      resultsContainer.replaceChildren(this.buildResults());
    }
  }

  destroy(): void {
    this.abortController.abort();
    this.container?.remove();
  }
}

export const commandPalette = new CommandPalette();
