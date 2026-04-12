# Error Boundary Implementation Patterns

Structured patterns for catching, handling, and displaying errors at every level of the application.

## Architecture Overview

```
GlobalErrorBoundary (catches fatal render errors)
├── AppShell (network monitor, auth state)
│   ├── AuthErrorBanner (persistent if auth failed)
│   ├── OfflineBanner (persistent if offline)
│   └── Router
│       ├── RouteErrorBoundary (list route)
│       │   └── GistListScreen
│       ├── RouteErrorBoundary (detail route)
│       │   └── GistDetailScreen
│       └── RouteErrorBoundary (settings route)
│           └── SettingsScreen
```

Each boundary catches errors at its level and renders an appropriate fallback UI.

---

## Pattern 1: Global Error Boundary

Catches unhandled exceptions in the render tree. The last line of defense.

```typescript
// src/components/error/global-error-boundary.ts
interface Props {
  children: Node | Node[];
  onFatalError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary {
  private container: HTMLElement;
  private props: Props;
  private state: State = { hasError: false, error: null };

  constructor(container: HTMLElement, props: Props) {
    this.container = container;
    this.props = props;
  }

  mount(): void {
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleRejection);
    this.renderChildren();
  }

  private handleError = (event: ErrorEvent): void => {
    event.preventDefault();
    this.setState({ hasError: true, error: event.error });
    this.renderFatal();
  };

  private handleRejection = (event: PromiseRejectionEvent): void => {
    event.preventDefault();
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    this.setState({ hasError: true, error });
    this.renderFatal();
  };

  private setState(state: Partial<State>): void {
    this.state = { ...this.state, ...state };
    if (this.state.hasError && this.state.error) {
      this.props.onFatalError?.(this.state.error);
    }
  }

  private renderChildren(): void {
    // Render normal children
  }

  private renderFatal(): void {
    const error = this.state.error;
    // Clear container, show FatalErrorScreen
    this.container.innerHTML = '';
    const screen = createFatalErrorScreen(error);
    this.container.appendChild(screen);
  }

  destroy(): void {
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }
}
```

### Fatal Error Screen

```typescript
// src/components/error/fatal-error-screen.ts
export function createFatalErrorScreen(error: Error | null): HTMLElement {
  const container = document.createElement('div');
  container.className = 'fatal-error-screen';

  const icon = document.createElement('div');
  icon.className = 'fatal-error-icon';
  icon.textContent = '⚠';

  const title = document.createElement('h1');
  title.textContent = 'Something went wrong';

  const message = document.createElement('p');
  // Use safe user message, never raw error.message in production
  message.textContent = error instanceof AppError
    ? error.getUserMessage()
    : 'An unexpected error occurred. Please try refreshing the page.';

  const button = document.createElement('button');
  button.textContent = 'Refresh Page';
  button.className = 'btn btn-primary';
  button.addEventListener('click', () => window.location.reload());

  container.append(icon, title, message, button);
  return container;
}
```

---

## Pattern 2: Route Error Boundary

Wraps individual route content. If a route crashes, show error inline without losing the app shell.

```typescript
// src/components/error/route-error-boundary.ts
interface RouteErrorBoundaryOptions {
  container: HTMLElement;
  routeName: string;
  onError?: (error: Error) => void;
}

export class RouteErrorBoundary {
  private container: HTMLElement;
  private routeName: string;
  private error: Error | null = null;
  private onError?: (error: Error) => void;
  private abortController: AbortController;

  constructor(options: RouteErrorBoundaryOptions) {
    this.container = options.container;
    this.routeName = options.routeName;
    this.onError = options.onError;
    this.abortController = new AbortController();
  }

  async load(loader: () => Promise<void>): Promise<void> {
    try {
      this.abortController.abort(); // Cancel previous load
      this.abortController = new AbortController();
      await loader();
    } catch (error) {
      this.error = error instanceof Error ? error : new Error(String(error));
      this.onError?.(this.error);
      this.renderError();
    }
  }

  private renderError(): void {
    const errorEl = document.createElement('div');
    errorEl.className = 'route-error';
    errorEl.setAttribute('role', 'alert');

    const appError = this.error instanceof AppError ? this.error : null;

    errorEl.innerHTML = `
      <p class="route-error-title">${appError?.getUserMessage() ?? 'Failed to load'}</p>
      <button class="btn btn-secondary" data-action="retry">Retry</button>
    `;

    const retryBtn = errorEl.querySelector('[data-action="retry"]');
    retryBtn?.addEventListener('click', () => {
      this.clear();
      this.container.dispatchEvent(new CustomEvent('route-retry', {
        detail: { route: this.routeName },
      }));
    });

    this.container.innerHTML = '';
    this.container.appendChild(errorEl);
  }

  clear(): void {
    this.error = null;
    this.container.innerHTML = '';
  }

  destroy(): void {
    this.abortController.abort();
  }

  getSignal(): AbortSignal {
    return this.abortController.signal;
  }
}
```

---

## Pattern 3: Async Operation Error Wrapper

Every async operation returns `Result<T>` -- either success or an `AppError`.

