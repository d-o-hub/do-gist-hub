import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  destroyKeyboardShortcuts,
  getShortcuts,
  registerKeyboardShortcuts,
} from '../../src/utils/keyboard-shortcuts';

vi.mock('../../src/utils/announcer', () => ({
  announcer: { announce: vi.fn() },
}));

vi.mock('../../src/utils/focus-trap', () => ({
  focusTrap: {
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
}));

import { announcer } from '../../src/utils/announcer';
import { focusTrap } from '../../src/utils/focus-trap';

function press(
  key: string,
  opts?: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean }
): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      metaKey: opts?.metaKey,
      ctrlKey: opts?.ctrlKey,
      altKey: opts?.altKey,
    })
  );
}

describe('keyboard-shortcuts', () => {
  let controller: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AbortController();
    destroyKeyboardShortcuts();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    controller.abort();
    destroyKeyboardShortcuts();
    document.body.innerHTML = '';
  });

  describe('getShortcuts', () => {
    it('returns all defined shortcuts', () => {
      const shortcuts = getShortcuts();
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.map((s) => s.key)).toContain('/');
      expect(shortcuts.map((s) => s.key)).toContain('n');
      expect(shortcuts.map((s) => s.key)).toContain('?');
      expect(shortcuts.map((s) => s.key)).toContain('g→h');
      expect(shortcuts.map((s) => s.key)).toContain('g→s');
    });
  });

  describe('/ shortcut (focus search)', () => {
    it('focuses search input when / is pressed', () => {
      const input = document.createElement('input');
      input.id = 'gist-search';
      document.body.appendChild(input);

      registerKeyboardShortcuts(controller.signal);
      press('/');

      expect(document.activeElement).toBe(input);
      expect(vi.mocked(announcer).announce).toHaveBeenCalledWith('Search focused');
    });

    it('does nothing if search input is not present', () => {
      registerKeyboardShortcuts(controller.signal);
      expect(() => press('/')).not.toThrow();
    });
  });

  describe('n shortcut (new gist)', () => {
    it('dispatches app:navigate with create route', () => {
      const spy = vi.spyOn(window, 'dispatchEvent');
      registerKeyboardShortcuts(controller.signal);
      press('n');

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app:navigate',
          detail: { route: 'create' },
        })
      );
      spy.mockRestore();
    });

    it('uses custom navigate function when provided', () => {
      const navigateFn = vi.fn();
      registerKeyboardShortcuts(controller.signal, navigateFn);
      press('n');

      expect(navigateFn).toHaveBeenCalledWith('create');
      expect(vi.mocked(announcer).announce).toHaveBeenCalledWith('Creating new gist');
    });
  });

  describe('? shortcut (help modal)', () => {
    it('opens help modal when ? is pressed', () => {
      registerKeyboardShortcuts(controller.signal);
      press('?');

      const modal = document.querySelector('.keyboard-help-modal');
      expect(modal).not.toBeNull();
      expect(modal?.getAttribute('role')).toBe('dialog');
      expect(modal?.getAttribute('aria-label')).toBe('Keyboard shortcuts');
      expect(vi.mocked(focusTrap).activate).toHaveBeenCalled();
      expect(vi.mocked(announcer).announce).toHaveBeenCalledWith('Keyboard shortcuts opened');
    });

    it('closes help modal when ? is pressed again', () => {
      registerKeyboardShortcuts(controller.signal);
      press('?');
      press('?');

      expect(vi.mocked(focusTrap).deactivate).toHaveBeenCalled();
    });

    it('renders all shortcut sections in the modal', () => {
      registerKeyboardShortcuts(controller.signal);
      press('?');

      const sections = document.querySelectorAll('.keyboard-help-section');
      expect(sections.length).toBeGreaterThan(0);

      const kbdElements = document.querySelectorAll('.keyboard-help-modal kbd');
      expect(kbdElements.length).toBe(6);
    });

    it('closes on Escape', () => {
      registerKeyboardShortcuts(controller.signal);
      press('?');

      const modal = document.querySelector('.keyboard-help-modal') as HTMLElement;
      expect(modal?.getAttribute('popover')).toBe('manual');

      press('Escape');
      expect(vi.mocked(focusTrap).deactivate).toHaveBeenCalled();
    });

    it('closes when backdrop is clicked', () => {
      registerKeyboardShortcuts(controller.signal);
      press('?');

      const backdrop = document.querySelector('.keyboard-help-backdrop');
      expect(backdrop).not.toBeNull();
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(vi.mocked(focusTrap).deactivate).toHaveBeenCalled();
    });
  });

  describe('g h / g s shortcuts (Vim navigation)', () => {
    it('navigates to home on g then h', () => {
      const navigateFn = vi.fn();
      registerKeyboardShortcuts(controller.signal, navigateFn);

      press('g');
      press('h');

      expect(navigateFn).toHaveBeenCalledWith('home');
      expect(vi.mocked(announcer).announce).toHaveBeenCalledWith('Navigating to Home');
    });

    it('navigates to starred on g then s', () => {
      const navigateFn = vi.fn();
      registerKeyboardShortcuts(controller.signal, navigateFn);

      press('g');
      press('s');

      expect(navigateFn).toHaveBeenCalledWith('starred');
      expect(vi.mocked(announcer).announce).toHaveBeenCalledWith('Navigating to Starred');
    });

    it('ignores unknown second key after g', () => {
      const navigateFn = vi.fn();
      registerKeyboardShortcuts(controller.signal, navigateFn);

      press('g');
      press('x');

      expect(navigateFn).not.toHaveBeenCalled();
    });

    it('resets pending state after unknown second key', () => {
      const navigateFn = vi.fn();
      registerKeyboardShortcuts(controller.signal, navigateFn);

      press('g');
      press('x');
      press('g');
      press('h');

      expect(navigateFn).toHaveBeenCalledWith('home');
    });

    it('does not trigger navigation when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const navigateFn = vi.fn();
      registerKeyboardShortcuts(controller.signal, navigateFn);

      press('g');
      press('h');

      expect(navigateFn).not.toHaveBeenCalled();
    });
  });

  describe('input guard', () => {
    it('skips shortcuts when input is focused', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      const spy = vi.spyOn(window, 'dispatchEvent');
      registerKeyboardShortcuts(controller.signal);
      press('n');

      expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'app:navigate' }));
      spy.mockRestore();
    });

    it('skips shortcuts when textarea is focused', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.focus();

      const spy = vi.spyOn(window, 'dispatchEvent');
      registerKeyboardShortcuts(controller.signal);
      press('n');

      expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'app:navigate' }));
      spy.mockRestore();
    });

    it('skips shortcuts when meta key is held', () => {
      const spy = vi.spyOn(window, 'dispatchEvent');
      registerKeyboardShortcuts(controller.signal);
      press('n', { metaKey: true });

      expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'app:navigate' }));
      spy.mockRestore();
    });
  });

  describe('lifecycle', () => {
    it('cleans up on signal abort', () => {
      registerKeyboardShortcuts(controller.signal);
      controller.abort();

      const modal = document.querySelector('.keyboard-help-modal');
      expect(modal).toBeNull();
    });

    it('destroy cleans up pending state', () => {
      registerKeyboardShortcuts(controller.signal);
      press('g');
      destroyKeyboardShortcuts();

      const navigateFn = vi.fn();
      registerKeyboardShortcuts(controller.signal, navigateFn);
      press('h');

      expect(navigateFn).not.toHaveBeenCalled();
    });
  });
});
