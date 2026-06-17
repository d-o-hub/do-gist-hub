/**
 * Unit tests for Command Palette Component
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/utils/announcer', () => ({
  announcer: {
    announce: vi.fn(),
  },
}));

vi.mock('../../src/utils/focus-trap', () => ({
  focusTrap: {
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock('../../src/utils/view-transitions', () => ({
  withViewTransition: vi.fn(async (fn: () => void | Promise<void>) => {
    await fn();
  }),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { CommandPalette, commandPalette } from '../../src/components/ui/command-palette';
import { announcer } from '../../src/utils/announcer';
import { focusTrap } from '../../src/utils/focus-trap';

// ── Tests ─────────────────────────────────────────────────────────────

describe('CommandPalette', () => {
  let palette: CommandPalette;

  beforeEach(() => {
    vi.clearAllMocks();
    palette = new CommandPalette();
  });

  afterEach(() => {
    document.querySelectorAll('.command-palette').forEach((el) => {
      el.remove();
    });
  });

  // ── Constructor ─────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates container element with popover attribute', () => {
      const containers = document.querySelectorAll('.command-palette');
      expect(containers.length).toBeGreaterThanOrEqual(1);
      const container = containers[0];
      expect(container?.getAttribute('popover')).toBe('manual');
    });

    it('creates container with correct ARIA attributes', () => {
      const container = document.querySelector('.command-palette');
      expect(container?.getAttribute('role')).toBe('combobox');
      expect(container?.getAttribute('aria-expanded')).toBe('false');
      expect(container?.getAttribute('aria-haspopup')).toBe('listbox');
      expect(container?.getAttribute('data-testid')).toBe('command-palette');
    });
  });

  // ── setCommands ─────────────────────────────────────────────────────

  describe('setCommands', () => {
    it('stores commands and initializes filteredCommands', () => {
      const commands = [
        { id: '1', title: 'Home', action: vi.fn() },
        { id: '2', title: 'Settings', action: vi.fn() },
      ];

      palette.setCommands(commands);

      // Open to verify commands render
      void palette.open();
      const container = document.querySelector('.command-palette');
      expect(container?.innerHTML).toContain('Home');
      expect(container?.innerHTML).toContain('Settings');
    });

    it('handles empty commands array', () => {
      palette.setCommands([]);

      void palette.open();
      const container = document.querySelector('.command-palette');
      // When the commands list is empty AND the user hasn't searched,
      // the copy explains the situation instead of saying "no matches"
      // (which would imply the user did search).
      expect(container?.innerHTML).toContain('No commands available');
    });
  });

  // ── open / close ────────────────────────────────────────────────────

  describe('open', () => {
    it('invokes showPopover on container', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      const container = document.querySelector('.command-palette')!;
      const spy = vi.spyOn(container, 'showPopover');
      await palette.open();

      expect(spy).toHaveBeenCalled();
    });

    it('sets aria-expanded to true', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();

      const container = document.querySelector('.command-palette');
      expect(container?.getAttribute('aria-expanded')).toBe('true');
    });

    it('activates focus trap', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();

      expect(focusTrap.activate).toHaveBeenCalled();
    });

    it('announces palette opened', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();

      expect(announcer.announce).toHaveBeenCalledWith('Command palette opened');
    });

    it('is idempotent — does nothing when already open', async () => {
      palette.setCommands([{ id: '1', title: 'First', action: vi.fn() }]);
      await palette.open();
      await palette.open();

      expect(focusTrap.activate).toHaveBeenCalledTimes(1);
    });

    it('renders search input with autofocus', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();

      const container = document.querySelector('.command-palette');
      const input = container?.querySelector('input');
      expect(input).not.toBeNull();
      expect(input?.getAttribute('placeholder')).toBe('Search commands...');
    });

    it('renders footer with keyboard shortcuts', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();

      const container = document.querySelector('.command-palette');
      expect(container?.innerHTML).toContain('↑↓');
      expect(container?.innerHTML).toContain('esc');
    });
  });

  describe('close', () => {
    it('invokes hidePopover on container', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();
      const container = document.querySelector('.command-palette')!;
      const spy = vi.spyOn(container, 'hidePopover');
      await palette.close();

      expect(spy).toHaveBeenCalled();
    });

    it('sets aria-expanded to false', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();
      await palette.close();

      const container = document.querySelector('.command-palette');
      expect(container?.getAttribute('aria-expanded')).toBe('false');
    });

    it('deactivates focus trap', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();
      await palette.close();

      expect(focusTrap.deactivate).toHaveBeenCalled();
    });

    it('is idempotent — does nothing when already closed', async () => {
      await expect(palette.close()).resolves.toBeUndefined();
    });
  });

  // ── Search / Filtering ──────────────────────────────────────────────

  describe('search / filtering', () => {
    it('filters commands by title', async () => {
      const commands = [
        { id: '1', title: 'Home', action: vi.fn() },
        { id: '2', title: 'Settings', action: vi.fn() },
        { id: '3', title: 'Starred', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      expect(input).not.toBeNull();

      // Simulate typing "set" into the search input
      input!.value = 'set';
      input!.dispatchEvent(new Event('input'));

      const results = document.querySelector('.command-palette-results');
      expect(results?.innerHTML).toContain('Settings');
      expect(results?.innerHTML).not.toContain('Home');
      expect(results?.innerHTML).not.toContain('Starred');
    });

    it('filters commands by description', async () => {
      const commands = [
        { id: '1', title: 'Settings', description: 'Configure app preferences', action: vi.fn() },
        { id: '2', title: 'Home', description: 'View your gists', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.value = 'preferences';
      input!.dispatchEvent(new Event('input'));

      const results = document.querySelector('.command-palette-results');
      expect(results?.innerHTML).toContain('Settings');
      expect(results?.innerHTML).not.toContain('Home');
    });

    it('filters commands by category', async () => {
      const commands = [
        { id: '1', title: 'Create Gist', category: 'Actions', action: vi.fn() },
        { id: '2', title: 'Delete Gist', category: 'Actions', action: vi.fn() },
        { id: '3', title: 'Settings', category: 'Navigation', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.value = 'navigation';
      input!.dispatchEvent(new Event('input'));

      const results = document.querySelector('.command-palette-results');
      expect(results?.innerHTML).toContain('Settings');
      expect(results?.innerHTML).not.toContain('Create Gist');
    });

    it('shows the query in the no-results message when the search filters all commands', async () => {
      palette.setCommands([{ id: '1', title: 'Home', action: vi.fn() }]);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.value = 'zzzzz';
      input!.dispatchEvent(new Event('input'));

      const results = document.querySelector('.command-palette-results');
      // The "no results" message includes the user's query so they
      // understand what was searched, not just that nothing matched.
      expect(results?.innerHTML).toContain('No commands match "zzzzz"');
    });

    it('resets selection index after search', async () => {
      const commands = [
        { id: '1', title: 'Alpha', action: vi.fn() },
        { id: '2', title: 'Beta', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      // Navigate down to select Beta
      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      // Now search — selection should reset
      input!.value = 'alpha';
      input!.dispatchEvent(new Event('input'));

      // First item should be selected (index 0)
      const firstItem = document.querySelector('[data-index="0"]');
      expect(firstItem?.classList.contains('selected')).toBe(true);
    });
  });

  // ── Keyboard Navigation ─────────────────────────────────────────────

  describe('keyboard navigation', () => {
    it('ArrowDown selects next item', async () => {
      const commands = [
        { id: '1', title: 'First', action: vi.fn() },
        { id: '2', title: 'Second', action: vi.fn() },
        { id: '3', title: 'Third', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      const secondItem = document.querySelector('[data-index="1"]');
      expect(secondItem?.classList.contains('selected')).toBe(true);
    });

    it('ArrowUp selects previous item', async () => {
      const commands = [
        { id: '1', title: 'First', action: vi.fn() },
        { id: '2', title: 'Second', action: vi.fn() },
        { id: '3', title: 'Third', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      // Down twice, then up once
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      const secondItem = document.querySelector('[data-index="1"]');
      expect(secondItem?.classList.contains('selected')).toBe(true);
    });

    it('ArrowDown wraps to first item from last', async () => {
      const commands = [
        { id: '1', title: 'First', action: vi.fn() },
        { id: '2', title: 'Second', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      // Down to last (index 1), then down again wraps to first (index 0)
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

      const firstItem = document.querySelector('[data-index="0"]');
      expect(firstItem?.classList.contains('selected')).toBe(true);
    });

    it('ArrowUp wraps to last item from first', async () => {
      const commands = [
        { id: '1', title: 'First', action: vi.fn() },
        { id: '2', title: 'Second', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      const lastItem = document.querySelector('[data-index="1"]');
      expect(lastItem?.classList.contains('selected')).toBe(true);
    });

    it('Enter triggers selected command action', async () => {
      const action = vi.fn();
      const commands = [{ id: '1', title: 'First', action }];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(action).toHaveBeenCalled();
    });

    it('Enter closes palette after executing command', async () => {
      const action = vi.fn();
      const commands = [{ id: '1', title: 'First', action }];
      palette.setCommands(commands);
      await palette.open();

      const input = document.querySelector('.command-palette input') as HTMLInputElement;
      input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      const container = document.querySelector('.command-palette');
      expect(container?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  // ── Click Delegation ────────────────────────────────────────────────

  describe('click delegation', () => {
    it('executes command action when a command item is clicked', async () => {
      const action1 = vi.fn();
      const action2 = vi.fn();
      const commands = [
        { id: '1', title: 'Command 1', action: action1 },
        { id: '2', title: 'Command 2', action: action2 },
      ];
      palette.setCommands(commands);
      await palette.open();

      // Click the second command item
      const secondItem = document.querySelector('[data-index="1"]') as HTMLElement;
      secondItem?.click();

      expect(action2).toHaveBeenCalled();
    });

    it('closes palette after click on command', async () => {
      const commands = [{ id: '1', title: 'Test', action: vi.fn() }];
      palette.setCommands(commands);
      await palette.open();

      const item = document.querySelector('[data-index="0"]') as HTMLElement;
      item?.click();

      const container = document.querySelector('.command-palette');
      expect(container?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  // ── Global Shortcut ─────────────────────────────────────────────────

  describe('global shortcut', () => {
    it('opens on Cmd+K', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));

      await vi.waitFor(() => {
        const container = document.querySelector('.command-palette');
        expect(container?.getAttribute('aria-expanded')).toBe('true');
      });
    });

    it('opens on Ctrl+K', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

      await vi.waitFor(() => {
        const container = document.querySelector('.command-palette');
        expect(container?.getAttribute('aria-expanded')).toBe('true');
      });
    });

    it('closes on Escape', async () => {
      palette.setCommands([{ id: '1', title: 'Test', action: vi.fn() }]);
      await palette.open();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      await vi.waitFor(() => {
        const container = document.querySelector('.command-palette');
        expect(container?.getAttribute('aria-expanded')).toBe('false');
      });
    });
  });

  // ── Category Headers ────────────────────────────────────────────────

  describe('category headers', () => {
    it('renders category headers between different categories', async () => {
      const commands = [
        { id: '1', title: 'Create', category: 'Actions', action: vi.fn() },
        { id: '2', title: 'Delete', category: 'Actions', action: vi.fn() },
        { id: '3', title: 'Home', category: 'Navigation', action: vi.fn() },
      ];
      palette.setCommands(commands);
      await palette.open();

      const results = document.querySelector('.command-palette-results');
      const categoryHeaders = results?.querySelectorAll('.category-header');
      expect(categoryHeaders?.length).toBe(2);
    });
  });

  // ── Singleton ───────────────────────────────────────────────────────

  describe('singleton', () => {
    it('exports a default singleton instance', () => {
      expect(commandPalette).toBeInstanceOf(CommandPalette);
    });
  });
});
