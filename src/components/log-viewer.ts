import type { LogEntry } from '../services/db';
import { clearOfflineLogs, getOfflineLogs } from '../services/security/logger';
import { showConfirmDialog } from '../utils/dialog';

export interface LogViewerState {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  levelFilter: 'all' | 'info' | 'warn' | 'error';
  categoryFilter: string;
  categories: string[];
  scrollTop: number;
  containerHeight: number;
}

const ITEM_HEIGHT = 40;
const OVERSCAN = 5;

function extractCategory(message: string): string {
  const match = message.match(/^\[([^\]]+)\]/);
  return match?.[1] ?? 'General';
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function createLogEntryEl(entry: LogEntry): HTMLElement {
  const row = document.createElement('div');
  row.className = `log-viewer-row log-level-${entry.level}`;

  const time = document.createElement('span');
  time.className = 'log-viewer-time';
  time.textContent = formatTimestamp(entry.timestamp);

  const level = document.createElement('span');
  level.className = 'log-viewer-level';
  level.textContent = entry.level.toUpperCase();

  const msg = document.createElement('span');
  msg.className = 'log-viewer-message';
  msg.textContent = entry.message;
  if (entry.data !== undefined) {
    const dataStr = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
    msg.textContent += ` ${dataStr}`;
  }

  row.appendChild(time);
  row.appendChild(level);
  row.appendChild(msg);
  return row;
}

