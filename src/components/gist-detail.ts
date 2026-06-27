/**
 * Gist Detail Component
 * Redesigned for App Mode
 */

import * as GitHub from '../services/github/client';
import { sanitizeUrl } from '../services/security/dom';
import { safeError } from '../services/security/logger';
import { highlightCode, shouldLazyHighlight } from '../services/syntax-highlight';
import gistStore from '../stores/gist-store';
import type { GistRecord } from '../types';
import type { GistRevision } from '../types/api';
import { formatRelativeTime } from '../utils/date';
import { renderTagChips } from './ui/tag-chip';
import { toast } from './ui/toast';

export function buildFileContent(content: string, language?: string): DocumentFragment {
  if (typeof document === 'undefined') {
    return new DocumentFragment();
  }
  const frag = document.createDocumentFragment();
  const pre = document.createElement('pre');
  pre.className = `code-block language-${language?.replace(/[^a-z0-9-]/gi, '') || 'text'}`;
  const code = document.createElement('code');
  code.textContent = content;
  pre.appendChild(code);
  frag.appendChild(pre);
  return frag;
}

const highlightObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const pre = entry.target as HTMLPreElement;
      const code = pre.querySelector('code');
      if (!code || pre.dataset.highlighted === 'true') continue;
      const lang = pre.className.match(/language-(\S+)/)?.[1];
      const content = code.textContent ?? '';
      if (shouldLazyHighlight(content)) {
        void applyHighlight(pre, code, lang, content);
      }
      highlightObserver.unobserve(pre);
    }
  },
  { rootMargin: '200px' }
);

async function applyHighlight(
  pre: HTMLPreElement,
  code: HTMLElement,
  lang: string | undefined,
  content: string
): Promise<void> {
  try {
    const html = await highlightCode(content, lang);
    if (html) {
      code.innerHTML = html;
      pre.dataset.highlighted = 'true';
    }
  } catch {
    safeError('[SyntaxHighlight] Failed to highlight code block');
  }
}

function applyLineNumbers(pre: HTMLPreElement, enabled: boolean): void {
  if (enabled) {
    pre.classList.add('has-line-numbers');
  } else {
    pre.classList.remove('has-line-numbers');
  }
}

function createDetailHeader(gist: GistRecord, fileCount: number): HTMLElement {
  const header = document.createElement('header');
  header.className = 'detail-header';
  header.style.viewTransitionName = 'detail-header';

  const headerTop = document.createElement('div');
  headerTop.className = 'header-top';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost';
  backBtn.id = 'gist-back-btn';
  backBtn.setAttribute('aria-label', 'Go back');
  backBtn.textContent = 'BACK';
  headerTop.appendChild(backBtn);
  const detailLabel = document.createElement('span');
  detailLabel.className = 'micro-label';
  detailLabel.textContent = 'Gist Detail';
  headerTop.appendChild(detailLabel);
  header.appendChild(headerTop);

  const h1 = document.createElement('h1');
  h1.className = 'detail-title';
  h1.textContent = gist.description || 'Untitled Gist';
  header.appendChild(h1);

  const metaRow = document.createElement('div');
  metaRow.className = 'detail-meta-row';
  const filesChip = document.createElement('span');
  filesChip.className = 'detail-chip';
  filesChip.textContent = `${fileCount} Files`;
  metaRow.appendChild(filesChip);
  const visChip = document.createElement('span');
  visChip.className = 'detail-chip';
  visChip.textContent = gist.public ? 'Public' : 'Secret';
  metaRow.appendChild(visChip);
  const timeEl = document.createElement('time');
  timeEl.className = 'micro-label';
  timeEl.dateTime = gist.updatedAt;
  timeEl.textContent = `Updated ${formatRelativeTime(gist.updatedAt)}`;
  metaRow.appendChild(timeEl);
  header.appendChild(metaRow);

  return header;
}

