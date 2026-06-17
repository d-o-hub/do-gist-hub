import { toast } from '../../components/ui/toast';
import { safeError, safeLog, safeWarn } from '../security/logger';

/**
 * Service Worker Registration
 * Registers the PWA service worker and handles updates
 */

let controllerchangeListenerAttached = false;
let updateToastShown = false;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    safeWarn('[PWA] Service Worker not supported');
    return null;
  }

  try {
    // Use relative path — resolves relative to page URL, works at any deployment subpath
    const registration = await navigator.serviceWorker.register('./sw.js');

    // Handle updates — dedup guard prevents multiple toasts
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          if (!updateToastShown) {
            updateToastShown = true;
            safeLog('[PWA] New version available');
            notifyUpdateAvailable(registration);
          }
        }
      });
    });

    // Auto-reload when a new SW takes over (e.g. from another tab)
    // Guard prevents duplicate listeners if registerServiceWorker() is called more than once
    if (!controllerchangeListenerAttached) {
      controllerchangeListenerAttached = true;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

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
 * Notify user of update via toast notification
 */
function notifyUpdateAvailable(registration: ServiceWorkerRegistration): void {
  toast.info('New version available, refresh to update', 0, {
    label: 'Refresh',
    onClick: () => {
      // Tell the waiting SW to activate — the controllerchange listener
      // (registered above) will reload the page once it takes over.
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    },
  });
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
