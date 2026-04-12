# Error Handling Code Examples

## Global Error Boundary

```typescript
// src/components/error/global-error-boundary.tsx
export class GlobalErrorBoundary extends Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError(error, { info, context: 'global-boundary' });
  }

  render() {
    if (this.state.hasError) {
      return <FatalErrorScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

## Route Error Boundary

```typescript
// src/components/error/route-error-boundary.tsx
export function RouteErrorBoundary({ children, route }: Props) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      setError(event.error);
      logError(event.error, { route });
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, [route]);

  if (error) {
    return <RouteErrorScreen error={error} onRetry={() => window.location.reload()} />;
  }

  return children;
}
```

## AppError Class

```typescript
// src/lib/errors/app-error.ts
export enum ErrorCode {
  BOOTSTRAP_FAILURE = 'BOOTSTRAP_FAILURE',
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  // ... more codes
}

export interface ErrorContext {
  userId?: string;
  route?: string;
  action?: string;
  timestamp: number;
  userAgent: string;
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public cause?: unknown,
    public context?: Partial<ErrorContext>,
    public recoverable = true,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toSafeObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.getUserMessage(),
      recoverable: this.recoverable,
      timestamp: Date.now(),
    };
  }

  getUserMessage(): string {
    return errorMessages[this.code] || 'An unexpected error occurred';
  }
}
```

## Fetch Error Handler

```typescript
// src/services/github/error-handler.ts
export async function handleFetchError(response: Response): Promise<never> {
  const status = response.status;
  const contentType = response.headers.get('content-type');

  let body: unknown;
  try {
    body = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();
  } catch {
    body = null;
  }

  switch (status) {
    case 401:
      throw new AppError(
        ErrorCode.AUTH_INVALID_TOKEN,
        'Your GitHub token is invalid or has expired',
        { status, body },
        { action: 'github-request' },
        true,
      );
    case 403:
      throw new AppError(
        ErrorCode.AUTH_PERMISSION_DENIED,
        'Your token does not have the required permissions',
        { status, body },
        { action: 'github-request' },
        true,
      );
    case 429:
      const resetTime = response.headers.get('x-ratelimit-reset');
      throw new AppError(
        ErrorCode.API_RATE_LIMITED,
        `Rate limit exceeded. Try again after ${formatResetTime(resetTime)}`,
        { status, body, resetTime },
        { action: 'github-request' },
        true,
      );
    case 404:
      throw new AppError(
        ErrorCode.NOT_FOUND,
        'The requested resource was not found',
        { status, body },
        { action: 'github-request' },
        false,
      );
    default:
      if (status >= 500) {
        throw new AppError(
          ErrorCode.API_SERVER_ERROR,
          'GitHub servers are temporarily unavailable',
          { status, body },
          { action: 'github-request' },
          true,
        );
      }
      throw new AppError(
        ErrorCode.API_UNEXPECTED,
        'An unexpected error occurred while communicating with GitHub',
        { status, body },
        { action: 'github-request' },
        true,
      );
  }
}
```

## Offline Monitor

```typescript
// src/services/network/offline-monitor.ts
export class OfflineMonitor {
  private listeners: Set<() => void> = new Set();
  private online = navigator.onLine;

  constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline() {
    this.online = true;
    this.listeners.forEach(listener => listener());
  }

  private handleOffline() {
    this.online = false;
    this.listeners.forEach(listener => listener());
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  isOnline(): boolean {
    return this.online;
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.listeners.clear();
  }
}
```

## Error Messages Map

```typescript
// src/lib/errors/error-messages.ts
export const errorMessages: Record<ErrorCode, string> = {
  [ErrorCode.BOOTSTRAP_FAILURE]: 'The app failed to start. Please refresh the page.',
  [ErrorCode.NETWORK_OFFLINE]: 'You are offline. Changes will sync when you reconnect.',
  [ErrorCode.AUTH_INVALID_TOKEN]: 'Your GitHub token is invalid. Please update it in Settings.',
  [ErrorCode.AUTH_PERMISSION_DENIED]: 'Your token needs additional permissions. Please update it in Settings.',
  [ErrorCode.API_RATE_LIMITED]: 'Too many requests. Please wait a moment and try again.',
  [ErrorCode.API_SERVER_ERROR]: 'GitHub is experiencing issues. Please try again later.',
  [ErrorCode.SYNC_CONFLICT]: 'There is a conflict between your local changes and GitHub. Please review and resolve.',
  [ErrorCode.INDEXEDDB_UNAVAILABLE]: 'Local storage is not available. Some features may not work.',
};
```

## Safe Logger

```typescript
// src/lib/logging/safe-logger.ts
const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = ['token', 'password', 'secret', 'authorization', 'api_key'];

function redactSensitiveData(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive))) {
      result[key] = REDACTED;
    } else {
      result[key] = redactSensitiveData(value);
    }
  }
  return result;
}

export function logError(error: Error, context: Record<string, unknown>): void {
  const safeContext = redactSensitiveData(context);
  console.error('[AppError]', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context: safeContext,
  });
}
```
