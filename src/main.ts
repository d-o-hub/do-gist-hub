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
import { safeLog, safeError } from './services/security/logger';
import './styles/base.css';
import './styles/accessibility.css';
import './styles/interactions.css';
import './styles/motion.css';

// Initialize design tokens
initDesignTokens();

// Initialize theme from stored preference or system setting
initTheme();

// Log 2026 feature support
safeLog('[App] View Transitions API:', isViewTransitionSupported() ? 'supported' : 'not supported');
safeLog(
  '[App] Container Queries:',
  CSS.supports('container-type', 'inline-size') ? 'supported' : 'not supported'
);

async function bootstrap(): Promise<void> {
  // Initialize IndexedDB
  await initIndexedDB();

  // Initialize network monitoring
  networkMonitor.init();

  // Initialize sync queue
  syncQueue.init();

  // Check auth state
  const authenticated = await isAuthenticated();
  safeLog('[App] Authenticated:', authenticated);

  // Initialize gist store (loads from IndexedDB, then syncs from GitHub if online)
  if (authenticated) {
    await gistStore.init();
  }

  // Mount app
  const app = new App();
  app.mount(document.getElementById('app')!);

  // Register service worker for PWA support
  await registerServiceWorker();

  // Initialize Web Vitals monitoring
  initWebVitals();
}

bootstrap().catch((error) => {
  safeError('[App] Failed to bootstrap:', error);
  // Still mount the app so user can see error state
  const app = new App();
  app.mount(document.getElementById('app')!);
});
