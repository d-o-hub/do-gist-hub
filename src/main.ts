import { App } from './components/app';
import { initDesignTokens, initTheme } from './tokens/design-tokens';
import { initIndexedDB } from './services/db';
import { isAuthenticated } from './services/github/auth';
import networkMonitor from './services/network/offline-monitor';
import syncQueue from './services/sync/queue';
import gistStore from './stores/gist-store';
import './styles/base.css';
import './styles/accessibility.css';
import './styles/interactions.css';
import './styles/motion.css';

// Initialize design tokens
initDesignTokens();

// Initialize theme from stored preference or system setting
initTheme();

async function bootstrap(): Promise<void> {
  // Initialize IndexedDB
  await initIndexedDB();

  // Initialize network monitoring
  networkMonitor.init();

  // Initialize sync queue
  syncQueue.init();

  // Check auth state
  const authenticated = await isAuthenticated();
  console.log('[App] Authenticated:', authenticated);

  // Initialize gist store (loads from IndexedDB, then syncs from GitHub if online)
  if (authenticated) {
    await gistStore.init();
  }

  // Mount app
  const app = new App();
  app.mount(document.getElementById('app')!);
}

bootstrap().catch((error) => {
  console.error('[App] Failed to bootstrap:', error);
  // Still mount the app so user can see error state
  const app = new App();
  app.mount(document.getElementById('app')!);
});