```typescript
// src/lib/errors/result.ts
export type Result<T> = Ok<T> | Err;

interface Ok<T> {
  ok: true;
  value: T;
}

interface Err {
  ok: false;
  error: AppError;
}

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<T>(error: AppError): Err {
  return { ok: false, error };
}

export async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (error) {
    return err(coerceToAppError(error));
  }
}

export function coerceToAppError(unknown: unknown): AppError {
  if (unknown instanceof AppError) return unknown;
  if (unknown instanceof TypeError) {
    // Network errors from fetch appear as TypeError
    if (!navigator.onLine) {
      return new AppError(
        ErrorCode.NETWORK_OFFLINE,
        'You are offline',
        unknown,
        { action: 'fetch' },
        true,
      );
    }
    return new AppError(
      ErrorCode.NETWORK_DNS_FAILURE,
      'Network error',
      unknown,
      { action: 'fetch' },
      true,
    );
  }
  if (unknown instanceof DOMException && unknown.name === 'AbortError') {
    return new AppError(
      ErrorCode.REQUEST_ABORTED,
      'Request was cancelled',
      unknown,
      { action: 'fetch' },
      false,
    );
  }
  return new AppError(
    ErrorCode.API_UNEXPECTED,
    'An unexpected error occurred',
    unknown,
    {},
    true,
  );
}
```

### Usage Example

```typescript
// src/services/github/gists.ts
export async function fetchGist(gistId: string): Promise<Result<GistRecord>> {
  return safeAsync(async () => {
    const response = await fetchWithAuth(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      throw await mapHttpError(response);
    }

    return parseGistResponse(await response.json());
  });
}

// In a component:
const result = await fetchGist(gistId);
if (result.ok) {
  renderGist(result.value);
} else {
  handleGistError(result.error);
}
```

---

## Pattern 4: Offline/Online Transition Banner

Shows persistent banner when offline. Auto-hides when back online.

```typescript
// src/components/error/offline-banner.ts
export class OfflineBanner {
  private element: HTMLElement | null = null;
  private boundOnline: () => void;
  private boundOffline: () => void;

  constructor() {
    this.boundOnline = this.handleOnline.bind(this);
    this.boundOffline = this.handleOffline.bind(this);
  }

  mount(): void {
    window.addEventListener('online', this.boundOnline);
    window.addEventListener('offline', this.boundOffline);

    if (!navigator.onLine) {
      this.show();
    }
  }

  private handleOnline(): void {
    this.hide();
    // Trigger sync queue processing
    dispatchEvent(new CustomEvent('network-online'));
  }

  private handleOffline(): void {
    this.show();
    dispatchEvent(new CustomEvent('network-offline'));
  }

  private show(): void {
    if (this.element) return;

    this.element = document.createElement('div');
    this.element.className = 'offline-banner';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.textContent = 'You are offline. Changes will sync when you reconnect.';

    document.body.prepend(this.element);
  }

  private hide(): void {
    this.element?.remove();
    this.element = null;
  }

  destroy(): void {
    window.removeEventListener('online', this.boundOnline);
    window.removeEventListener('offline', this.boundOffline);
    this.hide();
  }
}
```

---

## Pattern 5: Auth Error Banner

Persistent top-of-screen banner when PAT is invalid. Appears on every route.

```typescript
// src/components/error/auth-error-banner.ts
export class AuthErrorBanner {
  private element: HTMLElement | null = null;
  private readonly SETTINGS_PATH = '/settings';

  show(error: AppError): void {
    if (this.element) return;

    this.element = document.createElement('div');
    this.element.className = 'auth-error-banner';
    this.element.setAttribute('role', 'alert');

    this.element.innerHTML = `
      <p>${error.getUserMessage()}</p>
      <a href="${this.SETTINGS_PATH}" class="btn btn-small">Update Token</a>
    `;

    document.body.prepend(this.element);
  }

  hide(): void {
    this.element?.remove();
    this.element = null;
  }

  destroy(): void {
    this.hide();
  }
}
```

---

## Pattern 6: Per-Action Error Toast

For recoverable errors on specific actions (save, delete, star).

```typescript
// src/components/error/error-toast.ts
interface ToastOptions {
  message: string;
  action?: { label: string; handler: () => void };
  duration?: number; // ms, 0 = persistent
}

let activeToasts: HTMLElement[] = [];
const MAX_TOASTS = 3; // Prevent toast accumulation

export function showToast(options: ToastOptions): void {
  // Enforce max toasts to prevent memory leak
  while (activeToasts.length >= MAX_TOASTS) {
    const oldest = activeToasts.shift();
    oldest?.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  let html = `<p>${escapeHtml(options.message)}</p>`;
  if (options.action) {
    html += `<button data-action="toast-action">${escapeHtml(options.action.label)}</button>`;
  }
  html += `<button data-action="toast-dismiss">&times;</button>`;

  toast.innerHTML = html;

  toast.querySelector('[data-action="toast-dismiss"]')?.addEventListener('click', () => {
    dismissToast(toast);
  });

  if (options.action) {
    toast.querySelector('[data-action="toast-action"]')?.addEventListener('click', () => {
      options.action!.handler();
      dismissToast(toast);
    });
  }

  document.body.appendChild(toast);
  activeToasts.push(toast);

  if (options.duration && options.duration > 0) {
    setTimeout(() => dismissToast(toast), options.duration);
  }
}

function dismissToast(toast: HTMLElement): void {
  toast.remove();
  activeToasts = activeToasts.filter(t => t !== toast);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Clear all toasts (e.g., on route change)
export function dismissAllToasts(): void {
  activeToasts.forEach(t => t.remove());
  activeToasts = [];
}
```

---

## Error Boundary Checklist

When adding a new component or route, verify:

- [ ] Async operations use `safeAsync` or equivalent Result pattern
- [ ] Network errors are mapped to `AppError` codes
- [ ] Auth errors show the `AuthErrorBanner`
- [ ] Offline state shows the `OfflineBanner`
- [ ] Per-action errors show an `ErrorToast` with retry option
- [ ] Fatal errors are caught by `GlobalErrorBoundary`
- [ ] All error messages are user-safe (no stack traces, no secrets)
- [ ] Error context is logged via `safe-logger` (redacted)
- [ ] Event listeners are cleaned up in `destroy()`/`disconnect()`
- [ ] AbortController is used for cancelable fetch
