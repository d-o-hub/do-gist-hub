/**
 * App Root Component
 * Main application container and router
 */

import { setTheme, initTheme } from '../tokens/design-tokens';
import { injectBaseStyles } from '../styles/base';

export class App {
  private root: HTMLElement | null = null;
  private currentRoute: string = 'home';

  /**
   * Mount app to DOM element
   */
  mount(root: HTMLElement): void {
    this.root = root;
    injectBaseStyles();
    this.setupEventListeners();
    this.initTheme();
    this.render();
    this.navigate(this.currentRoute);
  }

  /**
   * Initialize theme from preferences
   */
  private initTheme(): void {
    initTheme();
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      if (event.state?.route) {
        this.navigate(event.state.route, false);
      }
    });

    // Listen for theme toggle
    document.addEventListener('theme-toggle', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  /**
   * Navigate to a route
   */
  navigate(route: string, pushState: boolean = true): void {
    this.currentRoute = route;

    if (pushState) {
      history.pushState({ route }, '', `#${route}`);
    }

    this.render();
  }

  /**
   * Render current route
   */
  private render(): void {
    if (!this.root) return;

    const routes: Record<string, () => HTMLElement> = {
      home: () => this.renderHome(),
      'gist-detail': () => this.renderGistDetail(),
      'create-edit': () => this.renderCreateEdit(),
      offline: () => this.renderOffline(),
      settings: () => this.renderSettings(),
    };

    const renderFn = routes[this.currentRoute] || routes.home;
    this.root.innerHTML = '';
    this.root.appendChild(renderFn());
  }

  /**
   * Render home route (placeholder)
   */
  private renderHome(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'route-home';
    container.innerHTML = `
      <header class="app-header">
        <h1>Gist App</h1>
        <nav class="main-nav">
          <button data-route="home" class="nav-btn active">Home</button>
          <button data-route="settings" class="nav-btn">Settings</button>
        </nav>
      </header>
      <main class="app-main">
        <p>Welcome to Gist App - Your offline-first GitHub Gist manager</p>
        <div id="gist-list"></div>
      </main>
    `;
    
    // Setup nav button listeners
    container.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const route = target.dataset.route;
        if (route) {
          this.navigate(route);
        }
      });
    });

    return container;
  }

  /**
   * Render gist detail route (placeholder)
   */
  private renderGistDetail(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'route-gist-detail';
    container.innerHTML = `
      <header class="app-header">
        <button class="back-btn" onclick="history.back()">← Back</button>
        <h1>Gist Detail</h1>
      </header>
      <main class="app-main">
        <p>Gist detail view coming soon...</p>
      </main>
    `;
    return container;
  }

  /**
   * Render create/edit route (placeholder)
   */
  private renderCreateEdit(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'route-create-edit';
    container.innerHTML = `
      <header class="app-header">
        <button class="back-btn" onclick="history.back()">← Back</button>
        <h1>Create/Edit Gist</h1>
      </header>
      <main class="app-main">
        <p>Gist editor coming soon...</p>
      </main>
    `;
    return container;
  }

  /**
   * Render offline route (placeholder)
   */
  private renderOffline(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'route-offline';
    container.innerHTML = `
      <header class="app-header">
        <h1>Offline Mode</h1>
      </header>
      <main class="app-main">
        <p>You are currently offline. Viewing cached gists.</p>
      </main>
    `;
    return container;
  }

  /**
   * Render settings route (placeholder)
   */
  private renderSettings(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'route-settings';
    container.innerHTML = `
      <header class="app-header">
        <button class="back-btn" onclick="history.back()">← Back</button>
        <h1>Settings</h1>
      </header>
      <main class="app-main">
        <section class="settings-section">
          <h2>Appearance</h2>
          <button id="theme-toggle">Toggle Theme</button>
        </section>
        <section class="settings-section">
          <h2>Account</h2>
          <p>GitHub PAT authentication coming soon...</p>
        </section>
      </main>
    `;

    // Theme toggle listener
    const themeBtn = container.querySelector('#theme-toggle');
    themeBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('theme-toggle'));
    });

    return container;
  }

  /**
   * Unmount app and cleanup
   */
  unmount(): void {
    this.root = null;
  }
}
