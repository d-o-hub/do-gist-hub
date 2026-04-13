/**
 * Service Worker Registration
 * Registers the PWA service worker and handles updates
 */

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Worker not supported');
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
          console.log('[PWA] New version available');
          notifyUpdateAvailable();
        }
      });
    });

    console.log('[PWA] Service Worker registered');
    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
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
 * Notify user of update (placeholder - can be enhanced with UI)
 */
function notifyUpdateAvailable(): void {
  // Could show a toast or banner: "New version available. Refresh to update."
  console.log('[PWA] Update available - refresh to get latest version');
}

/**
 * Check if app is installed (service worker registered)
 */
export function isInstalled(): boolean {
  return 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
}
