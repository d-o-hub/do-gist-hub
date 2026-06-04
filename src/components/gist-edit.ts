/**
 * Gist Edit Component
 * Redesigned for App Mode
 */

import type { GistRecord } from '../services/db';
import { getGist } from '../services/db';
import { sanitizeHtml } from '../services/security/dom';
import gistStore from '../stores/gist-store';
import { toast } from './ui/toast';
// import { customConfirm } from './app';

export function renderEditForm(gist: GistRecord): string {
  const filesHtml = Object.entries(gist.files)
    .map(
      ([key, file]) => `
    <div class="file-editor glass-card file-editor-p file-editor-mb" data-file-key="${sanitizeHtml(key)}">
      <div class="form-group">
        <label class="form-label">FILENAME</label>
        <div class="flex-row gap-2">
            <input type="text" class="form-input filename-input" value="${sanitizeHtml(file.filename)}" placeholder="example.js" />
            <button type="button" class="btn btn-danger remove-file-btn" ${Object.keys(gist.files).length <= 1 ? 'hidden' : ''}>×</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">CONTENT</label>
        <textarea class="form-textarea content-editor" placeholder="Enter content...">${sanitizeHtml(file.content || '')}</textarea>
      </div>
    </div>
  `
    )
    .join('');

  return `
    <div class="route-edit" data-gist-id="${sanitizeHtml(gist.id)}">
      <header class="detail-header">
        <button class="btn btn-ghost" id="edit-back-btn">← BACK</button>
        <h1 class="detail-title">EDIT GIST</h1>
      </header>

      <form id="edit-gist-form" class="gist-form edit-form-p">
        <div class="form-group">
          <label class="form-label">DESCRIPTION</label>
          <input type="text" id="edit-description" name="description" class="form-input" value="${sanitizeHtml(gist.description || '')}" />
        </div>

        <div class="files-section" id="edit-files-section">
          <div class="micro-label mb-2">FILES</div>
          ${filesHtml}
        </div>

        <div class="edit-actions">
            <button type="button" id="edit-add-file-btn" class="btn btn-ghost">+ ADD FILE</button>
            <button type="submit" class="btn btn-primary" id="edit-submit-btn">SAVE CHANGES</button>
            <button type="button" id="edit-cancel-btn" class="btn btn-ghost">CANCEL</button>
        </div>
      </form>
    </div>
  `;
}

export function bindEditEvents(
  container: HTMLElement,
  onBack: () => void,
  signal?: AbortSignal
): void {
  const gistId = (container.querySelector('.route-edit') as HTMLElement | null)?.dataset.gistId;

  container.querySelector('#edit-back-btn')?.addEventListener('click', onBack, { signal });
  container.querySelector('#edit-cancel-btn')?.addEventListener('click', onBack, { signal });

  container.querySelector('#edit-add-file-btn')?.addEventListener(
    'click',
    () => {
      const section = container.querySelector('#edit-files-section');
      if (!section) return;
      const editor = document.createElement('div');
      editor.className = 'file-editor glass-card file-editor-p file-editor-mb';
      editor.innerHTML = `
      <div class="form-group">
        <label class="form-label">FILENAME</label>
        <div class="flex-row gap-2">
            <input type="text" class="form-input filename-input" placeholder="example.js" />
            <button type="button" class="btn btn-danger remove-file-btn">×</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">CONTENT</label>
        <textarea class="form-textarea content-editor" placeholder="Enter content..."></textarea>
      </div>
    `;
      editor.querySelector('.remove-file-btn')?.addEventListener(
        'click',
        () => {
          if (section.querySelectorAll('.file-editor').length > 1) editor.remove();
          else toast.error('AT LEAST ONE FILE IS REQUIRED');
        },
        { signal }
      );
      section.appendChild(editor);
    },
    { signal }
  );

  container.querySelectorAll('.remove-file-btn').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        const section = container.querySelector('#edit-files-section');
        if (section && section.querySelectorAll('.file-editor').length > 1) {
          (btn as HTMLElement).closest('.file-editor')?.remove();
        } else {
          toast.error('AT LEAST ONE FILE IS REQUIRED');
        }
      },
      { signal }
    );
  });

  container.querySelector('#edit-gist-form')?.addEventListener(
    'submit',
    (e) => {
      void (async () => {
        e.preventDefault();
        if (!gistId) return;

        const files: Record<string, string> = {};
        let valid = true;
        container.querySelectorAll('.file-editor').forEach((editor) => {
          const existingKey = (editor as HTMLElement).dataset.fileKey;
          const filename = (
            editor.querySelector('.filename-input') as HTMLInputElement
          )?.value.trim();
          const content =
            (editor.querySelector('.content-editor') as HTMLTextAreaElement)?.value || '';
          if (!filename) {
            valid = false;
            return;
          }
          files[existingKey || filename] = content;
        });

        if (!valid || Object.keys(files).length === 0) {
          toast.error('ALL FILES MUST HAVE FILENAMES');
          return;
        }

        const description = (
          container.querySelector('#edit-description') as HTMLInputElement
        )?.value.trim();

        try {
          const result = await gistStore.updateGist(gistId, { description, files });
          if (signal?.aborted) return;
          if (result) {
            toast.success('GIST UPDATED');
            onBack();
          }
        } catch {
          toast.error('FAILED TO UPDATE GIST');
        }
      })();
    },
    { signal }
  );
}

export async function loadEditForm(
  gistId: string,
  container: HTMLElement,
  onBack: () => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const gist = await getGist(gistId);
    if (signal?.aborted) return;
    if (!gist) {
      container.innerHTML =
        '<div class="error-state"><p>GIST NOT FOUND</p><button class="btn btn-ghost" id="edit-back-btn">← BACK</button></div>';
      container.querySelector('#edit-back-btn')?.addEventListener('click', onBack, { signal });
      return;
    }
    container.innerHTML = renderEditForm(gist);
    bindEditEvents(container, onBack, signal);
  } catch {
    toast.error('FAILED TO LOAD GIST');
    onBack();
  }
}
