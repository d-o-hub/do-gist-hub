import { App } from './components/app';
import { initDesignTokens } from './tokens/design-tokens';
import { initIndexedDB } from './services/db';
import { registerSW } from 'virtual:pwa-register';

// Initialize design tokens
initDesignTokens();

// Initialize IndexedDB
initIndexedDB().catch((error) => {
  console.error('Failed to initialize IndexedDB:', error);
});

// Register service worker
registerSW({
  immediate: false,
  onRegisteredSW(swUrl, r) {
    if (r?.active) {
      console.log('Service Worker active');
    }
  },
  onNeedRefresh() {
    console.log('New content available, please refresh.');
  },
});

// Mount app
const app = new App();
app.mount(document.getElementById('app')!);
