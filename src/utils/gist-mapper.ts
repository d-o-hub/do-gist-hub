import type { GistRecord } from '../services/db';
import type { GitHubGist, GitHubGistListItem } from '../types/api';

/**
 * Convert a GitHub API gist response to a local GistRecord.
 * Shared between GistStore and SyncQueue to avoid duplication.
 */
export function githubGistToRecord(
  gist: GitHubGist | GitHubGistListItem,
  starred = false,
  existingRecord?: GistRecord
): GistRecord {
  return {
    id: gist.id,
    description: gist.description,
    files: Object.fromEntries(
      Object.entries(gist.files).map(([k, f]) => {
        const content: string | undefined =
          'content' in f && typeof f.content === 'string' ? f.content : undefined;

        return [
          k,
          {
            ...f,
            content: content ?? existingRecord?.files[k]?.content,
            rawUrl: f.raw_url,
          },
        ];
      })
    ),
    htmlUrl: gist.html_url,
    gitPullUrl: gist.git_pull_url,
    gitPushUrl: gist.git_push_url,
    createdAt: gist.created_at,
    updatedAt: gist.updated_at,
    starred,
    public: gist.public,
    owner: gist.owner
      ? {
          login: gist.owner.login,
          id: gist.owner.id,
          avatarUrl: gist.owner.avatar_url,
          htmlUrl: gist.owner.html_url,
        }
      : undefined,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  };
}
