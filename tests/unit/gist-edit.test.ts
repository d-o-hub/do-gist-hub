/**
 * Unit tests for Gist Edit Component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/db', () => ({
  getGist: vi.fn(),
}));

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/stores/gist-store', () => ({
  default: {
    updateGist: vi.fn(),
  },
}));

vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { renderEditForm, bindEditEvents, loadEditForm } from '../../src/components/gist-edit';
import { getGist } from '../../src/services/db';
import gistStore from '../../src/stores/gist-store';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeGist(id = 'gist-1', overrides: Record<string, unknown> = {}) {
  return {
    id,
    description: 'Test Gist',
    files: {
      'example.js': { filename: 'example.js', content: 'console.log("hello");', language: 'JavaScript' },
    },
    htmlUrl: `https://gist.github.com/${id}`,
    gitPullUrl: `https://api.github.com/gists/${id}/git/pull`,
    gitPushUrl: `https://api.github.com/gists/${id}/git/push`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    starred: false,
    public: true,
    syncStatus: 'synced',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('Gist Edit', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── renderEditForm ─────────────────────────────────────────────────

  describe('renderEditForm', () => {
    it('renders edit form with description and file editor', () => {
      const gist = makeGist();
      const html = renderEditForm(gist);

      expect(html).toContain('EDIT GIST');
      expect(html).toContain('Test Gist');
      expect(html).toContain('example.js');
      expect(html).toContain('console.log("hello");');
      expect(html).toContain('SAVE CHANGES');
      expect(html).toContain('+ ADD FILE');
    });

    it('renders multiple file editors for multi-file gists', () => {
      const gist = makeGist('gist-2', {
        files: {
          'a.js': { filename: 'a.js', content: '1' },
          'b.js': { filename: 'b.js', content: '2' },
          'c.js': { filename: 'c.js', content: '3' },
        },
      });
      const html = renderEditForm(gist);

      expect(html).toContain('a.js');
      expect(html).toContain('b.js');
      expect(html).toContain('c.js');
    });

    it('renders back button', () => {
      const gist = makeGist();
      const html = renderEditForm(gist);

      expect(html).toContain('← BACK');
    });

    it('renders hidden remove button for single-file gists', () => {
      const gist = makeGist();
      const html = renderEditForm(gist);

      // Single file gist should have hidden remove button
      expect(html).toContain('hidden');
    });

    it('renders visible remove buttons for multi-file gists', () => {
      const gist = makeGist('gist-3', {
        files: {
          'f1.js': { filename: 'f1.js' },
          'f2.js': { filename: 'f2.js' },
        },
      });
      const html = renderEditForm(gist);

      // Remove buttons should not be hidden (no hidden attr)
      expect(html).toContain('×');
      // But they appear twice (one per file)
      expect((html.match(/×/g) || []).length).toBe(2);
    });
  });

  // ── bindEditEvents ────────────────────────────────────────────────

  describe('bindEditEvents', () => {
    it('calls onBack when back button is clicked', () => {
      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist());
      bindEditEvents(container, onBack);

      const backBtn = container.querySelector('#edit-back-btn') as HTMLElement;
      expect(backBtn).not.toBeNull();
      backBtn?.click();

      expect(onBack).toHaveBeenCalled();
    });

    it('calls onBack when cancel button is clicked', () => {
      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist());
      bindEditEvents(container, onBack);

      const cancelBtn = container.querySelector('#edit-cancel-btn') as HTMLElement;
      expect(cancelBtn).not.toBeNull();
      cancelBtn?.click();

      expect(onBack).toHaveBeenCalled();
    });

    it('adds file editor when add file button is clicked', () => {
      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist());
      bindEditEvents(container, onBack);

      const addBtn = container.querySelector('#edit-add-file-btn') as HTMLElement;
      expect(addBtn).not.toBeNull();
      addBtn?.click();

      const editors = container.querySelectorAll('.file-editor');
      // should now have 2 file editors (original + new)
      expect(editors.length).toBe(2);
    });

    it('does not throw when no gist ID is present', () => {
      const onBack = vi.fn();
      container.innerHTML = '<div class="route-edit"></div>';

      expect(() => {
        bindEditEvents(container, onBack);
      }).not.toThrow();
    });

    it('submits form and updates gist', () => {
      vi.mocked(gistStore.updateGist).mockResolvedValue(true as never);

      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist('gist-update-1'));
      bindEditEvents(container, onBack);

      const form = container.querySelector('#edit-gist-form') as HTMLFormElement;
      expect(form).not.toBeNull();
      form?.dispatchEvent(new Event('submit'));

      // updateGist should be called with the correct gist ID
      expect(gistStore.updateGist).toHaveBeenCalledWith(
        'gist-update-1',
        expect.objectContaining({
          description: 'Test Gist',
          files: expect.objectContaining({ 'example.js': 'console.log("hello");' }),
        })
      );
    });

    it('removes a file editor when remove button is clicked with multiple editors', () => {
      const onBack = vi.fn();
      const gist = makeGist('multi-file', {
        files: {
          'f1.js': { filename: 'f1.js', content: 'a' },
          'f2.js': { filename: 'f2.js', content: 'b' },
        },
      });
      container.innerHTML = renderEditForm(gist);
      bindEditEvents(container, onBack);

      const removeBtns = container.querySelectorAll('.remove-file-btn');
      expect(removeBtns.length).toBe(2);

      // Click first remove button
      (removeBtns[0] as HTMLElement)?.click();

      const remainingEditors = container.querySelectorAll('.file-editor');
      expect(remainingEditors.length).toBe(1);
    });
  });

  // ── loadEditForm ──────────────────────────────────────────────────

  describe('loadEditForm', () => {
    it('renders edit form when gist is found', async () => {
      vi.mocked(getGist).mockResolvedValue(makeGist('gist-load-1') as never);

      const onBack = vi.fn();
      await loadEditForm('gist-load-1', container, onBack);

      expect(container.innerHTML).toContain('EDIT GIST');
      expect(container.innerHTML).toContain('Test Gist');
    });

    it('renders error state when gist is not found', async () => {
      vi.mocked(getGist).mockResolvedValue(undefined as never);

      const onBack = vi.fn();
      await loadEditForm('non-existent', container, onBack);

      expect(container.innerHTML).toContain('GIST NOT FOUND');
      expect(container.innerHTML).toContain('← BACK');
    });

    it('calls getGist with the correct gistId', async () => {
      vi.mocked(getGist).mockResolvedValue(makeGist('gist-verify') as never);

      await loadEditForm('gist-verify', container, vi.fn());

      expect(getGist).toHaveBeenCalledWith('gist-verify');
    });

    it('binds back button in error state', async () => {
      vi.mocked(getGist).mockResolvedValue(undefined as never);

      const onBack = vi.fn();
      await loadEditForm('not-found', container, onBack);

      const backBtn = container.querySelector('#edit-back-btn') as HTMLElement;
      expect(backBtn).not.toBeNull();
      backBtn?.click();

      expect(onBack).toHaveBeenCalled();
    });
  });

  // ── Form Validation ───────────────────────────────────────────────

  describe('form validation', () => {
    it('prevents submit when filename is empty', () => {
      vi.mocked(gistStore.updateGist).mockResolvedValue(true as never);

      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist('validate-1'));
      bindEditEvents(container, onBack);

      // Clear the filename
      const filenameInput = container.querySelector('.filename-input') as HTMLInputElement;
      if (filenameInput) {
        filenameInput.value = '';
      }

      const form = container.querySelector('#edit-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      // updateGist should NOT have been called because filename is empty
      expect(gistStore.updateGist).not.toHaveBeenCalled();
    });

    it('shows error when all filenames are empty', async () => {
      const { toast } = await import('../../src/components/ui/toast');
      vi.mocked(gistStore.updateGist).mockResolvedValue(true as never);

      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist('validate-2'));
      bindEditEvents(container, onBack);

      // Clear filename and content
      const filenameInput = container.querySelector('.filename-input') as HTMLInputElement;
      if (filenameInput) filenameInput.value = '';
      const contentInput = container.querySelector('.content-editor') as HTMLTextAreaElement;
      if (contentInput) contentInput.value = '';

      const form = container.querySelector('#edit-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('ALL FILES MUST HAVE FILENAMES');
      });
    });

    it('shows error toast when updateGist fails', async () => {
      const { toast } = await import('../../src/components/ui/toast');
      vi.mocked(gistStore.updateGist).mockRejectedValue(new Error('API error'));

      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist('update-fail-1'));
      bindEditEvents(container, onBack);

      const form = container.querySelector('#edit-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('FAILED TO UPDATE GIST');
      });
    });

    it('shows success toast and calls onBack on successful update', async () => {
      const { toast } = await import('../../src/components/ui/toast');
      vi.mocked(gistStore.updateGist).mockResolvedValue(true as never);

      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist('update-ok-1'));
      bindEditEvents(container, onBack);

      const form = container.querySelector('#edit-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('GIST UPDATED');
        expect(onBack).toHaveBeenCalled();
      });
    });
  });

  // ── File Removal Edge Cases ─────────────────────────────────────

  describe('file removal edge cases', () => {
    it('shows error when removing last file from dynamically added editor', async () => {
      const { toast } = await import('../../src/components/ui/toast');
      const onBack = vi.fn();
      container.innerHTML = renderEditForm(makeGist('edge-1'));
      bindEditEvents(container, onBack);

      // Click remove on the only file editor
      const removeBtn = container.querySelector('.remove-file-btn') as HTMLElement;
      expect(removeBtn).not.toBeNull();
      removeBtn?.click();

      // Toast error should be called since it's the only file
      expect(toast.error).toHaveBeenCalledWith('AT LEAST ONE FILE IS REQUIRED');
    });

    it('does nothing when add-file section is missing', () => {
      const onBack = vi.fn();
      container.innerHTML = '<div class="route-edit" data-gist-id="gist-x"><form id="edit-gist-form">';
      bindEditEvents(container, onBack);

      // Click add file button — no section, should not throw
      const addBtn = container.querySelector('#edit-add-file-btn') as HTMLElement;
      expect(() => addBtn?.click()).not.toThrow();
    });
  });

  // ── loadEditForm Error Path ──────────────────────────────────────

  describe('loadEditForm error path', () => {
    it('shows error toast and calls onBack when getGist throws', async () => {
      const { toast } = await import('../../src/components/ui/toast');
      vi.mocked(getGist).mockRejectedValue(new Error('DB error'));

      const onBack = vi.fn();
      await loadEditForm('error-gist', container, onBack);

      expect(toast.error).toHaveBeenCalledWith('FAILED TO LOAD GIST');
      expect(onBack).toHaveBeenCalled();
    });
  });

  // ── updateGist with filename change ─────────────────────────────

  describe('updateGist with changed filename', () => {
    it('uses new filename as key when creating a new file without fileKey', async () => {
      const { toast } = await import('../../src/components/ui/toast');
      vi.mocked(gistStore.updateGist).mockResolvedValue(true as never);

      const onBack = vi.fn();
      // Render with an existing file that has a known key
      container.innerHTML = renderEditForm(makeGist('rename-1'));
      bindEditEvents(container, onBack);

      // Remove the data-file-key attribute so the code falls through to the input value
      const editor = container.querySelector('.file-editor') as HTMLElement;
      if (editor) {
        editor.removeAttribute('data-file-key');
      }

      // Change filename
      const filenameInput = container.querySelector('.filename-input') as HTMLInputElement;
      if (filenameInput) {
        filenameInput.value = 'renamed.js';
      }

      const form = container.querySelector('#edit-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      await vi.waitFor(() => {
        expect(gistStore.updateGist).toHaveBeenCalledWith(
          'rename-1',
          expect.objectContaining({
            files: expect.objectContaining({ 'renamed.js': expect.any(String) }),
          })
        );
      });
    });
  });
});