export function renderLogViewer(container: HTMLElement, signal: AbortSignal): () => void {
  const state: LogViewerState = {
    logs: [],
    filteredLogs: [],
    levelFilter: 'all',
    categoryFilter: '',
    categories: [],
    scrollTop: 0,
    containerHeight: 400,
  };

  let observer: ResizeObserver | undefined;

  const wrapper = document.createElement('div');
  wrapper.className = 'log-viewer';
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', 'Application logs');

  wrapper.innerHTML = `
    <div class="log-viewer-controls">
      <div class="log-viewer-filters">
        <select class="form-input log-viewer-level-filter" aria-label="Filter by level">
          <option value="all">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
        </select>
        <select class="form-input log-viewer-category-filter" aria-label="Filter by category">
          <option value="">All categories</option>
        </select>
        <input type="text" class="form-input log-viewer-search" placeholder="Search logs..." aria-label="Search logs" />
      </div>
      <div class="log-viewer-actions">
        <span class="log-viewer-count micro-label"></span>
        <button class="btn btn-ghost btn-sm log-viewer-copy-btn" aria-label="Copy all filtered logs">COPY ALL</button>
        <button class="btn btn-ghost btn-sm btn-danger log-viewer-clear-btn" aria-label="Clear all logs">CLEAR</button>
      </div>
    </div>
    <div class="log-viewer-viewport" tabindex="0" role="list" aria-label="Log entries">
      <div class="log-viewer-spacer-top"></div>
      <div class="log-viewer-items"></div>
      <div class="log-viewer-spacer-bottom"></div>
    </div>
    <div class="log-viewer-empty" style="display:none;">
      <p>No logs found.</p>
    </div>
  `;

  container.appendChild(wrapper);

  const viewport = wrapper.querySelector('.log-viewer-viewport') as HTMLElement;
  const spacerTop = wrapper.querySelector('.log-viewer-spacer-top') as HTMLElement;
  const itemsContainer = wrapper.querySelector('.log-viewer-items') as HTMLElement;
  const spacerBottom = wrapper.querySelector('.log-viewer-spacer-bottom') as HTMLElement;
  const emptyEl = wrapper.querySelector('.log-viewer-empty') as HTMLElement;
  const levelSelect = wrapper.querySelector('.log-viewer-level-filter') as HTMLSelectElement;
  const categorySelect = wrapper.querySelector('.log-viewer-category-filter') as HTMLSelectElement;
  const searchInput = wrapper.querySelector('.log-viewer-search') as HTMLInputElement;
  const countEl = wrapper.querySelector('.log-viewer-count') as HTMLElement;
  const copyBtn = wrapper.querySelector('.log-viewer-copy-btn') as HTMLButtonElement;
  const clearBtn = wrapper.querySelector('.log-viewer-clear-btn') as HTMLButtonElement;

  let aborted = false;
  signal.addEventListener(
    'abort',
    () => {
      aborted = true;
    },
    { once: true }
  );

  function applyFilters(): void {
    if (aborted) return;
    let result = state.logs;

    if (state.levelFilter !== 'all') {
      result = result.filter((l) => l.level === state.levelFilter);
    }

    if (state.categoryFilter) {
      result = result.filter((l) => extractCategory(l.message) === state.categoryFilter);
    }

    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm) {
      result = result.filter(
        (l) =>
          l.message.toLowerCase().includes(searchTerm) ||
          (l.data !== undefined && JSON.stringify(l.data).toLowerCase().includes(searchTerm))
      );
    }

    state.filteredLogs = result;
    countEl.textContent = `${result.length} / ${state.logs.length} entries`;
    renderVisibleItems();
  }

  function updateCategories(): void {
    const cats = new Set<string>();
    for (const log of state.logs) {
      cats.add(extractCategory(log.message));
    }
    state.categories = Array.from(cats).sort();

    const prev = categorySelect.value;
    categorySelect.innerHTML = '<option value="">All categories</option>';
    for (const cat of state.categories) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      if (cat === prev) opt.selected = true;
      categorySelect.appendChild(opt);
    }
  }

  function renderVisibleItems(): void {
    const total = state.filteredLogs.length;
    state.containerHeight = viewport.clientHeight;
    state.scrollTop = viewport.scrollTop;

    const totalHeight = total * ITEM_HEIGHT;
    const startIndex = Math.max(0, Math.floor(state.scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const visibleCount = Math.ceil(state.containerHeight / ITEM_HEIGHT) + 2 * OVERSCAN;
    const endIndex = Math.min(total, startIndex + visibleCount);

    spacerTop.style.height = `${startIndex * ITEM_HEIGHT}px`;
    spacerBottom.style.height = `${Math.max(0, totalHeight - endIndex * ITEM_HEIGHT)}px`;

    itemsContainer.replaceChildren();
    for (let i = startIndex; i < endIndex; i++) {
      const entry = state.filteredLogs[i];
      if (!entry) continue;
      const el = createLogEntryEl(entry);
      el.setAttribute('role', 'listitem');
      itemsContainer.appendChild(el);
    }

    emptyEl.style.display = total === 0 ? '' : 'none';
    viewport.style.display = total === 0 ? 'none' : '';
  }

  function rebuildAll(): void {
    updateCategories();
    applyFilters();
  }

  async function loadLogs(): Promise<void> {
    state.logs = await getOfflineLogs();
    rebuildAll();
  }

  levelSelect.addEventListener(
    'change',
    () => {
      state.levelFilter = levelSelect.value as LogViewerState['levelFilter'];
      applyFilters();
    },
    { signal }
  );

  categorySelect.addEventListener(
    'change',
    () => {
      state.categoryFilter = categorySelect.value;
      applyFilters();
    },
    { signal }
  );

  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  searchInput.addEventListener(
    'input',
    () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => applyFilters(), 150);
    },
    { signal }
  );

  viewport.addEventListener(
    'scroll',
    () => {
      requestAnimationFrame(() => renderVisibleItems());
    },
    { signal }
  );

  copyBtn.addEventListener(
    'click',
    () => {
      const text = state.filteredLogs
        .map((l) => `[${formatTimestamp(l.timestamp)}] [${l.level.toUpperCase()}] ${l.message}`)
        .join('\n');
      void navigator.clipboard.writeText(text);
    },
    { signal }
  );

  clearBtn.addEventListener(
    'click',
    async () => {
      const confirmed = await showConfirmDialog({
        title: 'Clear all logs?',
        message: 'This will permanently remove all stored log entries.',
        confirmLabel: 'Clear logs',
        cancelLabel: 'Cancel',
        variant: 'danger',
      });
      if (!confirmed) return;
      await clearOfflineLogs();
      state.logs = [];
      rebuildAll();
    },
    { signal }
  );

  observer = new ResizeObserver(() => {
    renderVisibleItems();
  });
  observer.observe(viewport);

  void loadLogs();

  return () => {
    clearTimeout(searchTimeout);
    observer?.disconnect();
  };
}
