/**
 * Skeleton Loading Component (2026)
 * Shimmering placeholders for better perceived performance.
 */

export class Skeleton {
  static renderCard(): string {
    return `
      <div class="gist-card skeleton-card" aria-hidden="true">
        <div class="gist-card-header">
          <div class="loading-skeleton skeleton-title" style="width: 60%; height: 1.25rem;"></div>
          <div class="gist-card-actions">
            <div class="loading-skeleton" style="width: 24px; height: 24px; border-radius: var(--radius-full);"></div>
            <div class="loading-skeleton" style="width: 24px; height: 24px; border-radius: var(--radius-full);"></div>
          </div>
        </div>
        <div class="loading-skeleton skeleton-desc" style="width: 90%; height: 1rem; margin-top: var(--spacing-2);"></div>
        <div class="gist-card-meta">
          <div class="loading-skeleton" style="width: 80px; height: 0.75rem;"></div>
          <div class="loading-skeleton" style="width: 60px; height: 0.75rem;"></div>
          <div class="loading-skeleton" style="width: 100px; height: 0.75rem;"></div>
        </div>
      </div>
    `;
  }

  static renderList(count = 3): string {
    return Array(count).fill(this.renderCard()).join('');
  }

  static renderDetail(): string {
    return `
      <div class="gist-detail-skeleton" aria-hidden="true">
        <div class="skeleton-header">
          <div class="loading-skeleton" style="width: 40px; height: 24px; border-radius: var(--radius-md);"></div>
          <div class="loading-skeleton skeleton-title" style="width: 70%; height: 2rem;"></div>
          <div class="loading-skeleton skeleton-meta" style="width: 50%; height: 1rem;"></div>
        </div>
        <div class="skeleton-content">
          <div class="loading-skeleton skeleton-file-tab" style="width: 120px; height: 32px;"></div>
          <div class="skeleton-code-lines">
            <div class="loading-skeleton skeleton-code-line" style="width: 100%;"></div>
            <div class="loading-skeleton skeleton-code-line" style="width: 90%;"></div>
            <div class="loading-skeleton skeleton-code-line" style="width: 95%;"></div>
            <div class="loading-skeleton skeleton-code-line" style="width: 60%;"></div>
            <div class="loading-skeleton skeleton-code-line" style="width: 85%;"></div>
          </div>
        </div>
      </div>
    `;
  }
}
