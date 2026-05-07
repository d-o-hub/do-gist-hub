/**
 * Comment Thread Component
 * Displays and manages comments for a gist
 */

import { sanitizeHtml } from '../services/security/dom';
import {
  getCommentsByGistId,
  saveComment,
  deleteComment,
  type CommentRecord,
} from '../services/db';
import * as GitHub from '../services/github';
import syncQueue from '../services/sync/queue';
import networkMonitor from '../services/network/offline-monitor';
import { safeError } from '../services/security/logger';

/**
 * Render the complete comment thread for a gist
 */
export function renderCommentThread(
  gistId: string,
  comments: CommentRecord[],
  currentUsername: string
): string {
  const sortedComments = comments.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return `
    <div class="comment-thread" data-gist-id="${sanitizeHtml(gistId)}">
      <div class="comment-header">
        <h3>Comments (${comments.length})</h3>
      </div>
      
      <div class="comment-list">
        ${sortedComments.map((comment) => renderComment(comment, currentUsername)).join('')}
      </div>
      
      <form class="comment-form" data-action="create">
        <label for="comment-body-${sanitizeHtml(gistId)}" class="sr-only">Add a comment</label>
        <textarea
          id="comment-body-${sanitizeHtml(gistId)}"
          class="comment-input"
          placeholder="Add a comment..."
          rows="3"
          required
        ></textarea>
        <div class="comment-form-actions">
          <button type="submit" class="btn btn-primary">
            ${networkMonitor.isOnline() ? 'Comment' : 'Queue Comment (Offline)'}
          </button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Render a single comment
 */
export function renderComment(comment: CommentRecord, currentUsername: string): string {
  const isOwn = comment.user.login === currentUsername;
  const isPending = comment.syncStatus === 'pending';
  const formattedDate = new Date(comment.createdAt).toLocaleString();

  return `
    <div class="comment-item" data-comment-id="${comment.id}">
      <div class="comment-header">
        <img 
          src="${sanitizeHtml(comment.user.avatarUrl)}" 
          alt="${sanitizeHtml(comment.user.login)}"
          class="avatar-sm"
        />
        <div class="comment-meta">
          <a href="${sanitizeHtml(comment.user.htmlUrl)}" target="_blank" rel="noopener noreferrer" class="comment-author">
            ${sanitizeHtml(comment.user.login)}
          </a>
          <span class="comment-date">${sanitizeHtml(formattedDate)}</span>
          ${isPending ? '<span class="chip chip-warning">Pending sync</span>' : ''}
        </div>
        ${
          isOwn
            ? `
          <div class="comment-actions">
            <button class="btn btn-sm btn-ghost" data-action="edit" title="Edit comment">
              <span aria-hidden="true">✏️</span>
              <span class="sr-only">Edit</span>
            </button>
            <button class="btn btn-sm btn-ghost" data-action="delete" title="Delete comment">
              <span aria-hidden="true">🗑️</span>
              <span class="sr-only">Delete</span>
            </button>
          </div>
        `
            : ''
        }
      </div>
      <div class="comment-body">${sanitizeHtml(comment.body)}</div>
    </div>
  `;
}

/**
 * Load comments and bind event handlers
 */
export async function loadComments(
  gistId: string,
  container: HTMLElement,
  currentUsername: string
): Promise<void> {
  try {
    // Load from IndexedDB first
    let comments = await getCommentsByGistId(gistId);

    // If online, fetch latest from GitHub
    if (networkMonitor.isOnline()) {
      try {
        const result = await GitHub.listGistComments(gistId);
        const { saveComments } = await import('../services/db');

        // Convert GitHub comments to records
        const commentRecords: CommentRecord[] = result.data.map((comment) => ({
          id: comment.id,
          gistId,
          body: comment.body,
          user: {
            login: comment.user.login,
            id: comment.user.id,
            avatarUrl: comment.user.avatar_url,
            htmlUrl: comment.user.html_url,
          },
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          authorAssociation: comment.author_association,
          syncStatus: 'synced' as const,
          lastSyncedAt: new Date().toISOString(),
        }));

        await saveComments(commentRecords);
        comments = commentRecords;
      } catch (error) {
        safeError('[CommentThread] Failed to fetch comments from GitHub:', error);
        // Continue with cached comments
      }
    }

    // Render comments
    container.innerHTML = renderCommentThread(gistId, comments, currentUsername);

    // Bind event handlers
    bindCommentEvents(container, gistId, currentUsername);
  } catch (error) {
    safeError('[CommentThread] Failed to load comments:', error);
    container.innerHTML = `
      <div class="error-message">
        <p>Failed to load comments. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Bind event handlers for comment interactions
 */
export function bindCommentEvents(
  container: HTMLElement,
  gistId: string,
  currentUsername: string
): void {
  // Handle comment form submission
  const form = container.querySelector('.comment-form') as HTMLFormElement;
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void (async () => {
        const textarea = form.querySelector('.comment-input') as HTMLTextAreaElement;
        const body = textarea.value.trim();

        if (!body) return;

        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitBtn.disabled = true;

        try {
          if (networkMonitor.isOnline()) {
            // Create comment online
            const comment = await GitHub.createGistComment(gistId, { body });
            const commentRecord: CommentRecord = {
              id: comment.id,
              gistId,
              body: comment.body,
              user: {
                login: comment.user.login,
                id: comment.user.id,
                avatarUrl: comment.user.avatar_url,
                htmlUrl: comment.user.html_url,
              },
              createdAt: comment.created_at,
              updatedAt: comment.updated_at,
              authorAssociation: comment.author_association,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
            };
            await saveComment(commentRecord);
          } else {
            // Queue for offline sync
            const tempId = Date.now(); // Temporary ID for offline comment
            const commentRecord: CommentRecord = {
              id: tempId,
              gistId,
              body,
              user: {
                login: currentUsername,
                id: 0, // Will be updated when synced
                avatarUrl: '',
                htmlUrl: '',
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              authorAssociation: 'OWNER',
              syncStatus: 'pending',
            };
            await saveComment(commentRecord);
            await syncQueue.queueOperation(gistId, 'createComment', { body });
          }

          // Reload comments
          await loadComments(gistId, container, currentUsername);
          textarea.value = '';
        } catch (error) {
          safeError('[CommentThread] Failed to create comment:', error);
          alert('Failed to create comment. Please try again.');
        } finally {
          submitBtn.disabled = false;
        }
      })();
    });
  }

  // Handle edit button clicks
  container.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      void (async () => {
        const commentItem = (e.target as HTMLElement).closest('.comment-item');
        if (!commentItem) return;

        const commentId = parseInt(commentItem.getAttribute('data-comment-id') || '0', 10);
        const comment = await getCommentsByGistId(gistId).then((comments) =>
          comments.find((c) => c.id === commentId)
        );

        if (!comment) return;

        const newBody = prompt('Edit comment:', comment.body);
        if (!newBody || newBody === comment.body) return;

        try {
          if (networkMonitor.isOnline()) {
            const updated = await GitHub.updateGistComment(gistId, commentId, { body: newBody });
            const commentRecord: CommentRecord = {
              id: updated.id,
              gistId,
              body: updated.body,
              user: {
                login: updated.user.login,
                id: updated.user.id,
                avatarUrl: updated.user.avatar_url,
                htmlUrl: updated.user.html_url,
              },
              createdAt: updated.created_at,
              updatedAt: updated.updated_at,
              authorAssociation: updated.author_association,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
            };
            await saveComment(commentRecord);
          } else {
            // Queue for offline sync
            await syncQueue.queueOperation(gistId, 'updateComment', {
              commentId,
              body: newBody,
            });
            comment.body = newBody;
            comment.syncStatus = 'pending';
            await saveComment(comment);
          }

          // Reload comments
          await loadComments(gistId, container, currentUsername);
        } catch (error) {
          safeError('[CommentThread] Failed to update comment:', error);
          alert('Failed to update comment. Please try again.');
        }
      })();
    });
  });

  // Handle delete button clicks
  container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      void (async () => {
        const commentItem = (e.target as HTMLElement).closest('.comment-item');
        if (!commentItem) return;

        const commentId = parseInt(commentItem.getAttribute('data-comment-id') || '0', 10);

        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
          if (networkMonitor.isOnline()) {
            await GitHub.deleteGistComment(gistId, commentId);
            await deleteComment(commentId);
          } else {
            // Queue for offline sync
            await syncQueue.queueOperation(gistId, 'deleteComment', { commentId });
            await deleteComment(commentId);
          }

          // Reload comments
          await loadComments(gistId, container, currentUsername);
        } catch (error) {
          safeError('[CommentThread] Failed to delete comment:', error);
          alert('Failed to delete comment. Please try again.');
        }
      })();
    });
  });
}
