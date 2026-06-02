/**
 * Create Gist Route
 */

import { toast } from '../components/ui/toast';
import { parsePasteText } from '../services/gist-paste-parser';
import { lifecycle } from '../services/lifecycle';
import { generateDescription, loadLLMConfig, splitIntoFiles } from '../services/llm/client';
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
            <button type="button" id="ai-parse-btn" class="btn btn-ghost" disabled title="Configure LLM in Settings">AI PARSE</button>
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
    filesContainer.innerHTML = '';
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
      filesContainer.innerHTML = '';

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
        aiParseBtn.title = `AI Parse using ${config.provider}`;

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
                filesContainer.innerHTML = '';
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
        const submitBtn = container.querySelector('[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute('aria-busy', 'true');
          submitBtn.innerHTML =
            '<span class="btn-spinner" aria-hidden="true"></span><span class="btn-label">CREATING...</span>';
        }

        try {
          const result = await gistStore.createGist(desc, isPublic, files);
          if (result) {
            toast.success('GIST CREATED');
          } else {
            toast.success('GIST QUEUED FOR SYNC');
          }
          window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
            submitBtn.innerHTML = '<span class="btn-label">CREATE GIST</span>';
          }
        }
      })();
    },
    { signal }
  );
}