function createDetailActions(gist: GistRecord): HTMLElement {
  const actions = document.createElement('div');
  actions.className = 'gist-detail-actions';

  const addBtn = (
    label: string,
    action: string,
    className = 'btn btn-ghost'
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.className = className;
    btn.dataset.action = action;
    btn.textContent = label;
    actions.appendChild(btn);
    return btn;
  };

  addBtn(
    gist.starred ? 'Unstar' : 'Star',
    'star',
    `btn ${gist.starred ? 'btn-danger' : 'btn-primary'}`
  );
  addBtn('Fork', 'fork');
  addBtn('Edit', 'edit');
  addBtn('Revisions', 'revisions');

  if (gist.htmlUrl) {
    const githubLink = document.createElement('a');
    githubLink.className = 'btn btn-ghost';
    githubLink.dataset.action = 'open-github';
    githubLink.href = sanitizeUrl(gist['htmlUrl']);
    githubLink.target = '_blank';
    githubLink.rel = 'noopener noreferrer';
    githubLink.textContent = 'Open in GitHub';
    actions.appendChild(githubLink);
    const copyUrlBtn = addBtn('Copy URL', 'copy-url');
    copyUrlBtn.title = 'Copy URL (C)';
  }

  addBtn('Lines', 'toggle-line-numbers');

  const shareBtn = addBtn('Share', 'share');
  if (typeof navigator === 'undefined' || !('share' in navigator)) {
    shareBtn.hidden = true;
  }

  addBtn('Download', 'download');
  addBtn('Download ZIP', 'download-zip');

  return actions;
}

