/**
 * GitHub Gist API Types
 */

/**
 * Gist file as returned by GitHub API
 */
export interface GistFile {
  filename: string;
  type?: string;
  language?: string;
  raw_url?: string;
  size?: number;
  truncated?: boolean;
  content?: string;
}

/**
 * Gist owner information
 */
export interface GistOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  gravatar_id?: string;
}

/**
 * GitHub Gist API response
 */
export interface GitHubGist {
  id: string;
  node_id: string;
  git_pull_url: string;
  git_push_url: string;
  html_url: string;
  files: Record<string, GistFile>;
  public: boolean;
  created_at: string;
  updated_at: string;
  description: string | null;
  comments: number;
  user: GistOwner | null;
  comments_url: string;
  owner?: GistOwner;
  truncated?: boolean;
}

/**
 * Request payload for creating a gist
 */
export interface CreateGistRequest {
  description?: string;
  public: boolean;
  files: Record<string, { content: string }>;
}

/**
 * Request payload for updating a gist
 */
export interface UpdateGistRequest {
  description?: string;
  public?: boolean;
  files?: Record<string, { content?: string; filename?: string } | null>;
}

/**
 * Gist revision/history item
 */
export interface GistRevision {
  url: string;
  version: string;
  user: GistOwner;
  change_summary: Record<string, { status: 'added' | 'modified' | 'deleted' }>;
  committed_at: string;
  node_id: string;
}

/**
 * GitHub API error response
 */
export interface GitHubError {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

/**
 * Pagination metadata parsed from GitHub Link headers
 */
export interface PaginationInfo {
  nextPage: number | null;
  prevPage: number | null;
  firstPage: number | null;
  lastPage: number | null;
  totalPages: number | null;
}

/**
 * Paginated API result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

/**
 * Authentication token info
 */
export interface TokenInfo {
  isValid: boolean;
  scopes?: string[];
  username?: string;
  error?: string;
}
