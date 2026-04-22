/**
 * Gist Edit Component
 * Redesigned for App Mode
 */

import type { GistRecord } from '../services/db';
import { getGist } from '../services/db';
import gistStore from '../stores/gist-store';
import { toast } from './ui/toast';
import { UpdateGistRequest } from '../types/api';
// import { customConfirm } from './app';

const esc = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export function renderEditForm(gist: GistRecord): string {
  const filesHtml = Object.entries(gist.files)
    .map(
      ([key, file]) => `
    <div class="file-editor glass-card" data-file-key="${esc(key)}" style="padding: var(--space-4); margin-bottom: var(--space-4);">
      <div class="form-group">
        <label class="form-label">FILENAME</label>
        <div style="display: flex; gap: var(--space-2);">
            <input type="text" class="form-input filename-input" value="${esc(file.filename)}" placeholder="example.js" />
            <button type="button" class="btn btn-danger remove-file-btn" ${Object.keys(gist.files).length <= 1 ? 'style="display: none;"' : ''}>×</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">CONTENT</label>
        <textarea class="form-textarea content-editor" placeholder="Enter content...">${esc(file.content || '')}</textarea>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <div class="route-edit" data-gist-id="${esc(gist.id)}">
      <header class="detail-header">
        <button class="btn btn-ghost" id="edit-back-btn">← BACK</button>
        <h1 class="detail-title">EDIT GIST</h1>
      </header>

      <form id="edit-gist-form" class="gist-form" style="padding: var(--space-6);">
        <div class="form-group">
          <label class="form-label">DESCRIPTION</label>
          <input type="text" id="edit-description" name="description" class="form-input" value="${esc(gist.description || '')}" />
        </div>

        <div class="files-section" id="edit-files-section">
          <div class="micro-label" style="margin-bottom: var(--space-2);">FILES</div>
          ${filesHtml}
        </div>

        <div style="display: flex; gap: var(--space-3); margin-top: var(--space-4);">
            <button type="button" id="edit-add-file-btn" class="btn btn-ghost">+ ADD FILE</button>
            <button type="submit" class="btn btn-primary" id="edit-submit-btn">SAVE CHANGES</button>
            <button type="button" id="edit-cancel-btn" class="btn btn-ghost">CANCEL</button>
        </div>
      </form>
    </div>
  `;
}

export function bindEditEvents(container: HTMLElement, onBack: () => void): void {
  const gistId = (container.querySelector('.route-edit') as HTMLElement | null)?.dataset.gistId;
  const deletedFileKeys = new Set<string>();

  container.querySelector('#edit-back-btn')?.addEventListener('click', onBack);
  container.querySelector('#edit-cancel-btn')?.addEventListener('click', onBack);

  container.querySelector('#edit-add-file-btn')?.addEventListener('click', () => {
    const section = container.querySelector('#edit-files-section');
    if (!section) return;
    const editor = document.createElement('div');
    editor.className = 'file-editor glass-card';
    editor.style.padding = 'var(--space-4)';
    editor.style.marginBottom = 'var(--space-4)';
    editor.innerHTML = `
      <div class="form-group">
        <label class="form-label">FILENAME</label>
        <div style="display: flex; gap: var(--space-2);">
            <input type="text" class="form-input filename-input" placeholder="example.js" />
            <button type="button" class="btn btn-danger remove-file-btn">×</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">CONTENT</label>
        <textarea class="form-textarea content-editor" placeholder="Enter content..."></textarea>
      </div>
    `;
    editor.querySelector('.remove-file-btn')?.addEventListener('click', () => {
      if (section.querySelectorAll('.file-editor').length > 1) editor.remove();
      else toast.error('AT LEAST ONE FILE IS REQUIRED');
    });
    section.appendChild(editor);
  });

  container.querySelectorAll('.remove-file-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = container.querySelector('#edit-files-section');
      const editor = (btn as HTMLElement).closest('.file-editor');
      if (section && section.querySelectorAll('.file-editor').length > 1 && editor) {
        const key = (editor as HTMLElement).dataset.fileKey;
        if (key) deletedFileKeys.add(key);
        editor.remove();
      } else {
        toast.error('AT LEAST ONE FILE IS REQUIRED');
      }
    });
  });

  container.querySelector('#edit-gist-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!gistId) return;

    const files: UpdateGistRequest['files'] = {};
    let valid = true;
    const editors = container.querySelectorAll('.file-editor');

    if (editors.length === 0) {
      toast.error('AT LEAST ONE FILE IS REQUIRED');
      return;
    }

    editors.forEach((editor) => {
      const existingKey = (editor as HTMLElement).dataset.fileKey;
      const filename = (editor.querySelector('.filename-input') as HTMLInputElement)?.value.trim();
      const content = (editor.querySelector('.content-editor') as HTMLTextAreaElement)?.value || '';
      if (!filename) {
        valid = false;
        return;
      }

      if (existingKey) {
        if (filename !== existingKey) {
          files[existingKey] = { filename, content };
        } else {
          files[existingKey] = { content };
        }
      } else {
        files[filename] = { content };
      }
    });

    if (!valid) {
      toast.error('ALL FILES MUST HAVE FILENAMES');
      return;
    }

    // Add deleted files
    deletedFileKeys.forEach((key) => {
      if (!(key in files)) {
        files[key] = null;
      }
    });

    const description = (
      container.querySelector('#edit-description') as HTMLInputElement
    )?.value.trim();

    try {
      const result = await gistStore.updateGist(gistId, { description, files });
      if (result) {
        toast.success('GIST UPDATED');
        onBack();
      }
    } catch {
      toast.error('FAILED TO UPDATE GIST');
    }
  });
}

export async function loadEditForm(
  gistId: string,
  container: HTMLElement,
  onBack: () => void
): Promise<void> {
  try {
    const gist = await getGist(gistId);
    if (!gist) {
      container.innerHTML =
        '<div class="error-state"><p>GIST NOT FOUND</p><button class="btn btn-ghost" id="edit-back-btn">← BACK</button></div>';
      container.querySelector('#edit-back-btn')?.addEventListener('click', onBack);
      return;
    }
    container.innerHTML = renderEditForm(gist);
    bindEditEvents(container, onBack);
  } catch {
    toast.error('FAILED TO LOAD GIST');
    onBack();
  }
}