export function renderGistDetail(gist: GistRecord): DocumentFragment {
  let fileCount = 0;
  for (const key in gist.files) {
    if (Object.hasOwn(gist.files, key)) fileCount++;
  }

  const frag = document.createDocumentFragment();
  const wrapper = document.createElement('div');
  wrapper.className = 'gist-detail';
  wrapper.dataset.gistId = gist.id;

  wrapper.appendChild(createDetailHeader(gist, fileCount));
  wrapper.appendChild(createDetailActions(gist));

  // ── Tags section ─────────────────────────────────────────────────
  const tagsSection = document.createElement('div');
  tagsSection.className = 'tag-assignment';
  tagsSection.id = 'tag-assignment-section';

  const tagsTitle = document.createElement('span');
  tagsTitle.className = 'micro-label';
  tagsTitle.textContent = 'TAGS';
  tagsSection.appendChild(tagsTitle);

  const tagsList = document.createElement('div');
  tagsList.className = 'tag-assignment-list';
  tagsList.id = 'tag-assignment-list';
  tagsSection.appendChild(tagsList);

  const addTagBtn = document.createElement('button');
  addTagBtn.className = 'btn btn-ghost btn-sm';
  addTagBtn.dataset.action = 'add-tag';
  addTagBtn.textContent = '+ Add Tag';
  tagsSection.appendChild(addTagBtn);

  wrapper.appendChild(tagsSection);

  // ── File tabs ────────────────────────────────────────────────────
  if (fileCount > 1) {
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'file-tabs scroll-x';
    tabsDiv.setAttribute('role', 'tablist');
    let idx = 0;
    for (const [key, file] of Object.entries(gist.files)) {
      const tab = document.createElement('button');
      tab.className = `chip file-tab${idx === 0 ? ' active' : ''}`;
      tab.dataset.fileKey = key;
      tab.id = `tab-${idx}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('tabindex', idx === 0 ? '0' : '-1');
      tab.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
      tab.setAttribute('aria-controls', 'file-content-area');
      tab.textContent = file.filename.toUpperCase();
      tabsDiv.appendChild(tab);
      idx++;
    }
    wrapper.appendChild(tabsDiv);
  }

  // ── File content area ────────────────────────────────────────────
  const contentArea = document.createElement('div');
  contentArea.className = 'file-content-area';
  contentArea.id = 'file-content-area';
  contentArea.setAttribute('role', 'tabpanel');
  contentArea.setAttribute('aria-labelledby', 'tab-0');

  // BOLT: Get first file without Object.keys() allocation
  let firstFile: GistRecord['files'][string] | null = null;
  for (const key in gist.files) {
    if (Object.hasOwn(gist.files, key)) {
      firstFile = gist.files[key] ?? null;
      break;
    }
  }

  if (firstFile?.content) {
    contentArea.appendChild(buildFileContent(firstFile.content, firstFile.language));
  } else {
    const emptyP = document.createElement('p');
    emptyP.className = 'empty-content';
    emptyP.textContent = 'No content available';
    contentArea.appendChild(emptyP);
  }
  wrapper.appendChild(contentArea);

  // ── File info area ───────────────────────────────────────────────
  const infoArea = document.createElement('div');
  infoArea.className = 'file-info';
  infoArea.id = 'file-info';
  if (firstFile) {
    const infoLeft = document.createElement('div');
    infoLeft.className = 'file-info-left';
    const langSpan = document.createElement('span');
    langSpan.className = 'micro-label';
    langSpan.textContent = `Language: ${firstFile.language || 'Unknown'}`;
    infoLeft.appendChild(langSpan);
    const rawSpan = document.createElement('span');
    rawSpan.className = 'micro-label';
    rawSpan.textContent = 'Raw URL: ';
    const rawLink = document.createElement('a');
    rawLink.href = sanitizeUrl(firstFile.rawUrl || '');
    rawLink.target = '_blank';
    rawLink.rel = 'noopener noreferrer';
    rawLink.textContent = 'Link';
    rawSpan.appendChild(rawLink);
    infoLeft.appendChild(rawSpan);
    infoArea.appendChild(infoLeft);
    const copyContentBtn = document.createElement('button');
    copyContentBtn.className = 'btn btn-ghost btn-copy-sm';
    copyContentBtn.dataset.action = 'copy-content';
    copyContentBtn.setAttribute('aria-label', 'Copy file content');
    const copyLabel = document.createElement('span');
    copyLabel.className = 'micro-label';
    copyLabel.textContent = 'COPY';
    copyContentBtn.appendChild(copyLabel);
    infoArea.appendChild(copyContentBtn);
  }
  wrapper.appendChild(infoArea);

  frag.appendChild(wrapper);
  return frag;
}

async function highlightVisibleCode(container: HTMLElement, signal?: AbortSignal): Promise<void> {
  const pres = container.querySelectorAll('.code-block:not([data-highlighted])');
  for (const pre of Array.from(pres) as HTMLPreElement[]) {
    if (signal?.aborted) return;
    const code = pre.querySelector('code');
    if (!code) continue;
    const content = code.textContent ?? '';
    if (shouldLazyHighlight(content)) {
      highlightObserver.observe(pre);
    } else {
      const lang = pre.className.match(/language-(\S+)/)?.[1];
      await applyHighlight(pre, code, lang, content);
    }
  }
}

export async function loadGistDetail(
  id: string,
  container: HTMLElement,
  onBack: () => void,
  onEdit: (id: string) => void,
  onViewRevision: (id: string, version: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const gist = await gistStore.hydrateGist(id);
    if (signal?.aborted) return;
    if (!gist) {
      throw new Error('Gist not found');
    }
    container.replaceChildren(renderGistDetail(gist));
    bindDetailEvents(container, { onBack, onEdit, onViewRevision }, signal);
    void highlightVisibleCode(container, signal);
  } catch (err) {
    safeError('[GistDetail] Failed to load gist', err);
    const isLikelyOffline = err instanceof Error && /network|offline|fetch/i.test(err.message);
    toast.error(
      isLikelyOffline ? 'CANNOT REACH GITHUB, CHECK YOUR CONNECTION' : 'Failed to load gist details'
    );
    const errWrapper = document.createElement('div');
    errWrapper.className = 'empty-state-container';
    errWrapper.setAttribute('role', 'alert');
    const errTitle = document.createElement('h3');
    errTitle.className = 'empty-state-title';
    errTitle.textContent = isLikelyOffline ? 'Connection Problem' : 'Gist Not Found';
    errWrapper.appendChild(errTitle);
    const errDesc = document.createElement('p');
    errDesc.className = 'empty-state-description';
    errDesc.textContent = isLikelyOffline
      ? 'We could not reach GitHub. Your cached gists are still available. Try again once you reconnect.'
      : 'This gist may have been deleted or you do not have permission to view it.';
    errWrapper.appendChild(errDesc);
    const actions = document.createElement('div');
    actions.className = 'empty-state-actions';
    const retryBtn = document.createElement('button');
    retryBtn.className = 'btn btn-primary';
    retryBtn.id = 'gist-retry-btn';
    retryBtn.textContent = 'Try again';
    actions.appendChild(retryBtn);
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-ghost';
    backBtn.id = 'gist-back-btn';
    backBtn.textContent = 'Back to gists';
    actions.appendChild(backBtn);
    errWrapper.appendChild(actions);
    container.replaceChildren(errWrapper);
    backBtn.addEventListener('click', onBack, { signal });
    retryBtn.addEventListener(
      'click',
      () => {
        // Re-trigger the same load. Abort the current attempt so the
        // navigation cleanup doesn't kick in mid-retry, and pass a
        // fresh signal so the retry can race the abort.
        void loadGistDetail(id, container, onBack, onEdit, onViewRevision, signal);
      },
      { signal }
    );
  }
}

export function renderRevisions(gistId: string, revisions: GistRevision[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  const wrapper = document.createElement('div');
  wrapper.className = 'revisions-list';
  wrapper.dataset.gistId = gistId;

  const header = document.createElement('header');
  header.className = 'detail-header';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost';
  backBtn.id = 'gist-back-btn';
  backBtn.textContent = 'BACK';
  header.appendChild(backBtn);
  const h1 = document.createElement('h1');
  h1.className = 'detail-title';
  h1.textContent = `Revisions (${revisions.length})`;
  header.appendChild(h1);
  wrapper.appendChild(header);

  const container = document.createElement('div');
  container.className = 'revisions-container';
  for (const rev of revisions) {
    const item = document.createElement('div');
    item.className = 'revision-item glass-card';
    item.dataset.version = rev.version;

    const meta = document.createElement('div');
    meta.className = 'revision-meta';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'stat-number';
    dateSpan.textContent = new Date(rev.committed_at).toLocaleString();
    meta.appendChild(dateSpan);
    const userSpan = document.createElement('span');
    userSpan.className = 'micro-label';
    userSpan.textContent = `By ${rev.user?.login || 'Unknown'}`;
    meta.appendChild(userSpan);
    item.appendChild(meta);

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-ghost btn-sm';
    viewBtn.dataset.action = 'view-revision';
    viewBtn.dataset.version = rev.version;
    viewBtn.textContent = 'View';
    item.appendChild(viewBtn);

    container.appendChild(item);
  }
  wrapper.appendChild(container);
  frag.appendChild(wrapper);
  return frag;
}

export function bindDetailEvents(
  container: HTMLElement,
  {
    onBack,
    onEdit,
    onViewRevision,
  }: {
    onBack: () => void;
    onEdit: (id: string) => void;
    onViewRevision: (id: string, version: string) => void;
  },
  signal?: AbortSignal
): void {
  const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id') ?? null;

  // Shortcut for Copy URL
  container.addEventListener(
    'keydown',
    (e) => {
      if (e.key.toLowerCase() === 'c') {
        const activeEl = document.activeElement;
        const isInputActive =
          activeEl?.tagName === 'INPUT' ||
          activeEl?.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable;
        if (!isInputActive) {
          e.preventDefault();
          void copyGistUrl(container, signal);
        }
      }
    },
    { signal }
  );

  container.querySelector('#gist-back-btn')?.addEventListener('click', onBack, { signal });
  container.querySelector('[data-action="edit"]')?.addEventListener(
    'click',
    () => {
      if (gistId) onEdit(gistId);
    },
    { signal }
  );

  container.querySelector('[data-action="revisions"]')?.addEventListener(
    'click',
    () => {
      void (async () => {
        if (!gistId) return;
        try {
          const revisions = await GitHub.listGistRevisions(gistId);
          if (signal?.aborted) return;
          container.replaceChildren(renderRevisions(gistId, revisions));
          bindRevisionEvents(
            container,
            {
              onBack: () =>
                void loadGistDetail(gistId, container, onBack, onEdit, onViewRevision, signal),
              onViewRevision,
            },
            signal
          );
        } catch {
          toast.error('Failed to load revisions');
        }
      })();
    },
    { signal }
  );

  // Star button
  container.querySelector('[data-action="star"]')?.addEventListener(
    'click',
    () => {
      void (async () => {
        if (!gistId) return;
        const ok = await gistStore.toggleStar(gistId);
        if (signal?.aborted) return;
        if (ok) void loadGistDetail(gistId, container, onBack, onEdit, onViewRevision, signal);
      })();
    },
    { signal }
  );

  // Line numbers toggle
  container.querySelector('[data-action="toggle-line-numbers"]')?.addEventListener(
    'click',
    () => {
      const btn = container.querySelector('[data-action="toggle-line-numbers"]');
      if (!btn) return;
      const isActive = btn.classList.toggle('active');
      btn.setAttribute('aria-pressed', String(isActive));
      const pres = container.querySelectorAll('.code-block');
      for (const pre of Array.from(pres) as HTMLPreElement[]) {
        applyLineNumbers(pre, isActive);
      }
    },
    { signal }
  );

  // Tag assignment
  void loadTagAssignment(container, gistId, signal);

  container.querySelector('[data-action="add-tag"]')?.addEventListener(
    'click',
    () => {
      void showTagAssignmentDialog(container, gistId, signal);
    },
    { signal }
  );

  // File Tabs
  const tabs = container.querySelectorAll('.file-tab');
  tabs.forEach((tab) => {
    tab.addEventListener(
      'click',
      () => {
        const fileKey = (tab as HTMLElement).dataset.fileKey;
        if (!fileKey) return;

        // Update active tab UI
        tabs.forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
          t.setAttribute('tabindex', '-1');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        tab.setAttribute('tabindex', '0');

        // Update content
        {
          if (!gistId) return;
          const gist = gistStore.getGist(gistId);
          if (signal?.aborted) return;
          if (!gist) return;
          const file = gist.files[fileKey];
          if (!file) return;

          const contentArea = container.querySelector('#file-content-area');
          if (contentArea) {
            // Brief cross-fade so the content swap reads as motion, not a
            // snap. 100ms exit + 150ms enter = 250ms total. The exit half
            // is shorter than the enter half so arriving content "wins".
            contentArea.classList.add('is-switching');
            window.setTimeout(() => {
              if (signal?.aborted) return;
              contentArea.replaceChildren(buildFileContent(file.content || '', file.language));
              contentArea.setAttribute('aria-labelledby', tab.id);
              contentArea.classList.remove('is-switching');
              void highlightVisibleCode(container, signal);
            }, 100);
          }

          const infoArea = container.querySelector('#file-info');
          if (infoArea) {
            infoArea.replaceChildren();
            const infoLeft = document.createElement('div');
            infoLeft.className = 'file-info-left';
            const langSpan = document.createElement('span');
            langSpan.className = 'micro-label';
            langSpan.textContent = `Language: ${file.language || 'Unknown'}`;
            infoLeft.appendChild(langSpan);
            const rawSpan = document.createElement('span');
            rawSpan.className = 'micro-label';
            rawSpan.textContent = 'Raw URL: ';
            const rawLink = document.createElement('a');
            rawLink.href = sanitizeUrl(file.rawUrl || '');
            rawLink.target = '_blank';
            rawLink.rel = 'noopener noreferrer';
            rawLink.textContent = 'Link';
            rawSpan.appendChild(rawLink);
            infoLeft.appendChild(rawSpan);
            infoArea.appendChild(infoLeft);
            const copyContentBtn = document.createElement('button');
            copyContentBtn.className = 'btn btn-ghost btn-copy-sm';
            copyContentBtn.dataset.action = 'copy-content';
            copyContentBtn.setAttribute('aria-label', 'Copy file content');
            const copyLabel = document.createElement('span');
            copyLabel.className = 'micro-label';
            copyLabel.textContent = 'COPY';
            copyContentBtn.appendChild(copyLabel);
            infoArea.appendChild(copyContentBtn);
          }
        }
      },
      { signal }
    );
  });

  // Keyboard navigation for tabs (Roving Tabindex)
  const tabList = container.querySelector('[role="tablist"]');
  if (tabList) {
    tabList.addEventListener(
      'keydown',
      (e) => {
        const event = e as KeyboardEvent;
        const target = event.target as HTMLElement;
        if (target.getAttribute('role') !== 'tab') return;

        const tabNodes = Array.from(tabList.querySelectorAll('[role="tab"]')) as HTMLElement[];
        const currentIndex = tabNodes.indexOf(target);

        let nextIndex = -1;
        if (event.key === 'ArrowRight') {
          nextIndex = (currentIndex + 1) % tabNodes.length;
        } else if (event.key === 'ArrowLeft') {
          nextIndex = (currentIndex - 1 + tabNodes.length) % tabNodes.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = tabNodes.length - 1;
        }

        if (nextIndex !== -1) {
          event.preventDefault();
          const nextTab = tabNodes[nextIndex];
          if (nextTab) {
            nextTab.focus();
            nextTab.click();
          }
        }
      },
      { signal }
    );
  }

  // Copy Content
  if (container.dataset.copyBound !== 'true') {
    container.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;

        // Copy file content
        const copyBtn = target.closest('[data-action="copy-content"]') as HTMLElement;
        if (copyBtn && !copyBtn.classList.contains('btn-success')) {
          void (async () => {
            const contentArea = container.querySelector('#file-content-area code');
            if (!contentArea) return;

            const text = contentArea.textContent || '';
            try {
              if (!navigator.clipboard) {
                throw new Error('Clipboard API not available');
              }
              await navigator.clipboard.writeText(text);
              if (signal?.aborted) return;

              const originalChildren = Array.from(copyBtn.childNodes).map((n) => n.cloneNode(true));
              copyBtn.replaceChildren();
              const copiedSpan = document.createElement('span');
              copiedSpan.className = 'micro-label';
              copiedSpan.textContent = 'COPIED';
              copyBtn.appendChild(copiedSpan);
              copyBtn.classList.add('btn-success');
              copyBtn.classList.add('is-state-changed');
              toast.success('COPIED TO CLIPBOARD');

              setTimeout(() => {
                if (signal?.aborted) return;
                copyBtn.replaceChildren(...originalChildren);
                copyBtn.classList.remove('btn-success');
                copyBtn.classList.remove('is-state-changed');
              }, 2000);
            } catch (err) {
              safeError('Failed to copy', err);
              toast.error('COPY FAILED');
            }
          })();
          return;
        }

        // Copy gist URL
        if (target.closest('[data-action="copy-url"]')) {
          void copyGistUrl(container, signal);
          return;
        }

        // Share gist (Web Share API, with clipboard fallback)
        if (target.closest('[data-action="share"]')) {
          void shareGist(container, signal);
          return;
        }

        // Download gist as JSON
        if (target.closest('[data-action="download"]')) {
          const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
          if (gistId) {
            const gist = gistStore.getGist(gistId);
            if (gist) exportGistAsJsonInline(gist);
          }
          return;
        }

        if (target.closest('[data-action="download-zip"]')) {
          void (async () => {
            const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
            if (gistId) {
              const gist = gistStore.getGist(gistId);
              if (gist) {
                const { exportGistAsZip } = await import('../services/export-import');
                const blob = exportGistAsZip(gist);
                triggerDownload(blob, `${slugifyName(gist.description)}.zip`);
              }
            }
          })();
          return;
        }
      },
      { signal }
    );
    container.dataset.copyBound = 'true';

    // Reset copyBound when the signal aborts so revisiting the route will re-bind
    signal?.addEventListener(
      'abort',
      () => {
        delete container.dataset.copyBound;
      },
      { once: true }
    );
  }
}

async function copyGistUrl(container: HTMLElement, signal?: AbortSignal): Promise<void> {
  const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
  if (!gistId) return;
  const gist = gistStore.getGist(gistId);
  if (signal?.aborted) return;
  const url = gist?.htmlUrl;
  if (!url) {
    toast.error('No URL available for this gist');
    return;
  }

  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
    await navigator.clipboard.writeText(url);
    if (signal?.aborted) return;

    const copyBtn = container.querySelector<HTMLButtonElement>('[data-action="copy-url"]');
    if (copyBtn && !copyBtn.classList.contains('btn-success')) {
      const originalText = copyBtn.textContent ?? '';
      copyBtn.textContent = 'COPIED';
      copyBtn.classList.add('btn-success');
      copyBtn.classList.add('is-state-changed');

      setTimeout(() => {
        if (signal?.aborted) return;
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('btn-success');
        copyBtn.classList.remove('is-state-changed');
      }, 2000);
    }

    toast.success('URL COPIED TO CLIPBOARD');
  } catch (err) {
    safeError('Failed to copy URL', err);
    toast.error('COPY FAILED');
  }
}

async function shareGist(container: HTMLElement, signal?: AbortSignal): Promise<void> {
  const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
  if (!gistId) return;
  const gist = gistStore.getGist(gistId);
  if (signal?.aborted) return;
  if (!gist?.htmlUrl) {
    toast.error('Nothing to share for this gist');
    return;
  }
  const htmlUrl: string = gist.htmlUrl;

  // BOLT: Get first file without Object.values() allocation
  let firstFile: GistRecord['files'][string] | undefined;
  for (const key in gist.files) {
    if (Object.hasOwn(gist.files, key)) {
      firstFile = gist.files[key];
      break;
    }
  }

  const shareData: ShareData = {
    title: gist.description || 'Gist',
    text: firstFile?.content?.slice(0, 200) || gist.description || '',
    url: htmlUrl,
  };
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      // User cancellation throws AbortError — treat as a no-op
      if (err instanceof Error && err.name === 'AbortError') return;
      safeError('Share failed', err);
      await fallbackCopy(htmlUrl, signal);
    }
  } else {
    await fallbackCopy(htmlUrl, signal);
  }
}

async function fallbackCopy(url: string, signal?: AbortSignal): Promise<void> {
  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API not available');
    }
    await navigator.clipboard.writeText(url);
    if (signal?.aborted) return;
    toast.success('URL COPIED TO CLIPBOARD');
  } catch (err) {
    safeError('Fallback copy failed', err);
    toast.error('SHARE FAILED');
  }
}

function slugifyName(name: string | null | undefined): string {
  return (name || 'gist').replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportGistAsJsonInline(gist: GistRecord): void {
  const files: Record<string, { filename: string; content: string; language?: string }> = {};
  for (const key in gist.files) {
    if (Object.hasOwn(gist.files, key)) {
      const f = gist.files[key];
      if (!f) continue;
      Object.defineProperty(files, key, {
        value: {
          filename: f.filename,
          content: f.content ?? '',
          language: f.language,
        },
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
  }
  const data = {
    id: gist.id,
    description: gist.description,
    public: gist.public,
    createdAt: gist.createdAt,
    updatedAt: gist.updatedAt,
    files,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  triggerDownload(blob, `${slugifyName(gist.description)}.json`);
}

function bindRevisionEvents(
  container: HTMLElement,
  {
    onBack,
    onViewRevision,
  }: {
    onBack: () => void;
    onViewRevision: (id: string, version: string) => void;
  },
  signal?: AbortSignal
): void {
  const gistId = container.querySelector('.revisions-list')?.getAttribute('data-gist-id');
  container.querySelector('#gist-back-btn')?.addEventListener('click', () => onBack(), { signal });
  container.querySelectorAll('[data-action="view-revision"]').forEach((btn) => {
    btn.addEventListener(
      'click',
      (e) => {
        const version = (e.currentTarget as HTMLElement).getAttribute('data-version');
        if (gistId && version) onViewRevision(gistId, version);
      },
      { signal }
    );
  });
}

async function loadTagAssignment(
  container: HTMLElement,
  gistId: string | null,
  signal?: AbortSignal
): Promise<void> {
  if (!gistId) return;
  const tagsList = container.querySelector('#tag-assignment-list');
  if (!tagsList) return;

  const gistTags = await gistStore.getTagsForGist(gistId);
  if (signal?.aborted) return;

  tagsList.innerHTML =
    gistTags.length > 0
      ? renderTagChips(gistTags, true)
      : '<span class="micro-label">No tags assigned</span>';

  tagsList.querySelectorAll('[data-remove-tag]').forEach((btn) => {
    btn.addEventListener(
      'click',
      async (e) => {
        e.stopPropagation();
        const tagId = (btn as HTMLElement).dataset.removeTag;
        if (!tagId || !gistId) return;
        await gistStore.removeTag(gistId, tagId);
        void loadTagAssignment(container, gistId, signal);
      },
      { signal }
    );
  });
}

async function showTagAssignmentDialog(
  container: HTMLElement,
  gistId: string | null,
  signal?: AbortSignal
): Promise<void> {
  if (!gistId) return;

  const allTags = await gistStore.getAllTags();
  const gistTags = await gistStore.getTagsForGist(gistId);
  const gistTagIds = new Set(gistTags.map((t) => t.id));

  const existingDialog = container.querySelector('#tag-assignment-dialog');
  if (existingDialog) existingDialog.remove();

  const dialog = document.createElement('div');
  dialog.id = 'tag-assignment-dialog';
  dialog.className = 'tag-assignment';
  dialog.style.cssText =
    'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--spacing-v4); min-width: 300px; box-shadow: var(--shadow-lg);';

  const title = document.createElement('h3');
  title.className = 'form-label';
  title.textContent = 'Assign Tags';
  dialog.appendChild(title);

  const tagsList = document.createElement('div');
  tagsList.className = 'tag-assignment-list';
  tagsList.style.marginTop = 'var(--spacing-v2)';

  for (const tag of allTags) {
    const isSelected = gistTagIds.has(tag.id);
    const item = document.createElement('button');
    item.className = `tag-assignment-item${isSelected ? ' selected' : ''}`;
    item.style.cssText = `border-color: ${tag.color}; background: ${isSelected ? `${tag.color}20` : 'transparent'}; color: ${tag.color};`;
    item.textContent = tag.name;
    item.dataset.tagId = tag.id;

    item.addEventListener(
      'click',
      async () => {
        if (isSelected) {
          await gistStore.removeTag(gistId, tag.id);
        } else {
          await gistStore.assignTag(gistId, tag.id);
        }
        dialog.remove();
        void loadTagAssignment(container, gistId, signal);
      },
      { signal }
    );

    tagsList.appendChild(item);
  }

  dialog.appendChild(tagsList);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-ghost btn-sm';
  closeBtn.textContent = 'Close';
  closeBtn.style.marginTop = 'var(--spacing-v2)';
  closeBtn.addEventListener('click', () => dialog.remove(), { signal });
  dialog.appendChild(closeBtn);

  document.body.appendChild(dialog);
}
