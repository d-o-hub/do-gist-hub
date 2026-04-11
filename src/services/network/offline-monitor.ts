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

  /**
   * Initialize network monitoring
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    this.initialized = true;
    console.log('[NetworkMonitor] Initialized, current status:', this.status);
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
    
    console.log('[NetworkMonitor] Status changed: offline → online');
    
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
    
    console.log('[NetworkMonitor] Status changed: online → offline');
    
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
        console.error('[NetworkMonitor] Error in listener:', error);
      }
    });
  }

  /**
   * Cleanup - remove event listeners
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
    this.listeners.clear();
    this.initialized = false;
    console.log('[NetworkMonitor] Destroyed');
  }
}

// Singleton instance
const networkMonitor = new NetworkMonitor();

export default networkMonitor;
