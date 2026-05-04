import { safeLog, safeError } from './services/security/logger';
import { App } from './components/app';
import { initTheme } from './tokens/design-tokens';
import { initIndexedDB } from './services/db';
import { isAuthenticated } from './services/github/auth';
import networkMonitor from './services/network/offline-monitor';
import syncQueue from './services/sync/queue';
import gistStore from './stores/gist-store';
import { registerServiceWorker } from './services/pwa/register-sw';
import { initWebVitals } from './services/perf';
import { isViewTransitionSupported } from './utils/view-transitions';
import './styles/base.css';
import './styles/empty-state.css';
import './styles/accessibility.css';
import './styles/interactions.css';
import './styles/motion.css';
import './styles/navigation.css';
import './styles/modern-glass.css';
import './styles/conflicts.css';
import './styles/command-palette.css';
import './styles/tokens-generated.css';

// Initialize theme from stored preference or system setting
initTheme();

// Log 2026 feature support
safeLog('[App] View Transitions API:', isViewTransitionSupported() ? 'supported' : 'not supported');
safeLog(
  '[App] Container Queries:',
  CSS.supports('container-type', 'inline-size') ? 'supported' : 'not supported'
);

void (async function init(): Promise<void> {
  try {
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
    const mountPoint = document.getElementById('app');
    if (!mountPoint) {
      throw new Error('Failed to mount app: element with id "app" not found.');
    }
    app.mount(mountPoint);

    // Register service worker for PWA support
    void registerServiceWorker();

    // Initialize Web Vitals monitoring
    initWebVitals();
  } catch (error) {
    safeError('[App] Failed to bootstrap:', error);
    // Still mount the app so user can see error state
    const app = new App();
    const mountEl = document.getElementById('app');
    if (mountEl) {
      app.mount(mountEl);
    } else {
      safeError('[App] Mount element "app" not found.');
    }
  }
})();
// CI trigger test
