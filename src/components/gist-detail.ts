import { GistRecord } from '../types';
import { GistRevision } from '../types/api';
import * as GitHub from '../services/github/client';
import { toast } from './ui/toast';
import { safeError } from '../services/security/logger';

const esc = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export function formatSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function renderFileContent(content: string, language?: string): string {
  return `<pre class="code-block language-${esc(language || 'text')}"><code>${esc(content)}</code></pre>`;
}

export function renderGistDetail(gist: GistRecord): string {
  const title = gist.description || 'Untitled Gist';
  const description = gist.description
    ? `<p class="gist-description-text">${esc(gist.description)}</p>`
    : '';
  const fileCount = Object.keys(gist.files).length;
  const visibility = gist.public ? 'Public' : 'Secret';
  const starLabel = gist.starred ? 'Unstar' : 'Star';
  const starIcon = gist.starred ? '★' : '☆';

  const fileTabs =
    fileCount > 1
      ? `<div class="file-tabs scroll-x" role="tablist">${Object.entries(gist.files)
          .map(
            ([key, file], index) =>
              `<button class="file-tab ${index === 0 ? 'active' : ''}" data-file-key="${esc(key)}" id="tab-${index}" role="tab" aria-selected="${index === 0}" aria-controls="file-content-area">${esc(file.filename)}</button>`
          )
          .join('')}</div>`
      : '';

  const firstFileKey = Object.keys(gist.files)[0];
  const firstFile = firstFileKey ? gist.files[firstFileKey] : null;
  const content = firstFile?.content
    ? renderFileContent(firstFile.content, firstFile.language)
    : '<p class="empty-content">No content available</p>';

  return `
    <div class="gist-detail" data-gist-id="${esc(gist.id)}">
      <div class="gist-detail-header">
        <button class="back-btn" id="gist-back-btn" aria-label="Go back">← Back</button>
        <div class="gist-detail-title">
          <h2 class="gist-title">${esc(title)}</h2>
          ${description}
        </div>
      </div>
      <div class="gist-meta-bar">
        <span class="meta-item">${visibility}</span>
        <span class="meta-item">📄 ${fileCount} file${fileCount !== 1 ? 's' : ''}</span>
        <span class="meta-item">🕒 Updated ${new Date(gist.updatedAt).toLocaleDateString()}</span>
        <div class="gist-detail-actions">
          <button class="action-btn star-btn ${gist.starred ? 'starred' : ''}" data-action="star" aria-label="${starLabel}">${starIcon} ${starLabel}</button>
          <button class="action-btn fork-btn" data-action="fork" aria-label="Fork gist">🍴 Fork</button>
          <button class="action-btn edit-btn" data-action="edit" aria-label="Edit gist">✏️ Edit</button>
          <button class="action-btn revisions-btn" data-action="revisions" aria-label="View revisions">📜 Revisions</button>
          <a href="${esc(gist.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="action-btn github-btn" aria-label="Open on GitHub">🔗 GitHub</a>
        </div>
      </div>
      ${fileTabs}
      <div class="file-content-area" id="file-content-area" role="tabpanel" aria-labelledby="tab-0">${content}</div>
      <div class="file-info" id="file-info">${firstFile ? `<span>Language: ${esc(firstFile.language || 'Unknown')}</span><span>Size: ${formatSize(firstFile.size)}</span>` : ''}</div>
    </div>
  `;
}

export async function loadGistDetail(
  id: string,
  container: HTMLElement,
  onBack: () => void,
  onEdit: (id: string) => void,
  onViewRevision: (id: string, version: string) => void
): Promise<void> {
  try {
    const gist = await GitHub.getGist(id);
    container.innerHTML = renderGistDetail(gist as unknown as GistRecord);
    bindDetailEvents(container, { onBack, onEdit, onViewRevision });
  } catch (err) {
    safeError('[GistDetail] Failed to load gist', err);
    toast.error('Failed to load gist details');
  }
}

export function renderRevisions(gistId: string, revisions: GistRevision[]): string {
  const revisionsHtml = revisions
    .map((rev) => {
      const date = new Date(rev.committed_at).toLocaleString();
      return `<div class="revision-item" data-version="${esc(rev.version)}"><div class="revision-meta"><span class="revision-date">${date}</span><span class="revision-user">by ${esc(rev.user?.login || 'unknown')}</span></div><div class="revision-actions"><button class="btn btn-sm" data-action="view-revision" data-version="${esc(rev.version)}">View</button></div></div>`;
    })
    .join('');
  return `<div class="revisions-list" data-gist-id="${esc(gistId)}"><div class="revisions-header"><button class="back-btn" id="gist-back-btn" aria-label="Go back">← Back</button><h2>Revisions (${revisions.length})</h2></div>${revisionsHtml}</div>`;
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
  }
): void {
  const gistId = container.querySelector('.gist-detail')?.getAttribute('data-gist-id');
  container.querySelector('#gist-back-btn')?.addEventListener('click', onBack);
  container.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
    if (gistId) onEdit(gistId);
  });
  container.querySelector('[data-action="revisions"]')?.addEventListener('click', async () => {
    if (!gistId) return;
    try {
      const revisions = await GitHub.listGistRevisions(gistId);
      container.innerHTML = renderRevisions(gistId, revisions);
      bindRevisionEvents(container, {
        onBack: () => loadGistDetail(gistId, container, onBack, onEdit, onViewRevision),
        onViewRevision,
      });
    } catch {
      toast.error('Failed to load revisions');
    }
  });
}

function bindRevisionEvents(
  container: HTMLElement,
  {
    onBack,
    onViewRevision,
  }: { onBack: () => void; onViewRevision: (id: string, version: string) => void }
): void {
  const gistId = container.querySelector('.revisions-list')?.getAttribute('data-gist-id');
  container.querySelector('#gist-back-btn')?.addEventListener('click', onBack);
  container.querySelectorAll('[data-action="view-revision"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const version = (e.currentTarget as HTMLElement).getAttribute('data-version');
      if (gistId && version) onViewRevision(gistId, version);
    });
  });
}
