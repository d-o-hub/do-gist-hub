/**
 * UI Store
 * Singleton reactive store for UI state
 */

// UI Store - no external service dependencies needed

export type Theme = 'light' | 'dark' | 'system';
export type Route = 'home' | 'starred' | 'create' | 'settings' | 'offline' | 'detail' | 'conflicts';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
}

export interface UIState {
  theme: Theme;
  currentRoute: Route;
  toasts: Toast[];
  commandPaletteOpen: boolean;
}

export type UIStoreListener = (state: UIState) => void;

class UIStore {
  private state: UIState = {
    theme: (localStorage.getItem('theme-preference') as Theme) || 'system',
    currentRoute: 'home',
    toasts: [],
    commandPaletteOpen: false,
  };
  private listeners: UIStoreListener[] = [];
  private toastTimeouts = new Map<string, number>();

  constructor() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
  }

  subscribe(listener: UIStoreListener): () => void {
    this.listeners.push(listener);
    listener({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(): UIState {
    return { ...this.state };
  }

  setTheme(theme: Theme): void {
    this.state = { ...this.state, theme };
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme-preference', theme);
    this.notifyListeners();
  }

  navigate(route: Route): void {
    this.state = { ...this.state, currentRoute: route };
    this.notifyListeners();
  }

  showToast(message: string, type: Toast['type'] = 'info', duration = 3000): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { id, message, type, duration };
    this.state = { ...this.state, toasts: [...this.state.toasts, toast] };
    this.notifyListeners();

    const timeout = window.setTimeout(() => {
      this.hideToast(id);
    }, duration);
    this.toastTimeouts.set(id, timeout);
  }

  hideToast(id: string): void {
    const timeout = this.toastTimeouts.get(id);
    if (timeout) {
      window.clearTimeout(timeout);
      this.toastTimeouts.delete(id);
    }
    this.state = {
      ...this.state,
      toasts: this.state.toasts.filter((t) => t.id !== id),
    };
    this.notifyListeners();
  }

  toggleCommandPalette(): void {
    this.state = { ...this.state, commandPaletteOpen: !this.state.commandPaletteOpen };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = { ...this.state };
    this.listeners.forEach((l) => l(state));
  }
}

const uiStore = new UIStore();
export default uiStore;
