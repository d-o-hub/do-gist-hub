/**
 * Unit tests for Create Gist Route
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../src/stores/gist-store', () => ({
  default: {
    createGist: vi.fn(),
  },
}));

vi.mock('../../src/services/gist-paste-parser', () => ({
  parsePasteText: vi.fn(),
}));

vi.mock('../../src/services/llm/client', () => ({
  generateDescription: vi.fn(),
  loadLLMConfig: vi.fn().mockResolvedValue({ enabled: false }),
  splitIntoFiles: vi.fn(),
}));

vi.mock('../../src/services/lifecycle', () => ({
  lifecycle: {
    getRouteSignal: vi.fn(() => new AbortController().signal),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { toast } from '../../src/components/ui/toast';
import { render } from '../../src/routes/create';
import { parsePasteText } from '../../src/services/gist-paste-parser';
import gistStore from '../../src/stores/gist-store';

// ── Tests ─────────────────────────────────────────────────────────────

describe('Create Route', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── render ─────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders the create gist form', () => {
      render(container);

      expect(container.innerHTML).toContain('Create New Gist');
      expect(container.querySelector('#create-gist-form')).not.toBeNull();
      expect(container.querySelector('#gist-description')).not.toBeNull();
      expect(container.querySelector('#gist-public')).not.toBeNull();
      expect(container.querySelector('#add-file-btn')).not.toBeNull();
      expect(container.querySelector('#files-container')).not.toBeNull();
    });

    it('renders an initial file row', () => {
      render(container);

      const fileEntries = container.querySelectorAll('.file-entry');
      expect(fileEntries.length).toBe(1);
    });
  });

  // ── file management ─────────────────────────────────────────────────

  describe('file management', () => {
    it('adds a new file row when add file button is clicked', () => {
      render(container);

      const addBtn = container.querySelector('#add-file-btn') as HTMLElement;
      addBtn?.click();

      const fileEntries = container.querySelectorAll('.file-entry');
      expect(fileEntries.length).toBe(2);
    });

    it('removes a file row when remove button is clicked', async () => {
      render(container);

      // Add a second file first
      const addBtn = container.querySelector('#add-file-btn') as HTMLElement;
      addBtn?.click();

      // Now remove the first file. The row is animated out (150ms
      // fade + lift) before being removed from the DOM, with a
      // 250ms safety timeout as fallback. Advance fake timers to
      // resolve the leave animation.
      vi.useFakeTimers();
      try {
        const removeBtns = container.querySelectorAll('.btn-remove-file');
        expect(removeBtns.length).toBe(2);

        (removeBtns[0] as HTMLElement)?.click();
        vi.advanceTimersByTime(300);

        const fileEntries = container.querySelectorAll('.file-entry');
        expect(fileEntries.length).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not remove last file entry', () => {
      render(container);

      const removeBtn = container.querySelector('.btn-remove-file') as HTMLElement;
      removeBtn?.click();

      // Should still have 1 file entry
      const fileEntries = container.querySelectorAll('.file-entry');
      expect(fileEntries.length).toBe(1);

      // Should show error toast
      expect(toast.error).toHaveBeenCalledWith('AT LEAST ONE FILE REQUIRED');
    });

    it('hides remove button when only one file entry exists', () => {
      render(container);

      const removeBtn = container.querySelector('.btn-remove-file') as HTMLElement;
      expect(removeBtn?.style.display).toBe('none');
    });

    it('shows remove buttons when multiple file entries exist', () => {
      render(container);

      const addBtn = container.querySelector('#add-file-btn') as HTMLElement;
      addBtn?.click();

      const removeBtns = container.querySelectorAll('.btn-remove-file');
      removeBtns.forEach((btn) => {
        expect((btn as HTMLElement).style.display).toBe('inline-flex');
      });
    });
  });

  // ── form submission ─────────────────────────────────────────────────

  describe('form submission', () => {
    it('creates gist on submit with valid data', () => {
      vi.mocked(gistStore.createGist).mockResolvedValue(true as never);

      render(container);

      // Fill in description
      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      descInput.value = 'Test Gist';

      // Fill in filename and content
      const filenameInput = container.querySelector('.gist-filename') as HTMLInputElement;
      filenameInput.value = 'test.js';
      const contentInput = container.querySelector('.gist-content') as HTMLTextAreaElement;
      contentInput.value = 'console.log("hello");';

      // Submit form
      const form = container.querySelector('#create-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      expect(gistStore.createGist).toHaveBeenCalledWith(
        'Test Gist',
        true,
        expect.objectContaining({ 'test.js': 'console.log("hello");' })
      );
    });

    it('shows inline error when filename is empty', () => {
      render(container);

      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      descInput.value = 'Test';

      // Clear filename
      const filenameInput = container.querySelector('.gist-filename') as HTMLInputElement;
      filenameInput.value = '';

      const form = container.querySelector('#create-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      // Inline error: aria-invalid set on input, .form-error message rendered.
      expect(filenameInput.getAttribute('aria-invalid')).toBe('true');
      const errorEl = container.querySelector('.form-error');
      expect(errorEl?.textContent).toContain('Filename is required');
      expect(gistStore.createGist).not.toHaveBeenCalled();
    });

    it('shows inline error for duplicate filenames', () => {
      render(container);

      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      descInput.value = 'Test';

      // Add a second file with same name
      const addBtn = container.querySelector('#add-file-btn') as HTMLElement;
      addBtn?.click();

      // Set same filename on both
      const filenameInputs = container.querySelectorAll('.gist-filename');
      (filenameInputs[0] as HTMLInputElement).value = 'dup.js';
      (filenameInputs[1] as HTMLInputElement).value = 'dup.js';

      const contentInputs = container.querySelectorAll('.gist-content');
      (contentInputs[0] as HTMLTextAreaElement).value = 'content1';
      (contentInputs[1] as HTMLTextAreaElement).value = 'content2';

      const form = container.querySelector('#create-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      // The second (duplicate) filename input is flagged. The first
      // one was already accepted before the collision was detected.
      const invalidInputs = container.querySelectorAll('[aria-invalid="true"]');
      expect(invalidInputs.length).toBe(1);
      expect((invalidInputs[0] as HTMLInputElement).value).toBe('dup.js');
      const errorEl = container.querySelector('.form-error');
      expect(errorEl?.textContent).toContain('Duplicate filename: dup.js');
      expect(gistStore.createGist).not.toHaveBeenCalled();
    });

    it('navigates to home on successful create', async () => {
      vi.mocked(gistStore.createGist).mockResolvedValue(true as never);

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(container);

      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      descInput.value = 'Test';
      const filenameInput = container.querySelector('.gist-filename') as HTMLInputElement;
      filenameInput.value = 'file.js';
      const contentInput = container.querySelector('.gist-content') as HTMLTextAreaElement;
      contentInput.value = 'content';

      const form = container.querySelector('#create-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(dispatchSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'app:navigate',
            detail: { route: 'home' },
          })
        );
      });
    });

    it('shows queued message when offline', async () => {
      vi.mocked(gistStore.createGist).mockResolvedValue(false as never);
      // Simulate offline state
      const { default: networkMonitor } = await import(
        '../../src/services/network/offline-monitor'
      );
      vi.spyOn(networkMonitor, 'isOnline').mockReturnValue(false);

      render(container);

      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      descInput.value = 'Offline';
      const filenameInput = container.querySelector('.gist-filename') as HTMLInputElement;
      filenameInput.value = 'off.js';
      const contentInput = container.querySelector('.gist-content') as HTMLTextAreaElement;
      contentInput.value = 'data';

      const form = container.querySelector('#create-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          'GIST QUEUED, WILL SYNC WHEN YOU ARE BACK ONLINE',
          5000
        );
      });
    });
  });

  // ── form visibility ─────────────────────────────────────────────────

  describe('form visibility', () => {
    it('has public checkbox checked by default', () => {
      render(container);

      const publicCheckbox = container.querySelector('#gist-public') as HTMLInputElement;
      expect(publicCheckbox?.checked).toBe(true);
    });

    it('renders CREATE GIST submit button', () => {
      render(container);

      const submitBtn = container.querySelector('button[type="submit"]') as HTMLElement;
      expect(submitBtn).not.toBeNull();
      expect(submitBtn?.textContent).toContain('CREATE GIST');
    });
  });

  // ── paste zone ──────────────────────────────────────────────────────

  describe('paste zone', () => {
    it('shows error when parse paste is clicked with empty input', () => {
      render(container);

      const parseBtn = container.querySelector('#parse-paste-btn') as HTMLElement;
      parseBtn?.click();

      expect(toast.error).toHaveBeenCalledWith('PASTE TEXT FIRST');
    });

    it('renders AI parse as disabled with a visible reason hint', async () => {
      // Default LLM config: not enabled (mocked in the test setup).
      render(container);

      // Let the loadLLMConfig() init promise resolve so the button
      // state is finalized.
      await new Promise((r) => setTimeout(r, 0));

      const aiParseBtn = container.querySelector('#ai-parse-btn') as HTMLButtonElement;
      expect(aiParseBtn.disabled).toBe(true);
      expect(aiParseBtn.getAttribute('aria-describedby')).toBe('ai-parse-hint');

      const hint = container.querySelector('#ai-parse-hint') as HTMLElement;
      expect(hint).not.toBeNull();
      // Hint must be visible (not hidden), so the user can see why
      // the button is disabled without hovering.
      expect(hint.hidden).toBe(false);
    });

    it('parses paste text and populates file entries', () => {
      vi.mocked(parsePasteText).mockReturnValue({
        files: [
          { filename: 'a.js', content: 'aaa' },
          { filename: 'b.js', content: 'bbb' },
        ],
        suggestedDescription: 'My Gist',
      });

      render(container);

      const pasteInput = container.querySelector('#paste-input') as HTMLTextAreaElement;
      pasteInput.value = '--- a.js ---\naaa\n--- b.js ---\nbbb';

      const parseBtn = container.querySelector('#parse-paste-btn') as HTMLElement;
      parseBtn?.click();

      const entries = container.querySelectorAll('.file-entry');
      expect(entries.length).toBe(2);

      const filenames = Array.from(
        container.querySelectorAll<HTMLInputElement>('.gist-filename')
      ).map((i) => i.value);
      expect(filenames).toEqual(['a.js', 'b.js']);

      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      expect(descInput.value).toBe('My Gist');

      expect(toast.success).toHaveBeenCalledWith('PARSED 2 FILES');
    });

    it('shows error when paste parser finds no files', () => {
      vi.mocked(parsePasteText).mockReturnValue({
        files: [],
      });

      render(container);

      const pasteInput = container.querySelector('#paste-input') as HTMLTextAreaElement;
      pasteInput.value = 'random text';

      const parseBtn = container.querySelector('#parse-paste-btn') as HTMLElement;
      parseBtn?.click();

      expect(toast.error).toHaveBeenCalledWith('NO FILES DETECTED IN PASTE');
    });

    it('does not overwrite existing description on paste parse', () => {
      vi.mocked(parsePasteText).mockReturnValue({
        files: [{ filename: 'x.js', content: 'x' }],
        suggestedDescription: 'Suggested',
      });

      render(container);

      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      descInput.value = 'My Description';

      const pasteInput = container.querySelector('#paste-input') as HTMLTextAreaElement;
      pasteInput.value = '--- x.js ---\nx';

      const parseBtn = container.querySelector('#parse-paste-btn') as HTMLElement;
      parseBtn?.click();

      expect(descInput.value).toBe('My Description');
    });
  });

  // ── loading state ──────────────────────────────────────────────────

  describe('loading state', () => {
    it('sets submit button to busy state during creation', async () => {
      let resolveCreate: (v: boolean) => void;
      vi.mocked(gistStore.createGist).mockReturnValue(
        new Promise((r) => {
          resolveCreate = r;
        }) as never
      );

      render(container);

      const filenameInput = container.querySelector('.gist-filename') as HTMLInputElement;
      filenameInput.value = 'test.js';
      const contentInput = container.querySelector('.gist-content') as HTMLTextAreaElement;
      contentInput.value = 'data';

      const form = container.querySelector('#create-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      // Wait a tick for the async handler
      await vi.waitFor(() => {
        const submitBtn = container.querySelector<HTMLButtonElement>('[type="submit"]');
        expect(submitBtn?.disabled).toBe(true);
        expect(submitBtn?.getAttribute('aria-busy')).toBe('true');
      });

      // Resolve to avoid hanging
      resolveCreate?.(true);
    });
  });
});
