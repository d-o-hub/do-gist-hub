/**
 * Virtual List Component
 * Renders only visible items for performance with large result sets
 */

import type { SearchResult } from '../../services/search/search-engine';
import { renderCard } from '../gist-card';

export class VirtualList extends HTMLElement {
  private items: SearchResult[] = [];
  private itemHeight = 200; // Approximate height in pixels
  private visibleCount = 10; // Number of items to render
  private scrollTop = 0;
  private container!: HTMLElement;
  private viewport!: HTMLElement;
  private onItemClick?: (id: string) => void;

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback(): void {
    this.viewport?.removeEventListener('scroll', this.handleScroll);
  }

  setItems(items: SearchResult[], onItemClick?: (id: string) => void): void {
    this.items = items;
    this.onItemClick = onItemClick;
    this.scrollTop = 0;
    if (this.viewport) {
      this.viewport.scrollTop = 0;
    }
    this.renderItems();
  }

  private render(): void {
    this.innerHTML = `
      <div class="virtual-list-viewport">
        <div class="virtual-list-container"></div>
      </div>
    `;

    this.viewport = this.querySelector('.virtual-list-viewport') as HTMLElement;
    this.container = this.querySelector('.virtual-list-container') as HTMLElement;
  }

  private attachEventListeners(): void {
    this.viewport.addEventListener('scroll', this.handleScroll.bind(this));

    // Handle item clicks
    this.container.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest('.gist-card') as HTMLElement;
      if (card && this.onItemClick) {
        const gistId = card.getAttribute('data-gist-id');
        if (gistId) {
          this.onItemClick(gistId);
        }
      }
    });
  }

  private handleScroll(): void {
    this.scrollTop = this.viewport.scrollTop;
    this.renderItems();
  }

  private renderItems(): void {
    if (this.items.length === 0) {
      this.container.innerHTML = '<div class="virtual-list-empty">No results found</div>';
      return;
    }

    // Calculate visible range
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + this.visibleCount + 2, // +2 for buffer
      this.items.length
    );

    // Calculate total height for scrollbar
    const totalHeight = this.items.length * this.itemHeight;

    // Create spacers for proper scrolling
    const topSpacer = startIndex * this.itemHeight;
    const bottomSpacer = (this.items.length - endIndex) * this.itemHeight;

    // Render visible items
    const visibleItems = this.items.slice(startIndex, endIndex);
    const itemsHtml = visibleItems
      .map((result) => renderCard(result.gist, result.matches))
      .join('');

    this.container.innerHTML = `
      <div style="height: ${topSpacer}px;"></div>
      ${itemsHtml}
      <div style="height: ${bottomSpacer}px;"></div>
    `;

    // Set container height for scrollbar
    this.container.style.minHeight = `${totalHeight}px`;
  }

  /**
   * Get current scroll position (for state restoration)
   */
  getScrollPosition(): number {
    return this.scrollTop;
  }

  /**
   * Set scroll position (for state restoration)
   */
  setScrollPosition(position: number): void {
    this.scrollTop = position;
    if (this.viewport) {
      this.viewport.scrollTop = position;
    }
  }

  /**
   * Update item height if needed (for dynamic sizing)
   */
  setItemHeight(height: number): void {
    this.itemHeight = height;
    this.renderItems();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    totalItems: number;
    renderedItems: number;
    scrollPosition: number;
  } {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleCount + 2, this.items.length);

    return {
      totalItems: this.items.length,
      renderedItems: endIndex - startIndex,
      scrollPosition: this.scrollTop,
    };
  }
}

customElements.define('virtual-list', VirtualList);
