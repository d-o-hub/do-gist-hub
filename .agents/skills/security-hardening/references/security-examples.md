# Security Hardening Code Examples

## CSP Configuration

```typescript
// vite.config.ts - CSP headers
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self'",
        "connect-src 'self' https://api.github.com",
        "media-src 'self'",
        "object-src 'none'",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
});
```

## Token Management

```typescript
// src/services/auth/token-manager.ts
const REDACTED = '[REDACTED]';

export class TokenManager {
  private static readonly STORAGE_KEY = 'gist-hub-pat';

  static async saveToken(token: string): Promise<void> {
    const db = await getDatabase();
    await db.putAppState({
      key: this.STORAGE_KEY,
      value: this.encryptToken(token),
      updatedAt: Date.now(),
    });
  }

  static async getToken(): Promise<string | null> {
    const db = await getDatabase();
    const record = await db.getAppState(this.STORAGE_KEY);
    if (!record) return null;
    return this.decryptToken(record.value as string);
  }

  static async wipeToken(): Promise<void> {
    const db = await getDatabase();
    await db.deleteAppState(this.STORAGE_KEY);
  }

  static redactToken(token: string): string {
    if (token.length <= 8) return REDACTED;
    return `${token.slice(0, 4)}...${REDACTED}`;
  }

  private static encryptToken(token: string): string {
    // Use Web Crypto API with user-specific key
    return btoa(token); // Placeholder
  }

  private static decryptToken(encrypted: string): string {
    return atob(encrypted); // Placeholder
  }
}
```

## Input Validation

```typescript
// src/lib/validation/input-validator.ts
const MAX_TITLE_LENGTH = 100;
const MAX_FILENAME_LENGTH = 255;
const MAX_FILE_SIZE = 500 * 1024; // 500KB
const MAX_FILES_PER_GIST = 50;
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

export function validateGistTitle(title: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!title.trim()) {
    errors.push({ field: 'title', code: 'VALIDATION_GIST_TITLE_REQUIRED', message: 'Title is required' });
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.push({ field: 'title', code: 'VALIDATION_TITLE_TOO_LONG', message: `Title must be under ${MAX_TITLE_LENGTH} characters` });
  }
  return errors;
}

export function validateFileName(name: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!name.trim()) {
    errors.push({ field: 'filename', code: 'VALIDATION_FILE_NAME_REQUIRED', message: 'Filename is required' });
  } else if (name.length > MAX_FILENAME_LENGTH) {
    errors.push({ field: 'filename', code: 'VALIDATION_FILE_NAME_TOO_LONG', message: `Filename must be under ${MAX_FILENAME_LENGTH} characters` });
  } else if (!SAFE_FILENAME_REGEX.test(name)) {
    errors.push({ field: 'filename', code: 'VALIDATION_FILE_NAME_INVALID', message: 'Filename contains invalid characters' });
  }
  return errors;
}

export function validateFileSize(size: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (size > MAX_FILE_SIZE) {
    errors.push({ field: 'content', code: 'VALIDATION_CONTENT_TOO_LARGE', message: `File size exceeds ${MAX_FILE_SIZE / 1024}KB limit` });
  }
  return errors;
}
```

## XSS Prevention

```typescript
// src/lib/safe/sanitizer.ts
export function sanitizeHTML(input: string): string {
  const div = document.createElement('div');
  div.textContent = input; // Auto-escapes
  return div.innerHTML;
}

export function createSafeLink(url: string, text: string): string {
  const safeUrl = url.startsWith('http') ? url : `https://${url}`;
  const escapedText = sanitizeHTML(text);
  return `<a href="${safeUrl}" rel="noopener noreferrer" target="_blank">${escapedText}</a>`;
}
```

## Safe Content Rendering

```typescript
// src/lib/safe/content-renderer.ts
export function renderGistContent(content: string): HTMLElement {
  const container = document.createElement('div');
  container.classList.add('gist-content');
  container.textContent = content; // Never innerHTML
  return container;
}

export function renderMarkdown(content: string): HTMLElement {
  const container = document.createElement('div');
  container.classList.add('markdown-content');
  // Use sanitized markdown rendering
  container.textContent = content;
  return container;
}
```
