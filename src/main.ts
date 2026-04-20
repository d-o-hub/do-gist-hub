import { safeLog, safeError } from './services/security/logger';
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
safeLog(
  '[App] Container Queries:',
  CSS.supports('container-type', 'inline-size') ? 'supported' : 'not supported'
);

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
