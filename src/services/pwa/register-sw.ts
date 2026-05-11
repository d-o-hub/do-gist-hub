import { safeError, safeLog, safeWarn } from '../security/logger';
/**
 * Service Worker Registration
 * Registers the PWA service worker and handles updates
 */

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    safeWarn('[PWA] Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available, prompt user to refresh
          safeLog('[PWA] New version available');
          notifyUpdateAvailable();
        }
      });
    });

    safeLog('[PWA] Service Worker registered');
    return registration;
  } catch (error) {
    safeError('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister the service worker (for development/debugging)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  return registration.unregister();
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;

  return new Promise<void>((resolve) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = () => {
      resolve();
    };

    registration.active?.postMessage({ type: 'CLEAR_CACHE' }, [messageChannel.port2]);
  });
}

/**
 * Background Sync API (not yet in standard TS lib types)
 */
interface SyncManager {
  register(tag: string): Promise<void>;
}

/**
 * Notify user of update (placeholder - can be enhanced with UI)
 */
function notifyUpdateAvailable(): void {
  // Could show a toast or banner: "New version available. Refresh to update."
  safeLog('[PWA] Update available - refresh to get latest version');
}

/**
 * Check if app is installed (service worker registered)
 */
export function isInstalled(): boolean {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
}

/**
 * Request background sync for pending writes
 */
export async function requestBackgroundSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as ServiceWorkerRegistration & { sync: SyncManager }).sync.register(
      'sync-gists'
    );
    safeLog('[PWA] Background sync registered');
    return true;
  } catch (error) {
    safeError('[PWA] Background sync registration failed:', error);
    return false;
  }
}
