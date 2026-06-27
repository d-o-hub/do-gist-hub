/**
 * Gist Edit Component
 * Redesigned for App Mode
 */

import type { GistRecord } from '../services/db';
import { getGist } from '../services/db';
import networkMonitor from '../services/network/offline-monitor';
import gistStore from '../stores/gist-store';
import { clearAllFieldErrors, showFieldError } from '../utils/form-error';
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
  removeBtn.textContent = 'REMOVE';
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
  backBtn.textContent = 'BACK';
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
    rmBtn.textContent = 'REMOVE';
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

  // "Unsaved changes" badge: visible only when the form is dirty.
  // Anchored to the actions row so it doesn't shift other layout
  // (the actions row already has flex-wrap on narrow viewports).
  const dirtyBadge = document.createElement('span');
  dirtyBadge.id = 'edit-dirty-badge';
  dirtyBadge.className = 'dirty-badge';
  dirtyBadge.setAttribute('aria-live', 'polite');
  dirtyBadge.setAttribute('aria-hidden', 'true');
  dirtyBadge.textContent = 'Unsaved changes';
  actions.insertBefore(dirtyBadge, submitBtn);
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

  // Snapshot the original field values so we can detect dirty state.
  // The form gets a `is-dirty` class on first change; the SUBMIT and
  // CANCEL buttons stay accessible but trigger a confirm when dirty
  // before navigating away.
  const form = container.querySelector('#edit-gist-form') as HTMLFormElement | null;
  const snapshot = (): string => {
    if (!form) return '';
    const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    return Array.from(fields)
      .map((f) => `${f.id || f.name}:${f.value}`)
      .join('|');
  };
  const original = snapshot();
  const isDirty = (): boolean => snapshot() !== original;
  const setDirty = (): void => {
    if (!form) return;
    const dirty = isDirty();
    form.classList.toggle('is-dirty', dirty);
    const badge = container.querySelector('#edit-dirty-badge') as HTMLElement | null;
    if (badge) {
      if (dirty) {
        badge.removeAttribute('aria-hidden');
      } else {
        badge.setAttribute('aria-hidden', 'true');
      }
    }
  };
  if (form) {
    form.addEventListener(
      'input',
      () => {
        setDirty();
      },
      { signal }
    );
  }
  const guardedBack = async (): Promise<void> => {
    if (isDirty()) {
      // Use the app's confirm dialog (consistent UX, accessible,
      // a11y-friendly) instead of window.confirm. Returns true if
      // the user confirms they want to discard the changes.
      const { showConfirmDialog } = await import('../utils/dialog');
      const confirmed = await showConfirmDialog({
        title: 'Discard unsaved changes?',
        message: 'You have edits that have not been saved. Leaving now will discard them.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        variant: 'danger',
      });
      if (!confirmed) return;
    }
    onBack();
  };
  container.querySelector('#edit-back-btn')?.addEventListener(
    'click',
    () => {
      void guardedBack();
    },
    { signal }
  );
  container.querySelector('#edit-cancel-btn')?.addEventListener(
    'click',
    () => {
      void guardedBack();
    },
    { signal }
  );

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
          if (section.querySelectorAll('.file-editor').length <= 1) {
            toast.error('AT LEAST ONE FILE IS REQUIRED');
            return;
          }
          // Animate the row out (150ms fade + lift) before removing.
          // See create.ts for the same pattern and the reasoning.
          editor.classList.add('is-leaving');
          const onEnd = (): void => {
            editor.remove();
          };
          editor.addEventListener('animationend', onEnd, { once: true });
          window.setTimeout(onEnd, 250);
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
        if (!section) return;
        const editor = (btn as HTMLElement).closest('.file-editor');
        if (!editor) return;
        if (section.querySelectorAll('.file-editor').length <= 1) {
          toast.error('AT LEAST ONE FILE IS REQUIRED');
          return;
        }
        editor.classList.add('is-leaving');
        const onEnd = (): void => {
          editor.remove();
        };
        editor.addEventListener('animationend', onEnd, { once: true });
        window.setTimeout(onEnd, 250);
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

        clearAllFieldErrors(container);

        const files: Record<string, string> = {};
        const seenFilenames = new Map<string, HTMLInputElement>();
        const invalidInputs: HTMLInputElement[] = [];

        container.querySelectorAll('.file-editor').forEach((editor) => {
          const existingKey = (editor as HTMLElement).dataset.fileKey;
          const filenameInput = editor.querySelector('.filename-input') as HTMLInputElement;
          const filename = filenameInput?.value.trim();
          const content =
            (editor.querySelector('.content-editor') as HTMLTextAreaElement)?.value || '';

          if (!filename) {
            showFieldError(filenameInput, 'Filename is required');
            invalidInputs.push(filenameInput);
            return;
          }

          // Duplicate filename check (against the user-typed name; the
          // existing key lets us keep stable across renames).
          if (seenFilenames.has(filename) && filename !== existingKey) {
            showFieldError(filenameInput, `Duplicate filename: ${filename}`);
            invalidInputs.push(filenameInput);
            return;
          }
          seenFilenames.set(filename, filenameInput);
          files[existingKey || filename] = content;
        });

        const firstInvalid = invalidInputs[0];
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }

        if (Object.keys(files).length === 0) {
          toast.error('AT LEAST ONE FILE REQUIRED');
          return;
        }

        const description = (
          container.querySelector('#edit-description') as HTMLInputElement
        )?.value.trim();

        const submitBtn = container.querySelector<HTMLButtonElement>('#edit-submit-btn');
        const enterBusy = (): void => {
          if (!submitBtn) return;
          submitBtn.disabled = true;
          submitBtn.setAttribute('aria-busy', 'true');
          setButtonLoading(submitBtn, 'Saving...');
        };
        const exitBusy = (): void => {
          if (!submitBtn) return;
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
          setButtonText(submitBtn, 'SAVE CHANGES');
        };
        enterBusy();

        const wasOffline = !networkMonitor.isOnline();

        try {
          const result = await gistStore.updateGist(gistId, { description, files });
          if (signal?.aborted) return;
          if (result) {
            toast.success('GIST UPDATED');
            onBack();
            return;
          }
          if (wasOffline) {
            toast.info('CHANGES QUEUED, WILL SYNC WHEN YOU ARE BACK ONLINE', 5000);
            onBack();
            return;
          }
          // Online + null result = real failure. Keep the user on
          // the form so their changes aren't lost.
          toast.error('UPDATE FAILED, CHECK YOUR CONNECTION AND TRY AGAIN', 6000);
          exitBusy();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'FAILED TO UPDATE GIST', 6000);
          exitBusy();
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
