/**
 * Create Gist Route
 */

import gistStore from '../stores/gist-store';
import { toast } from '../components/ui/toast';

export function render(container: HTMLElement): void {
  container.innerHTML = `
    <div class="route-create">
      <header class="detail-header">
          <h2 class="detail-title">Create New Gist</h2>
      </header>
      <form id="create-gist-form" class="glass-card" style="padding: var(--space-6);">
        <div class="form-group">
          <label class="form-label" for="gist-description">Description</label>
          <input type="text" id="gist-description" class="form-input" placeholder="Gist description..." required>
        </div>
        <div class="form-group">
          <label class="form-label" for="gist-content">index.js</label>
          <textarea id="gist-content" class="form-input code-editor" placeholder="Gist content..." required style="min-height: 200px;"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">CREATE GIST</button>
        </div>
      </form>
    </div>
  `;

  container.querySelector('#create-gist-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = (container.querySelector('#gist-description') as HTMLInputElement).value;
    const content = (container.querySelector('#gist-content') as HTMLTextAreaElement).value;
    void (async () => {
      await gistStore.createGist(desc, true, { 'index.js': content });
      toast.success('GIST CREATED');
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'home' } }));
    })();
  });
}
