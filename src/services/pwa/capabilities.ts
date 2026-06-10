/**
 * PWA Capabilities Service
 * Wires modern browser APIs to the app: persistent storage, app badge, install prompt.
 */

import { safeLog, safeWarn } from '../security/logger';

const STORAGE_PERSIST_KEY = 'pwa.storage.persist.granted';
const INSTALL_DISMISS_KEY = 'pwa.install.dismissedAt';
const INSTALL_DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

class CapabilitiesService {
  private deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
  private installPromptListeners = new Set<(available: boolean) => void>();
  private abortController = new AbortController();
  private installPromptListenersBound = false;

  /**
   * Initialize all PWA capabilities. Safe to call multiple times.
   */
  init(): void {
    void this.requestPersistentStorage();
    if (this.abortController.signal.aborted) {
      this.abortController = new AbortController();
    }
    this.captureInstallPrompt();
  }

  /**
   * Request persistent storage so IndexedDB isn't evicted under pressure.
   * Resolves to true if granted, false if denied or unsupported.
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
      return false;
    }
    try {
      const alreadyPersisted = await navigator.storage.persisted();
      if (alreadyPersisted) {
        safeLog('[PWA] Storage already persistent');
        localStorage.setItem(STORAGE_PERSIST_KEY, '1');
        return true;
      }
      const granted = await navigator.storage.persist();
      if (granted) {
        safeLog('[PWA] Persistent storage granted');
        localStorage.setItem(STORAGE_PERSIST_KEY, '1');
      } else {
        safeWarn('[PWA] Persistent storage denied by browser');
      }
      return granted;
    } catch (error) {
      safeWarn('[PWA] Failed to request persistent storage:', error);
      return false;
    }
  }

  /**
   * Whether the user previously granted persistent storage.
   */
  hasPersistentStorage(): boolean {
    return localStorage.getItem(STORAGE_PERSIST_KEY) === '1';
  }

  /**
   * Set the app icon badge to the pending sync queue length.
   * No-op on browsers without Badging API support.
   */
  async setSyncBadge(count: number): Promise<void> {
    if (typeof navigator === 'undefined') return;
    if (!('setAppBadge' in navigator)) return;
    try {
      if (count <= 0) {
        await (navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.();
      } else {
        await (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> }).setAppBadge(
          count
        );
      }
    } catch (error) {
      safeWarn('[PWA] Failed to set app badge:', error);
    }
  }

  /**
   * Capture the beforeinstallprompt event and surface it via subscribe().
   */
  private captureInstallPrompt(): void {
    if (typeof window === 'undefined') return;
    if (this.installPromptListenersBound && !this.abortController.signal.aborted) return;
    this.installPromptListenersBound = true;

    window.addEventListener(
      'beforeinstallprompt',
      (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e as BeforeInstallPromptEvent;
        safeLog('[PWA] Install prompt captured');
        for (const listener of this.installPromptListeners) {
          listener(true);
        }
      },
      { signal: this.abortController.signal }
    );

    window.addEventListener(
      'appinstalled',
      () => {
        safeLog('[PWA] App installed');
        this.deferredInstallPrompt = null;
        for (const listener of this.installPromptListeners) {
          listener(false);
        }
      },
      { signal: this.abortController.signal }
    );
  }

  /**
   * Whether the install prompt is currently available and the user hasn't dismissed it recently.
   */
  isInstallPromptAvailable(): boolean {
    if (!this.deferredInstallPrompt) return false;
    const dismissedAt = localStorage.getItem(INSTALL_DISMISS_KEY);
    if (!dismissedAt) return true;
    const elapsed = Date.now() - Number(dismissedAt);
    return elapsed > INSTALL_DISMISS_COOLDOWN_MS;
  }

  /**
   * Subscribe to changes in install prompt availability.
   * Listener is invoked immediately with the current state.
   */
  onInstallPromptChange(listener: (available: boolean) => void): () => void {
    this.installPromptListeners.add(listener);
    listener(this.isInstallPromptAvailable());
    return () => {
      this.installPromptListeners.delete(listener);
    };
  }

  /**
   * Trigger the native install prompt. Returns the outcome.
   */
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredInstallPrompt) return 'unavailable';
    try {
      await this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      for (const listener of this.installPromptListeners) {
        listener(false);
      }
      return choice.outcome;
    } catch (error) {
      safeWarn('[PWA] Install prompt failed:', error);
      return 'dismissed';
    }
  }

  /**
   * Mark the install prompt as dismissed by the user (cooldown applies).
   */
  dismissInstallPrompt(): void {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    for (const listener of this.installPromptListeners) {
      listener(this.isInstallPromptAvailable());
    }
  }

  destroy(): void {
    this.abortController.abort();
    this.installPromptListeners.clear();
    this.installPromptListenersBound = false;
  }
}

export const capabilities = new CapabilitiesService();
