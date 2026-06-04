/**
 * Gist Detail Component
 * Redesigned for App Mode
 */

import * as GitHub from '../services/github/client';
import { safeError } from '../services/security/logger';
import gistStore from '../stores/gist-store';
import type { GistRecord } from '../types';
import type { GistRevision } from '../types/api';
import { toast } from './ui/toast';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function buildFileContent(content: string, language?: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const pre = document.createElement('pre');
  pre.className = `code-block language-${language?.replace(/[^a-z0-9-]/gi, '') || 'text'}`;
  const code = document.createElement('code');
  code.textContent = content;
  pre.appendChild(code);
  frag.appendChild(pre);
  return frag;
}

export function renderGistDetail(gist: GistRecord): DocumentFragment {
  const title = gist.description || 'Untitled Gist';
  const fileCount = Object.keys(gist.files).length;
  const visibility = gist.public ? 'Public' : 'Secret';
  const frag = document.createDocumentFragment();

  const wrapper = document.createElement('div');
  wrapper.className = 'gist-detail';
  wrapper.dataset.gistId = gist.id;

  // ── Header ───────────────────────────────────────────────────────
  const header = document.createElement('header');
  header.className = 'detail-header';
  header.style.viewTransitionName = 'detail-header';

  const headerTop = document.createElement('div');
  headerTop.className = 'header-top';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost';
  backBtn.id = 'gist-back-btn';
  backBtn.setAttribute('aria-label', 'Go back');
  backBtn.textContent = '← Back';
  headerTop.appendChild(backBtn);
  const detailLabel = document.createElement('span');
  detailLabel.className = 'micro-label';
  detailLabel.textContent = 'Gist Detail';
  headerTop.appendChild(detailLabel);
  header.appendChild(headerTop);

  const h1 = document.createElement('h1');
  h1.className = 'detail-title';
  h1.textContent = title;
  header.appendChild(h1);

  const metaRow = document.createElement('div');
  metaRow.className = 'detail-meta-row';
  const filesChip = document.createElement('span');
  filesChip.className = 'detail-chip';
  filesChip.textContent = `${fileCount} Files`;
  metaRow.appendChild(filesChip);
  const visChip = document.createElement('span');
  visChip.className = 'detail-chip';
  visChip.textContent = visibility;
  metaRow.appendChild(visChip);
  const timeEl = document.createElement('time');
  timeEl.className = 'micro-label';
  timeEl.dateTime = gist.updatedAt;
  timeEl.textContent = `Updated ${formatRelativeTime(gist.updatedAt)}`;
  metaRow.appendChild(timeEl);
  header.appendChild(metaRow);

  const actions = document.createElement('div');
  actions.className = 'gist-detail-actions';
  const starBtn = document.createElement('button');
  starBtn.className = `btn ${gist.starred ? 'btn-danger' : 'btn-primary'}`;
  starBtn.dataset.action = 'star';
  starBtn.textContent = gist.starred ? 'Unstar' : 'Star';
  actions.appendChild(starBtn);
  const forkBtn = document.createElement('button');
  forkBtn.className = 'btn btn-ghost';
  forkBtn.dataset.action = 'fork';
  forkBtn.textContent = 'Fork';
  actions.appendChild(forkBtn);
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-ghost';
  editBtn.dataset.action = 'edit';
  editBtn.textContent = 'Edit';
  actions.appendChild(editBtn);
  const revisionsBtn = document.createElement('button');
  revisionsBtn.className = 'btn btn-ghost';
  revisionsBtn.dataset.action = 'revisions';
  revisionsBtn.textContent = 'Revisions';
  actions.appendChild(revisionsBtn);
  if (gist.htmlUrl) {
    const githubLink = document.createElement('a');
    githubLink.className = 'btn btn-ghost';
    githubLink.dataset.action = 'open-github';
    githubLink.href = gist.htmlUrl;
    githubLink.target = '_blank';
    githubLink.rel = 'noopener noreferrer';
    githubLink.textContent = 'Open in GitHub';
    actions.appendChild(githubLink);
    const copyUrlBtn = document.createElement('button');
    copyUrlBtn.className = 'btn btn-ghost';
    copyUrlBtn.dataset.action = 'copy-url';
    copyUrlBtn.textContent = 'Copy URL';
    actions.appendChild(copyUrlBtn);
  }
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-ghost';
  shareBtn.dataset.action = 'share';
  shareBtn.textContent = 'Share';
  if (typeof navigator === 'undefined' || !('share' in navigator)) {
    shareBtn.hidden = true;
  }
  actions.appendChild(shareBtn);
  header.appendChild(actions);
  wrapper.appendChild(header);

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
  const firstFileKey = Object.keys(gist.files)[0];
  const firstFile = firstFileKey ? gist.files[firstFileKey] : null;
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
    rawLink.href = firstFile.rawUrl || '';
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
  } catch (err) {
    safeError('[GistDetail] Failed to load gist', err);
    toast.error('Failed to load gist details');
    const errWrapper = document.createElement('div');
    errWrapper.className = 'empty-state-container';
    errWrapper.setAttribute('role', 'alert');
    const errTitle = document.createElement('h3');
    errTitle.className = 'empty-state-title';
    errTitle.textContent = 'Gist Not Found';
    errWrapper.appendChild(errTitle);
    const errDesc = document.createElement('p');
    errDesc.className = 'empty-state-description';
    errDesc.textContent =
      'This gist may have been deleted or you do not have permission to view it.';
    errWrapper.appendChild(errDesc);
    const errBtn = document.createElement('button');
    errBtn.className = 'btn btn-primary';
    errBtn.id = 'gist-back-btn';
    errBtn.textContent = 'Go Back';
    errWrapper.appendChild(errBtn);
    container.replaceChildren(errWrapper);
    container.querySelector('#gist-back-btn')?.addEventListener('click', onBack, { signal });
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
  backBtn.textContent = '← Back';
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
  const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
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
        const ok = await (await import('../stores/gist-store')).default.toggleStar(gistId);
        if (signal?.aborted) return;
        if (ok) void loadGistDetail(gistId, container, onBack, onEdit, onViewRevision, signal);
      })();
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
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        // Update content
        void (async () => {
          if (!gistId) return;
          const gist = await (await import('../stores/gist-store')).default.getGist(gistId);
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
            rawLink.href = file.rawUrl || '';
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
        })();
      },
      { signal }
    );
  });

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
              copiedSpan.textContent = '✅ COPIED!';
              copyBtn.appendChild(copiedSpan);
              copyBtn.classList.add('btn-success');
              toast.success('COPIED TO CLIPBOARD');

              setTimeout(() => {
                if (signal?.aborted) return;
                copyBtn.replaceChildren(...originalChildren);
                copyBtn.classList.remove('btn-success');
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
  const gist = await (await import('../stores/gist-store')).default.getGist(gistId);
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
    toast.success('URL COPIED TO CLIPBOARD');
  } catch (err) {
    safeError('Failed to copy URL', err);
    toast.error('COPY FAILED');
  }
}

async function shareGist(container: HTMLElement, signal?: AbortSignal): Promise<void> {
  const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
  if (!gistId) return;
  const gist = await (await import('../stores/gist-store')).default.getGist(gistId);
  if (signal?.aborted) return;
  if (!gist?.htmlUrl) {
    toast.error('Nothing to share for this gist');
    return;
  }
  const htmlUrl: string = gist.htmlUrl;
  const firstFile = Object.values(gist.files)[0];
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

function bindRevisionEvents(
  container: HTMLElement,
  {
    onBack,
    onViewRevision,
  }: { onBack: () => void; onViewRevision: (id: string, version: string) => void },
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
