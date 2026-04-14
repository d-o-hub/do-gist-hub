/**
 * Gist Edit Component
 * Renders edit form for existing gists
 */

import type { GistRecord } from '../services/db';
import { getGist } from '../services/db';
import gistStore from '../stores/gist-store';
import { toast } from './ui/toast';

/**
 * Escape HTML
 */
function esc(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render edit form HTML
 */
export function renderEditForm(gist: GistRecord): string {
  const filesHtml = Object.entries(gist.files)
    .map(
      ([key, file]) => `
    <div class="file-editor" data-file-key="${esc(key)}">
      <div class="file-header">
        <input type="text" class="filename-input" value="${esc(file.filename)}" placeholder="Filename" />
        <button type="button" class="remove-file-btn" ${Object.keys(gist.files).length <= 1 ? 'style="display: none;"' : ''}>×</button>
      </div>
      <textarea class="content-editor" placeholder="File content...">${esc(file.content || '')}</textarea>
    </div>
  `
    )
    .join('');

  return `
    <div class="route-edit" data-gist-id="${esc(gist.id)}">
      <div class="edit-header">
        <button class="back-btn" id="edit-back-btn" aria-label="Go back">← Back</button>
        <h2>Edit Gist</h2>
      </div>

      <form id="edit-gist-form" class="gist-form">
        <div class="form-group">
          <label for="edit-description">Description (optional)</label>
          <input type="text" id="edit-description" name="description" class="form-input" value="${esc(gist.description || '')}" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="edit-public" name="public" ${gist.public ? 'checked' : ''} /> Make public</label>
        </div>
        <div class="files-section" id="edit-files-section">
          <h3>Files</h3>
          ${filesHtml}
        </div>
        <button type="button" id="edit-add-file-btn" class="secondary-btn">+ Add File</button>
        <div class="form-actions">
          <button type="submit" class="primary-btn" id="edit-submit-btn">Save Changes</button>
          <button type="button" id="edit-cancel-btn" class="secondary-btn">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Bind edit form events
 */
export function bindEditEvents(container: HTMLElement, onBack: () => void): void {
  const gistId = (container.querySelector('.route-edit') as HTMLElement | null)?.dataset.gistId;

  // Back button
  container.querySelector('#edit-back-btn')?.addEventListener('click', onBack);

  // Cancel button
  container.querySelector('#edit-cancel-btn')?.addEventListener('click', onBack);

  // Add file button
  container.querySelector('#edit-add-file-btn')?.addEventListener('click', () => {
    const section = container.querySelector('#edit-files-section');
    if (!section) return;

    const editors = section.querySelectorAll('.file-editor');
    const hasEmptyKey = Array.from(editors).some((ed) => !(ed as HTMLElement).dataset.fileKey);

    if (hasEmptyKey) {
      toast.error('Please fill in the filename for the previous file');
      return;
    }

    const editor = document.createElement('div');
    editor.className = 'file-editor';
    editor.innerHTML = `
      <div class="file-header">
        <input type="text" class="filename-input" placeholder="Filename (e.g., example.js)" />
        <button type="button" class="remove-file-btn">×</button>
      </div>
      <textarea class="content-editor" placeholder="File content..."></textarea>
    `;
    editor.querySelector('.remove-file-btn')?.addEventListener('click', () => {
      if (section.querySelectorAll('.file-editor').length > 1) {
        editor.remove();
      } else {
        toast.error('At least one file is required');
      }
    });
    section.appendChild(editor);
  });

  // Remove file buttons (for existing files)
  container.querySelectorAll('.remove-file-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = container.querySelector('#edit-files-section');
      if (section && section.querySelectorAll('.file-editor').length > 1) {
        (btn as HTMLElement).closest('.file-editor')?.remove();
      } else {
        toast.error('At least one file is required');
      }
    });
  });

  // Form submission
  container.querySelector('#edit-gist-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!gistId) return;

    const btn = container.querySelector('#edit-submit-btn') as HTMLButtonElement | null;

    // Collect files
    const files: Record<string, string> = {};
    let valid = true;

    container.querySelectorAll('.file-editor').forEach((editor) => {
      const existingKey = (editor as HTMLElement).dataset.fileKey;
      const filename = (editor.querySelector('.filename-input') as HTMLInputElement)?.value.trim();
      const content = (editor.querySelector('.content-editor') as HTMLTextAreaElement)?.value || '';

      if (!filename) {
        valid = false;
        return;
      }

      // Use existing key if available, otherwise use filename
      files[existingKey || filename] = content;
    });

    if (!valid || Object.keys(files).length === 0) {
      toast.error('All files must have filenames');
      return;
    }

    const description =
      (container.querySelector('#edit-description') as HTMLInputElement)?.value.trim() || undefined;
    const public_ = (container.querySelector('#edit-public') as HTMLInputElement)?.checked ?? true;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    try {
      const result = await gistStore.updateGist(gistId, { description, public: public_, files });
      if (result) {
        toast.success('Gist updated successfully');
        onBack();
      } else {
        toast.error('Failed to update gist');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update gist');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
      }
    }
  });
}

/**
 * Load and render edit form for a gist
 */
export async function loadEditForm(
  gistId: string,
  container: HTMLElement,
  onBack: () => void
): Promise<void> {
  try {
    const gist = await getGist(gistId);

    if (!gist) {
      container.innerHTML = `
        <div class="error-state">
          <p>Gist not found</p>
          <button class="back-btn" id="edit-back-btn">← Back</button>
        </div>
      `;
      container.querySelector('#edit-back-btn')?.addEventListener('click', onBack);
      return;
    }

    container.innerHTML = renderEditForm(gist);
    container.setAttribute('data-gist-id', gist.id);
    bindEditEvents(container, onBack);
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <p>Failed to load gist: ${esc(err instanceof Error ? err.message : 'Unknown error')}</p>
        <button class="back-btn" id="edit-back-btn">← Back</button>
      </div>
    `;
    container.querySelector('#edit-back-btn')?.addEventListener('click', onBack);
  }
}
