/**
 * Application Lifecycle Service (2026)
 * Manages cleanup of resources on navigation and app shutdown.
 */

import { cancelAllRequests } from './github/client';
import { safeError, safeLog } from './security/logger';

export type CleanupFunction = () => void;

class LifecycleManager {
  private routeCleanups: CleanupFunction[] = [];
  private appCleanups: CleanupFunction[] = [];
  private routeAbortController = new AbortController();

  /**
   * Register a cleanup function for the current route scope
   */
  onRouteCleanup(cleanup: CleanupFunction): void {
    this.routeCleanups.push(cleanup);
  }

  /**
   * Register a cleanup function for the entire app session
   */
  onAppCleanup(cleanup: CleanupFunction): void {
    this.appCleanups.push(cleanup);
  }

  /**
   * Get the AbortSignal for the current route
   */
  getRouteSignal(): AbortSignal {
    return this.routeAbortController.signal;
  }

  /**
   * Execute all route-scoped cleanups
   */
  cleanupRoute(): void {
    safeLog('[Lifecycle] Cleaning up route resources...');

    // Abort current route listeners/requests
    this.routeAbortController.abort();
    this.routeAbortController = new AbortController();

    // Cancel in-flight requests
    cancelAllRequests();

    // Execute registered cleanups
    this.routeCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        safeError('[Lifecycle] Route cleanup error:', error);
      }
    });

    this.routeCleanups = [];
  }

  /**
   * Execute all app-scoped cleanups
   */
  cleanupApp(): void {
    safeLog('[Lifecycle] Cleaning up application resources...');

    this.cleanupRoute();

    this.appCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        safeError('[Lifecycle] App cleanup error:', error);
      }
    });

    this.appCleanups = [];
  }
}

export const lifecycle = new LifecycleManager();
