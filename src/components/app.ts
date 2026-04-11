/**
 * Root App Component
 * Manages routing and global layout
 */

export class App {
  private container: HTMLElement | null = null;
  private currentRoute: string = 'home';

  mount(container: HTMLElement): void {
    if (!container) {
      throw new Error('App container not found');
    }

    this.container = container;
    this.render();
    this.setupNavigation();
    
    console.log('[App] Mounted');
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <h1 class="app-title">GitHub Gist Manager</h1>
          <div class="header-actions">
            <button id="theme-toggle" class="icon-button" aria-label="Toggle theme">
              <span class="icon">🌓</span>
            </button>
            <button id="settings-btn" class="icon-button" aria-label="Settings">
              <span class="icon">⚙️</span>
            </button>
          </div>
        </header>
        
        <main class="app-main" id="main-content">
          ${this.getRouteContent()}
        </main>
        
        <nav class="bottom-nav">
          <button class="nav-item ${this.currentRoute === 'home' ? 'active' : ''}" data-route="home">
            <span class="nav-icon">📋</span>
            <span class="nav-label">Gists</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'starred' ? 'active' : ''}" data-route="starred">
            <span class="nav-icon">⭐</span>
            <span class="nav-label">Starred</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'create' ? 'active' : ''}" data-route="create">
            <span class="nav-icon">➕</span>
            <span class="nav-label">New</span>
          </button>
          <button class="nav-item ${this.currentRoute === 'offline' ? 'active' : ''}" data-route="offline">
            <span class="nav-icon">📴</span>
            <span class="nav-label">Offline</span>
          </button>
        </nav>
      </div>
    `;

    this.initializeThemeToggle();
  }

  private getRouteContent(): string {
    switch (this.currentRoute) {
      case 'home':
        return this.getHomeRoute();
      case 'starred':
        return this.getStarredRoute();
      case 'create':
        return this.getCreateRoute();
      case 'offline':
        return this.getOfflineRoute();
      default:
        return this.getHomeRoute();
    }
  }

  private getHomeRoute(): string {
    return `
      <div class="route-home">
        <div class="gist-list-header">
          <input type="text" class="search-input" placeholder="Search gists..." />
          <div class="filter-buttons">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="mine">Mine</button>
          </div>
        </div>
        <div class="gist-list" id="gist-list">
          <div class="empty-state">
            <p>No gists yet. Create your first gist!</p>
          </div>
        </div>
      </div>
    `;
  }

  private getStarredRoute(): string {
    return `
      <div class="route-starred">
        <h2>Starred Gists</h2>
        <div class="gist-list" id="starred-list">
          <div class="empty-state">
            <p>No starred gists yet.</p>
          </div>
        </div>
      </div>
    `;
  }

  private getCreateRoute(): string {
    return `
      <div class="route-create">
        <h2>Create New Gist</h2>
        <form id="create-gist-form" class="gist-form">
          <div class="form-group">
            <label for="gist-description">Description (optional)</label>
            <input type="text" id="gist-description" name="description" class="form-input" />
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="gist-public" name="public" />
              Make public
            </label>
          </div>
          
          <div class="files-section" id="files-section">
            <h3>Files</h3>
            <div class="file-editor" data-file-index="0">
              <div class="file-header">
                <input type="text" class="filename-input" placeholder="Filename (e.g., example.js)" />
                <button type="button" class="remove-file-btn" style="display: none;">×</button>
              </div>
              <textarea class="content-editor" placeholder="File content..."></textarea>
            </div>
          </div>
          
          <button type="button" id="add-file-btn" class="secondary-btn">+ Add File</button>
          
          <div class="form-actions">
            <button type="submit" class="primary-btn">Create Gist</button>
            <button type="button" id="cancel-create-btn" class="secondary-btn">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  private getOfflineRoute(): string {
    return `
      <div class="route-offline">
        <h2>Offline Mode</h2>
        <div class="offline-status">
          <div class="status-indicator ${navigator.onLine ? 'online' : 'offline'}">
            <span class="status-dot"></span>
            <span class="status-text">${navigator.onLine ? 'Online' : 'Offline'}</span>
          </div>
          <p class="last-synced">Last synced: <span id="last-sync-time">Never</span></p>
        </div>
        
        <div class="pending-operations" id="pending-ops">
          <h3>Pending Operations</h3>
          <div class="empty-state">
            <p>No pending operations</p>
          </div>
        </div>
        
        <div class="offline-actions">
          <button id="sync-now-btn" class="primary-btn">Sync Now</button>
          <button id="clear-cache-btn" class="secondary-btn">Clear Cache</button>
        </div>
      </div>
    `;
  }

  private setupNavigation(): void {
    if (!this.container) return;

    // Bottom navigation
    const navItems = this.container.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const route = target.dataset.route;
        if (route) {
          this.navigate(route);
        }
      });
    });

    // Header buttons
    const themeToggle = this.container.querySelector('#theme-toggle');
    themeToggle?.addEventListener('click', () => this.toggleTheme());

    const settingsBtn = this.container.querySelector('#settings-btn');
    settingsBtn?.addEventListener('click', () => this.navigateToSettings());

    // Route-specific handlers
    this.setupRouteHandlers();
  }

  private setupRouteHandlers(): void {
    if (!this.container) return;

    // Search input
    const searchInput = this.container.querySelector('.search-input');
    searchInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      this.handleSearch(query);
    });

    // Filter buttons
    const filterBtns = this.container.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        filterBtns.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');
        this.handleFilter(target.dataset.filter || 'all');
      });
    });

    // Create form
    const createForm = this.container.querySelector('#create-gist-form');
    createForm?.addEventListener('submit', (e) => this.handleCreateGist(e));

    const addFileBtn = this.container.querySelector('#add-file-btn');
    addFileBtn?.addEventListener('click', () => this.addFileEditor());

    const cancelCreateBtn = this.container.querySelector('#cancel-create-btn');
    cancelCreateBtn?.addEventListener('click', () => this.navigate('home'));

    // Offline actions
    const syncNowBtn = this.container.querySelector('#sync-now-btn');
    syncNowBtn?.addEventListener('click', () => this.syncNow());

    const clearCacheBtn = this.container.querySelector('#clear-cache-btn');
    clearCacheBtn?.addEventListener('click', () => this.clearCache());
  }

  private navigate(route: string): void {
    this.currentRoute = route;
    this.render();
    this.setupNavigation();
    
    // Update URL hash for browser history
    window.history.pushState({ route }, '', `#${route}`);
    
    console.log(`[App] Navigated to: ${route}`);
  }

  private navigateToSettings(): void {
    // For now, just show a simple alert
    // TODO: Implement proper settings route
    alert('Settings: Enter your GitHub PAT in the next version');
  }

  private toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme-preference', newTheme);
  }

  private initializeThemeToggle(): void {
    const storedTheme = localStorage.getItem('theme-preference');
    if (storedTheme) {
      document.documentElement.setAttribute('data-theme', storedTheme);
    }
  }

  private handleSearch(query: string): void {
    console.log('[App] Search query:', query);
    // TODO: Implement search filtering
  }

  private handleFilter(filter: string): void {
    console.log('[App] Filter:', filter);
    // TODO: Implement gist filtering
  }

  private handleCreateGist(e: Event): void {
    e.preventDefault();
    console.log('[App] Create gist submitted');
    // TODO: Implement gist creation
    alert('Gist creation will be implemented in the next iteration');
  }

  private addFileEditor(): void {
    const filesSection = this.container?.querySelector('#files-section');
    if (!filesSection) return;

    const fileIndex = filesSection.querySelectorAll('.file-editor').length;
    const fileEditor = document.createElement('div');
    fileEditor.className = 'file-editor';
    fileEditor.dataset.fileIndex = String(fileIndex);
    fileEditor.innerHTML = `
      <div class="file-header">
        <input type="text" class="filename-input" placeholder="Filename (e.g., example.js)" />
        <button type="button" class="remove-file-btn">×</button>
      </div>
      <textarea class="content-editor" placeholder="File content..."></textarea>
    `;

    // Add remove handler
    const removeBtn = fileEditor.querySelector('.remove-file-btn');
    removeBtn?.addEventListener('click', () => {
      fileEditor.remove();
    });

    filesSection.appendChild(fileEditor);
  }

  private syncNow(): void {
    console.log('[App] Sync requested');
    // TODO: Implement sync logic
    alert('Sync functionality will be implemented in the next iteration');
  }

  private clearCache(): void {
    console.log('[App] Clear cache requested');
    // TODO: Implement cache clearing
    if (confirm('Are you sure you want to clear all cached data?')) {
      // Import and call clearAllData from db service
      import('../services/db').then(({ clearAllData }) => {
        clearAllData().then(() => {
          alert('Cache cleared successfully');
          this.render();
        });
      });
    }
  }
}
