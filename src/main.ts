import { App } from './components/app';
import { initDesignTokens } from './tokens/design-tokens';
import { initIndexedDB } from './services/db';

// Initialize design tokens
initDesignTokens();

// Initialize IndexedDB
initIndexedDB().catch((error) => {
  console.error('Failed to initialize IndexedDB:', error);
});

// Mount app
const app = new App();
app.mount(document.getElementById('app')!);
