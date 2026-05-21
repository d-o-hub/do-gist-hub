/**
 * Skeleton Loading Component (2026)
 * Shimmering placeholders for better perceived performance.
 */

export const Skeleton = {
  renderCard(): string {
    return `
      <div class="gist-card skeleton-card" aria-hidden="true">
        <div class="gist-card-header">
          <div class="loading-skeleton skeleton-title"></div>
          <div class="gist-card-actions">
            <div class="loading-skeleton skeleton-icon-round"></div>
            <div class="loading-skeleton skeleton-icon-round"></div>
          </div>
        </div>
        <div class="loading-skeleton skeleton-desc"></div>
        <div class="gist-card-meta">
          <div class="loading-skeleton skeleton-meta-sm"></div>
          <div class="loading-skeleton skeleton-meta-xs"></div>
          <div class="loading-skeleton skeleton-meta-md"></div>
        </div>
      </div>
    `;
  },

  renderList(count = 3): string {
    return Array(count).fill(this.renderCard()).join('');
  },

  renderDetail(): string {
    return `
      <div class="gist-detail-skeleton" aria-hidden="true">
        <div class="skeleton-header">
          <div class="loading-skeleton skeleton-icon-md"></div>
          <div class="loading-skeleton skeleton-title-detail"></div>
          <div class="loading-skeleton skeleton-meta"></div>
        </div>
        <div class="skeleton-content">
          <div class="loading-skeleton skeleton-file-tab"></div>
          <div class="skeleton-code-lines">
            <div class="loading-skeleton skeleton-code-line skeleton-code-line-w100"></div>
            <div class="loading-skeleton skeleton-code-line skeleton-code-line-w90"></div>
            <div class="loading-skeleton skeleton-code-line skeleton-code-line-w95"></div>
            <div class="loading-skeleton skeleton-code-line skeleton-code-line-w60"></div>
            <div class="loading-skeleton skeleton-code-line skeleton-code-line-w85"></div>
          </div>
        </div>
      </div>
    `;
  },
};
