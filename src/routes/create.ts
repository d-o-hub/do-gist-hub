/**
 * Create Gist Route
 */

import { setButtonLoading, setButtonText } from '../components/ui/button';
import { toast } from '../components/ui/toast';
import { parsePasteText } from '../services/gist-paste-parser';
import { lifecycle } from '../services/lifecycle';
import { generateDescription, loadLLMConfig, splitIntoFiles } from '../services/llm/client';
import networkMonitor from '../services/network/offline-monitor';
import gistStore from '../stores/gist-store';
import { clearAllFieldErrors, showFieldError } from '../utils/form-error';

let nextFileId = 0;

function createFileRow(id: number, container: HTMLElement, signal: AbortSignal): HTMLElement {
  const div = document.createElement('div');
  div.className = 'file-entry';

  // --- Header row: filename + remove button ---
  const headerRow = document.createElement('div');
  headerRow.className = 'flex-row gap-2 flex-end';

  const filenameGroup = document.createElement('div');
  filenameGroup.className = 'form-group flex-1 mb-0';
  const filenameLabel = document.createElement('label');
  filenameLabel.className = 'form-label';
  filenameLabel.setAttribute('for', `gist-filename-${id}`);
  filenameLabel.textContent = 'Filename';
  filenameGroup.appendChild(filenameLabel);
  const filenameInput = document.createElement('input');
  filenameInput.type = 'text';
  filenameInput.id = `gist-filename-${id}`;
  filenameInput.className = 'form-input gist-filename';
  filenameInput.placeholder = 'e.g. index.js';
  filenameInput.required = true;
  filenameGroup.appendChild(filenameInput);
  headerRow.appendChild(filenameGroup);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-ghost btn-remove-file remove-file-minh remove-file-p';
  removeBtn.dataset.fileId = String(id);
  removeBtn.textContent = 'REMOVE';
  headerRow.appendChild(removeBtn);
  div.appendChild(headerRow);

  // --- Content textarea ---
  const contentGroup = document.createElement('div');
  contentGroup.className = 'form-group mb-0';
  const contentLabel = document.createElement('label');
  contentLabel.className = 'form-label';
  contentLabel.setAttribute('for', `gist-content-${id}`);
  contentLabel.textContent = 'Content';
  contentGroup.appendChild(contentLabel);
  const contentTextarea = document.createElement('textarea');
  contentTextarea.id = `gist-content-${id}`;
  contentTextarea.className = 'form-textarea gist-content gist-content-minh';
  contentTextarea.placeholder = 'File content...';
  contentTextarea.required = true;
  contentGroup.appendChild(contentTextarea);
  div.appendChild(contentGroup);

  removeBtn.addEventListener(
    'click',
    () => {
      const filesContainer = container.querySelector('#files-container') as HTMLElement;
      const entries = filesContainer.querySelectorAll('.file-entry');
      if (entries.length <= 1) {
        toast.error('AT LEAST ONE FILE REQUIRED');
        return;
      }
      // Animate the row out (150ms fade + lift) before removing it
      // from the DOM so the change reads as motion, not a snap. If
      // reduced motion is on, the listener fires immediately.
      div.classList.add('is-leaving');
      const onEnd = (): void => {
        div.remove();
        updateRemoveButtons(filesContainer);
      };
      div.addEventListener('animationend', onEnd, { once: true });
      // Safety fallback in case animationend never fires (e.g. tab
      // backgrounded). 250ms = leave duration + 100ms buffer.
      window.setTimeout(onEnd, 250);
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
      <form id="create-gist-form" class="glass-card create-form-p form-stagger">
        <div class="form-group">
          <label class="form-label" for="gist-description">Description</label>
          <input type="text" id="gist-description" class="form-input" placeholder="Gist description..." required>
        </div>

        <div class="form-group">
          <label class="form-label" for="paste-input">Paste to Gist</label>
          <textarea id="paste-input" class="form-textarea paste-zone" placeholder="Paste plain text here (supports --- filename.ext --- delimiters, ## headers, or code blocks)..." rows="4"></textarea>
          <div class="paste-zone-actions">
            <button type="button" id="parse-paste-btn" class="btn btn-ghost">PARSE PASTE</button>
            <button type="button" id="ai-parse-btn" class="btn btn-ghost" disabled aria-describedby="ai-parse-hint">AI PARSE</button>
            <span id="ai-parse-hint" class="btn-hint">Enable an LLM provider in Settings to use this</span>
          </div>
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

  // Paste zone: parse paste text into files
  const parseAndPopulate = (text: string): void => {
    const result = parsePasteText(text);
    if (result.files.length === 0) {
      toast.error('NO FILES DETECTED IN PASTE');
      return;
    }

    // Clear existing files and populate with parsed results
    filesContainer.replaceChildren();
    for (const file of result.files) {
      const id = nextFileId++;
      const row = createFileRow(id, container, signal);
      const filenameInput = row.querySelector('.gist-filename') as HTMLInputElement;
      const contentInput = row.querySelector('.gist-content') as HTMLTextAreaElement;
      if (filenameInput) filenameInput.value = file.filename;
      if (contentInput) contentInput.value = file.content;
      filesContainer.appendChild(row);
    }
    updateRemoveButtons(filesContainer);

    // Auto-fill description if suggested
    if (result.suggestedDescription) {
      const descInput = container.querySelector('#gist-description') as HTMLInputElement;
      if (descInput && !descInput.value) {
        descInput.value = result.suggestedDescription;
      }
    }

    toast.success(`PARSED ${result.files.length} FILE${result.files.length > 1 ? 'S' : ''}`);
  };

  // Parse paste button
  container.querySelector('#parse-paste-btn')?.addEventListener(
    'click',
    () => {
      const pasteInput = container.querySelector('#paste-input') as HTMLTextAreaElement;
      const text = pasteInput?.value?.trim();
      if (!text) {
        toast.error('PASTE TEXT FIRST');
        return;
      }
      parseAndPopulate(text);
    },
    { signal }
  );

  // Paste event on textarea
  container.querySelector('#paste-input')?.addEventListener(
    'paste',
    (_e) => {
      // Let the paste happen naturally first, then parse after a tick
      setTimeout(() => {
        const pasteInput = container.querySelector('#paste-input') as HTMLTextAreaElement;
        const text = pasteInput?.value?.trim();
        if (text) {
          parseAndPopulate(text);
        }
      }, 0);
    },
    { signal }
  );

  // Drag-and-drop support on files container
  filesContainer.addEventListener(
    'dragover',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      filesContainer.classList.add('drag-over');
    },
    { signal }
  );

  filesContainer.addEventListener(
    'dragleave',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      filesContainer.classList.remove('drag-over');
    },
    { signal }
  );

  filesContainer.addEventListener(
    'drop',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      filesContainer.classList.remove('drag-over');

      const droppedFiles = e.dataTransfer?.files;
      if (!droppedFiles || droppedFiles.length === 0) return;

      const textFiles = Array.from(droppedFiles).filter(
        (f) => f.type.startsWith('text/') || f.name.endsWith('.json') || f.name.endsWith('.md')
      );

      if (textFiles.length === 0) {
        toast.error('ONLY TEXT FILES ARE SUPPORTED');
        return;
      }

      // Clear existing files and populate with dropped files
      filesContainer.replaceChildren();

      for (const file of textFiles) {
        const id = nextFileId++;
        const row = createFileRow(id, container, signal);
        const filenameInput = row.querySelector('.gist-filename') as HTMLInputElement;
        const contentInput = row.querySelector('.gist-content') as HTMLTextAreaElement;
        if (filenameInput) filenameInput.value = file.name;
        filesContainer.appendChild(row);

        // Read file content
        const reader = new FileReader();
        reader.onload = () => {
          if (contentInput) contentInput.value = reader.result as string;
        };
        reader.readAsText(file);
      }

      updateRemoveButtons(filesContainer);
      toast.success(`IMPORTED ${textFiles.length} FILE${textFiles.length > 1 ? 'S' : ''}`);
    },
    { signal }
  );

  // Initialize LLM and enable AI PARSE button if configured
  void (async () => {
    try {
      const config = await loadLLMConfig();
      const aiParseBtn = container.querySelector('#ai-parse-btn') as HTMLButtonElement;
      if (aiParseBtn && config.enabled) {
        aiParseBtn.disabled = false;
        aiParseBtn.removeAttribute('aria-describedby');
        aiParseBtn.title = `AI Parse using ${config.provider}`;
        // Hide the "enable LLM" hint once the button is enabled
        const hint = container.querySelector('#ai-parse-hint') as HTMLElement | null;
        if (hint) hint.hidden = true;

        // AI PARSE button handler
        aiParseBtn.addEventListener(
          'click',
          () => {
            const pasteInput = container.querySelector('#paste-input') as HTMLTextAreaElement;
            const text = pasteInput?.value?.trim();
            if (!text) {
              toast.error('PASTE TEXT FIRST');
              return;
            }

            // Show loading state
            aiParseBtn.disabled = true;
            aiParseBtn.textContent = 'PARSING...';

            void (async () => {
              try {
                const result = await splitIntoFiles(text);
                if (result.files.length === 0) {
                  toast.error('NO FILES DETECTED');
                  return;
                }

                // Clear existing files and populate with LLM results
                filesContainer.replaceChildren();
                for (const file of result.files) {
                  const id = nextFileId++;
                  const row = createFileRow(id, container, signal);
                  const filenameInput = row.querySelector('.gist-filename') as HTMLInputElement;
                  const contentInput = row.querySelector('.gist-content') as HTMLTextAreaElement;
                  if (filenameInput) filenameInput.value = file.filename;
                  if (contentInput) contentInput.value = file.content;
                  filesContainer.appendChild(row);
                }
                updateRemoveButtons(filesContainer);

                // Generate description if files are present
                const description = await generateDescription(result.files);
                const descInput = container.querySelector('#gist-description') as HTMLInputElement;
                if (descInput && !descInput.value) {
                  descInput.value = description;
                }

                toast.success(
                  `AI PARSED ${result.files.length} FILE${result.files.length > 1 ? 'S' : ''}`
                );
              } catch (_err) {
                toast.error('AI PARSE FAILED, USING BASIC PARSER');
                // Fallback to heuristic parser
                parseAndPopulate(text);
              } finally {
                aiParseBtn.disabled = false;
                aiParseBtn.textContent = 'AI PARSE';
              }
            })();
          },
          { signal }
        );
      }
    } catch {
      // LLM not configured - leave AI PARSE button disabled
    }
  })();

  container.querySelector('#create-gist-form')?.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();

      const desc = (container.querySelector('#gist-description') as HTMLInputElement).value;
      const isPublic = (container.querySelector('#gist-public') as HTMLInputElement).checked;

      // Clear any previous inline errors before re-validating.
      clearAllFieldErrors(container);

      const files: Record<string, string> = {};
      const entries = filesContainer.querySelectorAll('.file-entry');
      let hasError = false;

      entries.forEach((entry) => {
        const filenameInput = entry.querySelector('.gist-filename') as HTMLInputElement;
        const contentInput = entry.querySelector('.gist-content') as HTMLTextAreaElement;
        const filename = filenameInput.value.trim();
        const content = contentInput.value;

        if (!filename) {
          showFieldError(filenameInput, 'Filename is required');
          if (!hasError) filenameInput.focus();
          hasError = true;
          return;
        }

        if (files[filename]) {
          showFieldError(filenameInput, `Duplicate filename: ${filename}`);
          if (!hasError) filenameInput.focus();
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
        const submitBtn = container.querySelector<HTMLButtonElement>('[type="submit"]');
        const enterBusy = (): void => {
          if (!submitBtn) return;
          submitBtn.disabled = true;
          submitBtn.setAttribute('aria-busy', 'true');
          setButtonLoading(submitBtn, 'Creating...');
        };
        const exitBusy = (): void => {
          if (!submitBtn) return;
          submitBtn.disabled = false;
          submitBtn.removeAttribute('aria-busy');
          setButtonText(submitBtn, 'CREATE GIST');
        };
        enterBusy();

        // Track whether we expected to queue (offline) vs attempted
        // to send to GitHub (online). The store returns null in both
        // cases, so we need this hint to surface the right message.
        const wasOffline = !networkMonitor.isOnline();

        try {
          const result = await gistStore.createGist(desc, isPublic, files);
          if (result) {
            toast.success('GIST CREATED');
            window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));
            return;
          }
          if (wasOffline) {
            toast.info('GIST QUEUED, WILL SYNC WHEN YOU ARE BACK ONLINE', 5000);
            window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));
            return;
          }
          // Online + null result = real failure. Surface a clear
          // error with a retry path and keep the user on the form
          // so their input isn't lost.
          toast.error('CREATE FAILED, CHECK YOUR CONNECTION AND TRY AGAIN', 6000);
          exitBusy();
        } catch (err) {
          // Unexpected error from the store itself. Same recovery
          // path: keep the user on the form, surface the message.
          toast.error(err instanceof Error ? err.message : 'CREATE FAILED, TRY AGAIN', 6000);
          exitBusy();
        }
      })();
    },
    { signal }
  );
}
