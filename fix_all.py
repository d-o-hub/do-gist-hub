import os
import re

def fix_main():
    content = r"""import { safeLog, safeError } from './services/security/logger';
import { App } from './components/app';
import { initDesignTokens, initTheme } from './tokens/design-tokens';
import { initIndexedDB } from './services/db';
import { isAuthenticated } from './services/github/auth';
import networkMonitor from './services/network/offline-monitor';
import syncQueue from './services/sync/queue';
import gistStore from './stores/gist-store';
import { registerServiceWorker } from './services/pwa/register-sw';
import { initWebVitals } from './services/perf';
import { isViewTransitionSupported } from './utils/view-transitions';
import './styles/base.css';
import './styles/accessibility.css';
import './styles/interactions.css';
import './styles/motion.css';
import './styles/navigation.css';
import './styles/modern-glass.css';

initDesignTokens();
initTheme();
safeLog('[App] View Transitions API:', isViewTransitionSupported() ? 'supported' : 'not supported');
safeLog('[App] Container Queries:', CSS.supports('container-type', 'inline-size') ? 'supported' : 'not supported');

async function bootstrap(): Promise<void> {
  await initIndexedDB();
  networkMonitor.init();
  syncQueue.init();
  const authenticated = await isAuthenticated();
  safeLog('[App] Authenticated:', authenticated);
  if (authenticated) {
    await gistStore.init();
  }
  const app = new App();
  const mountPoint = document.getElementById('app');
  if (!mountPoint) {
    throw new Error('Failed to mount app: element with id "app" not found.');
  }
  app.mount(mountPoint);
  await registerServiceWorker();
  initWebVitals();
}

bootstrap().catch((error) => {
  safeError('[App] Failed to bootstrap:', error);
  const app = new App();
  const mountEl = document.getElementById('app');
  if (mountEl) {
    app.mount(mountEl);
  }
});
"""
    with open('src/main.ts', 'w') as f:
        f.write(content)

def fix_queue():
    with open('src/services/sync/queue.ts', 'r') as f:
        content = f.read()

    # Remove duplicate imports
    content = content.replace("import { safeLog, safeError } from '../security/logger';", "", 1)

    # Remove static
    content = content.replace('private static async sync', 'private async sync')
    content = content.replace('private static isRetryableError', 'private isRetryableError')
    content = content.replace('private static delay', 'private delay')
    content = content.replace('static async getQueueLength', 'async getQueueLength')

    # Replace this.isRetryableError calls if they were static
    content = content.replace('SyncQueue.isRetryableError', 'this.isRetryableError')
    content = content.replace('SyncQueue.delay', 'this.delay')

    with open('src/services/sync/queue.ts', 'w') as f:
        f.write(content)

def fix_app():
    with open('src/components/app.ts', 'r') as f:
        content = f.read()
    content = content.replace('customConfirm', 'window.confirm')
    content = content.replace('import { safeLog, safeError } from', 'import { safeLog, safeError, LogEntry } from')
    content = content.replace('(log) => `', '(log: LogEntry) => `')
    # syncQueue calls
    content = content.replace('SyncQueue.getQueueLength', 'syncQueue.getQueueLength')

    with open('src/components/app.ts', 'w') as f:
        f.write(content)

def fix_db():
    with open('src/services/db.ts', 'r') as f:
        content = f.read()
    content = content.replace('[storeName: string]: any[]', '[storeName: string]: unknown[]')
    content = content.replace('tx.objectStore(storeName)', 'tx.objectStore(storeName as any)')
    content = content.replace('await store.put(item)', 'await store.put(item as any)')
    with open('src/services/db.ts', 'w') as f:
        f.write(content)

def fix_client():
    with open('src/services/github/client.ts', 'r') as f:
        content = f.read()
    content = content.replace('return null;', 'return;')
    with open('src/services/github/client.ts', 'w') as f:
        f.write(content)

def fix_error_boundary():
    with open('src/components/ui/error-boundary.ts', 'r') as f:
        content = f.read()
    content = content.replace(r'\"', '"')
    with open('src/components/ui/error-boundary.ts', 'w') as f:
        f.write(content)

fix_main()
fix_queue()
fix_app()
fix_db()
fix_client()
fix_error_boundary()
