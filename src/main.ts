import { App } from './components/app';
import { initDesignTokens, initTheme } from './tokens/design-tokens';
import { initIndexedDB } from './services/db';
import './styles/base.css';

// Initialize design tokens
initDesignTokens();

// Initialize theme from stored preference or system setting
initTheme();

// Initialize IndexedDB
initIndexedDB().catch((error) => {
  console.error('Failed to initialize IndexedDB:', error);
});

// Mount app
const app = new App();
app.mount(document.getElementById('app')!);
