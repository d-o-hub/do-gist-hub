/**
 * Unit tests for Create Gist Route
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { render } from '../../src/routes/create';
import gistStore from '../../src/stores/gist-store';
import { toast } from '../../src/components/ui/toast';

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

    it('removes a file row when remove button is clicked', () => {
      render(container);

      // Add a second file first
      const addBtn = container.querySelector('#add-file-btn') as HTMLElement;
      addBtn?.click();

      // Now remove the first file
      const removeBtns = container.querySelectorAll('.btn-remove-file');
      expect(removeBtns.length).toBe(2);

      (removeBtns[0] as HTMLElement)?.click();

      const fileEntries = container.querySelectorAll('.file-entry');
      expect(fileEntries.length).toBe(1);
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

    it('shows error toast when filename is empty', () => {
      render(container);

      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      descInput.value = 'Test';

      // Clear filename
      const filenameInput = container.querySelector('.gist-filename') as HTMLInputElement;
      filenameInput.value = '';

      const form = container.querySelector('#create-gist-form') as HTMLFormElement;
      form?.dispatchEvent(new Event('submit'));

      expect(toast.error).toHaveBeenCalledWith('ALL FILES MUST HAVE A FILENAME');
      expect(gistStore.createGist).not.toHaveBeenCalled();
    });

    it('shows error toast for duplicate filenames', () => {
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

      expect(toast.error).toHaveBeenCalledWith('DUPLICATE FILENAME: dup.js');
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
        expect(toast.success).toHaveBeenCalledWith('GIST QUEUED FOR SYNC');
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
});
