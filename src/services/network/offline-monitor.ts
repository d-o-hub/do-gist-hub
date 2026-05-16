import { safeError, safeLog } from '../security/logger';
/**
 * Network Monitor Service
 * Tracks online/offline status and triggers sync events
 */

export type NetworkStatus = 'online' | 'offline';

type NetworkChangeHandler = (status: NetworkStatus) => void;

class NetworkMonitor {
  private status: NetworkStatus = navigator.onLine ? 'online' : 'offline';
  private listeners: Set<NetworkChangeHandler> = new Set();
  private initialized = false;
  private abortController = new AbortController();

  /**
   * Initialize network monitoring
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    const signal = this.abortController.signal;

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline(), { signal });
    window.addEventListener('offline', () => this.handleOffline(), { signal });

    this.initialized = true;
    safeLog('[NetworkMonitor] Initialized, current status:', this.status);
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.status;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.status === 'online';
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(handler: NetworkChangeHandler): () => void {
    this.listeners.add(handler);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(handler);
    };
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    const oldStatus = this.status;
    this.status = 'online';

    safeLog('[NetworkMonitor] Status changed: offline → online');

    if (oldStatus !== this.status) {
      this.notifyListeners();

      // Dispatch custom event for other parts of the app
      window.dispatchEvent(new CustomEvent('app:online'));
    }
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    const oldStatus = this.status;
    this.status = 'offline';

    safeLog('[NetworkMonitor] Status changed: online → offline');

    if (oldStatus !== this.status) {
      this.notifyListeners();

      // Dispatch custom event for other parts of the app
      window.dispatchEvent(new CustomEvent('app:offline'));
    }
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach((handler) => {
      try {
        handler(this.status);
      } catch (error) {
        safeError('[NetworkMonitor] Error in listener:', error);
      }
    });
  }

  /**
   * Cleanup - remove event listeners
   */
  destroy(): void {
    this.abortController.abort();
    this.listeners.clear();
    this.initialized = false;
    safeLog('[NetworkMonitor] Destroyed');
  }
}

// Singleton instance
const networkMonitor = new NetworkMonitor();

export default networkMonitor;
