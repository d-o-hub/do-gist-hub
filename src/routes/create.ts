/**
 * Create Gist Route
 */

import { toast } from '../components/ui/toast';
import { lifecycle } from '../services/lifecycle';
import gistStore from '../stores/gist-store';

let nextFileId = 0;

function createFileRow(id: number, container: HTMLElement, signal: AbortSignal): HTMLElement {
  const div = document.createElement('div');
  div.className = 'file-entry';
  div.innerHTML = `
    <div class="flex-row gap-2 flex-end">
      <div class="form-group flex-1 mb-0">
        <label class="form-label" for="gist-filename-${id}">Filename</label>
        <input type="text" id="gist-filename-${id}" class="form-input gist-filename" placeholder="e.g. index.js" required>
      </div>
      <button type="button" class="btn btn-ghost btn-remove-file remove-file-minh remove-file-p" data-file-id="${id}">
          REMOVE
        </button>
    </div>
    <div class="form-group mb-0">
      <label class="form-label" for="gist-content-${id}">Content</label>
      <textarea id="gist-content-${id}" class="form-textarea gist-content gist-content-minh" placeholder="File content..." required></textarea>
    </div>
  `;

  const removeBtn = div.querySelector('.btn-remove-file');
  removeBtn?.addEventListener(
    'click',
    () => {
      const filesContainer = container.querySelector('#files-container') as HTMLElement;
      const entries = filesContainer.querySelectorAll('.file-entry');
      if (entries.length > 1) {
        div.remove();
        updateRemoveButtons(filesContainer);
      } else {
        toast.error('AT LEAST ONE FILE REQUIRED');
      }
    },
    { signal }
  );

  return div;
}

function updateRemoveButtons(filesContainer: HTMLElement): void {
  const entries = filesContainer.querySelectorAll('.file-entry');
  entries.forEach((entry) => {
    const btn = entry.querySelector('.btn-remove-file') as HTMLElement | null;
    if (btn) {
      btn.style.display = entries.length > 1 ? 'inline-flex' : 'none';
    }
  });
}

export function render(container: HTMLElement): void {
  const signal = lifecycle.getRouteSignal();

  nextFileId = 0;

  container.innerHTML = `
    <div class="route-create">
      <header class="detail-header">
        <h2 class="detail-title">Create New Gist</h2>
      </header>
      <form id="create-gist-form" class="glass-card create-form-p">
        <div class="form-group">
          <label class="form-label" for="gist-description">Description</label>
          <input type="text" id="gist-description" class="form-input" placeholder="Gist description..." required>
        </div>

       <div class="form-group">
         <div class="files-header">
           <span class="form-label">Files</span>
           <button type="button" id="add-file-btn" class="btn btn-ghost">+ ADD FILE</button>
         </div>
         <div id="files-container" class="files-container"></div>
       </div>

       <div class="form-group">
         <label class="form-label checkbox-label">
           <input type="checkbox" id="gist-public" checked>
           <span>Public Gist</span>
         </label>
       </div>

       <div class="form-actions">
         <button type="submit" class="btn btn-primary">CREATE GIST</button>
       </div>
      </form>
    </div>
  `;

  const filesContainer = container.querySelector('#files-container') as HTMLElement;

  // Add initial file
  const initialId = nextFileId++;
  filesContainer.appendChild(createFileRow(initialId, container, signal));
  updateRemoveButtons(filesContainer);

  // Add file button
  container.querySelector('#add-file-btn')?.addEventListener(
    'click',
    () => {
      const id = nextFileId++;
      filesContainer.appendChild(createFileRow(id, container, signal));
      updateRemoveButtons(filesContainer);
      const newInput = filesContainer.querySelector(`#gist-filename-${id}`) as HTMLElement | null;
      newInput?.focus();
    },
    { signal }
  );

  container.querySelector('#create-gist-form')?.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();

      const desc = (container.querySelector('#gist-description') as HTMLInputElement).value;
      const isPublic = (container.querySelector('#gist-public') as HTMLInputElement).checked;

      const files: Record<string, string> = {};
      const entries = filesContainer.querySelectorAll('.file-entry');
      let hasError = false;

      entries.forEach((entry) => {
        const filenameInput = entry.querySelector('.gist-filename') as HTMLInputElement;
        const contentInput = entry.querySelector('.gist-content') as HTMLTextAreaElement;
        const filename = filenameInput.value.trim();
        const content = contentInput.value;

        if (!filename) {
          toast.error('ALL FILES MUST HAVE A FILENAME');
          filenameInput.focus();
          hasError = true;
          return;
        }

        if (files[filename]) {
          toast.error(`DUPLICATE FILENAME: ${filename}`);
          filenameInput.focus();
          hasError = true;
          return;
        }

        files[filename] = content;
      });

      if (hasError) return;

      if (Object.keys(files).length === 0) {
        toast.error('AT LEAST ONE FILE REQUIRED');
        return;
      }

      void (async () => {
        const result = await gistStore.createGist(desc, isPublic, files);
        if (result) {
          toast.success('GIST CREATED');
        } else {
          toast.success('GIST QUEUED FOR SYNC');
        }
        window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));
      })();
    },
    { signal }
  );
}
