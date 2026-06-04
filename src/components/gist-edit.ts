/**
 * Gist Edit Component
 * Redesigned for App Mode
 */

import type { GistRecord } from '../services/db';
import { getGist } from '../services/db';
import gistStore from '../stores/gist-store';
import { setButtonLoading, setButtonText } from './ui/button';
import { EmptyState } from './ui/empty-state';
import { toast } from './ui/toast';

/** Build the static DOM fields (filename + content) for a file editor. */
function buildFileEditorFields(): DocumentFragment {
  const frag = document.createDocumentFragment();

  const group1 = document.createElement('div');
  group1.className = 'form-group';
  const label1 = document.createElement('label');
  label1.className = 'form-label';
  label1.textContent = 'FILENAME';
  group1.appendChild(label1);
  const row = document.createElement('div');
  row.className = 'flex-row gap-2';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input filename-input';
  input.placeholder = 'example.js';
  row.appendChild(input);
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-danger remove-file-btn';
  removeBtn.textContent = '×';
  row.appendChild(removeBtn);
  group1.appendChild(row);
  frag.appendChild(group1);

  const group2 = document.createElement('div');
  group2.className = 'form-group';
  const label2 = document.createElement('label');
  label2.className = 'form-label';
  label2.textContent = 'CONTENT';
  group2.appendChild(label2);
  const textarea = document.createElement('textarea');
  textarea.className = 'form-textarea content-editor';
  textarea.placeholder = 'Enter content...';
  group2.appendChild(textarea);
  frag.appendChild(group2);

  return frag;
}

/**
 * Render the edit form as a DocumentFragment using only DOM APIs.
 * Safe by construction — all text content is set via textContent.
 */
export function renderEditForm(gist: GistRecord): DocumentFragment {
  const frag = document.createDocumentFragment();
  const wrapper = document.createElement('div');
  wrapper.className = 'route-edit';
  wrapper.dataset.gistId = gist.id;

  // --- Header ---
  const header = document.createElement('header');
  header.className = 'detail-header';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost';
  backBtn.id = 'edit-back-btn';
  backBtn.textContent = '← BACK';
  header.appendChild(backBtn);
  const h1 = document.createElement('h1');
  h1.className = 'detail-title';
  h1.textContent = 'EDIT GIST';
  header.appendChild(h1);
  wrapper.appendChild(header);

  // --- Form ---
  const form = document.createElement('form');
  form.id = 'edit-gist-form';
  form.className = 'gist-form edit-form-p form-stagger';

  // Description
  const descGroup = document.createElement('div');
  descGroup.className = 'form-group';
  const descLabel = document.createElement('label');
  descLabel.className = 'form-label';
  descLabel.textContent = 'DESCRIPTION';
  descGroup.appendChild(descLabel);
  const descInput = document.createElement('input');
  descInput.type = 'text';
  descInput.id = 'edit-description';
  descInput.name = 'description';
  descInput.className = 'form-input';
  descInput.value = gist.description || '';
  descGroup.appendChild(descInput);
  form.appendChild(descGroup);

  // Files section
  const filesSection = document.createElement('div');
  filesSection.className = 'files-section';
  filesSection.id = 'edit-files-section';
  const filesLabel = document.createElement('div');
  filesLabel.className = 'micro-label mb-2';
  filesLabel.textContent = 'FILES';
  filesSection.appendChild(filesLabel);

  const fileCount = Object.keys(gist.files).length;
  for (const [key, file] of Object.entries(gist.files)) {
    const editor = document.createElement('div');
    editor.className = 'file-editor glass-card file-editor-p file-editor-mb';
    editor.dataset.fileKey = key;

    const fg1 = document.createElement('div');
    fg1.className = 'form-group';
    const fl1 = document.createElement('label');
    fl1.className = 'form-label';
    fl1.textContent = 'FILENAME';
    fg1.appendChild(fl1);
    const row = document.createElement('div');
    row.className = 'flex-row gap-2';
    const fnInput = document.createElement('input');
    fnInput.type = 'text';
    fnInput.className = 'form-input filename-input';
    fnInput.value = file.filename;
    fnInput.placeholder = 'example.js';
    row.appendChild(fnInput);
    const rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'btn btn-danger remove-file-btn';
    rmBtn.textContent = '×';
    if (fileCount <= 1) rmBtn.hidden = true;
    row.appendChild(rmBtn);
    fg1.appendChild(row);
    editor.appendChild(fg1);

    const fg2 = document.createElement('div');
    fg2.className = 'form-group';
    const fl2 = document.createElement('label');
    fl2.className = 'form-label';
    fl2.textContent = 'CONTENT';
    fg2.appendChild(fl2);
    const ta = document.createElement('textarea');
    ta.className = 'form-textarea content-editor';
    ta.placeholder = 'Enter content...';
    ta.textContent = file.content || '';
    fg2.appendChild(ta);
    editor.appendChild(fg2);

    filesSection.appendChild(editor);
  }
  form.appendChild(filesSection);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'edit-actions';
  const addFileBtn = document.createElement('button');
  addFileBtn.type = 'button';
  addFileBtn.id = 'edit-add-file-btn';
  addFileBtn.className = 'btn btn-ghost';
  addFileBtn.textContent = '+ ADD FILE';
  actions.appendChild(addFileBtn);
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn-primary';
  submitBtn.id = 'edit-submit-btn';
  submitBtn.textContent = 'SAVE CHANGES';
  actions.appendChild(submitBtn);
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.id = 'edit-cancel-btn';
  cancelBtn.className = 'btn btn-ghost';
  cancelBtn.textContent = 'CANCEL';
  actions.appendChild(cancelBtn);
  form.appendChild(actions);

  wrapper.appendChild(form);
  frag.appendChild(wrapper);
  return frag;
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
      editor.appendChild(buildFileEditorFields());
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

        const submitBtn = container.querySelector<HTMLButtonElement>('#edit-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute('aria-busy', 'true');
          setButtonLoading(submitBtn, 'Saving...');
        }

        try {
          const result = await gistStore.updateGist(gistId, { description, files });
          if (signal?.aborted) return;
          if (result) {
            toast.success('GIST UPDATED');
            onBack();
          }
        } catch {
          toast.error('FAILED TO UPDATE GIST');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
            setButtonText(submitBtn, 'SAVE CHANGES');
          }
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
      const fragment = EmptyState.renderToFragment({
        title: 'Gist Not Found',
        description: 'This gist may have been deleted or you do not have permission to edit it.',
        actionLabel: 'Go Back',
      });
      container.replaceChildren(fragment);
      container.querySelector('.empty-state-action')?.addEventListener('click', onBack, { signal });
      return;
    }
    container.replaceChildren(renderEditForm(gist));
    bindEditEvents(container, onBack, signal);
  } catch {
    toast.error('FAILED TO LOAD GIST');
    onBack();
  }
}
