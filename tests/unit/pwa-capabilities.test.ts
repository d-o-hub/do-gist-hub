/**
 * Unit tests for PWA capabilities service
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
  safeWarn: vi.fn(),
}));

import { capabilities } from '../../src/services/pwa/capabilities';

describe('PWA capabilities service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    capabilities.destroy();
  });

  it('requests persistent storage and records the result', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    const persisted = vi.fn().mockResolvedValue(false);
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist, persisted },
    });

    const granted = await capabilities.requestPersistentStorage();
    expect(granted).toBe(true);
    expect(capabilities.hasPersistentStorage()).toBe(true);
  });

  it('returns false when persistent storage is unsupported', async () => {
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: undefined,
    });
    const granted = await capabilities.requestPersistentStorage();
    expect(granted).toBe(false);
  });

  it('returns true without re-prompting when storage is already persistent', async () => {
    const persisted = vi.fn().mockResolvedValue(true);
    const persist = vi.fn();
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist, persisted },
    });

    const granted = await capabilities.requestPersistentStorage();
    expect(granted).toBe(true);
    expect(persist).not.toHaveBeenCalled();
    expect(capabilities.hasPersistentStorage()).toBe(true);
  });

  it('clears the app badge when count is zero or negative', async () => {
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'setAppBadge', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clearAppBadge', {
      configurable: true,
      value: clearAppBadge,
    });

    await capabilities.setSyncBadge(0);
    expect(clearAppBadge).toHaveBeenCalled();
  });

  it('sets the app badge when count is positive', async () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'setAppBadge', {
      configurable: true,
      value: setAppBadge,
    });
    Object.defineProperty(navigator, 'clearAppBadge', {
      configurable: true,
      value: undefined,
    });

    await capabilities.setSyncBadge(3);
    expect(setAppBadge).toHaveBeenCalledWith(3);
  });

  it('reports install prompt unavailable before any event fires', () => {
    expect(capabilities.isInstallPromptAvailable()).toBe(false);
  });

  it('honors the dismissal cooldown', () => {
    capabilities.dismissInstallPrompt();
    expect(capabilities.isInstallPromptAvailable()).toBe(false);
  });

  it('makes the install prompt available after beforeinstallprompt fires and isInstallPromptAvailable is true', () => {
    capabilities.init();
    const listener = vi.fn();
    const unsubscribe = capabilities.onInstallPromptChange(listener);
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    window.dispatchEvent(event);

    expect(capabilities.isInstallPromptAvailable()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
  });

  it('subscribes to install prompt availability changes', () => {
    const listener = vi.fn();
    const unsubscribe = capabilities.onInstallPromptChange(listener);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('promptInstall returns "unavailable" without a deferred prompt', async () => {
    // Re-bind the appinstalled handler that was aborted by the previous test's cleanup.
    capabilities.init();
    window.dispatchEvent(new Event('appinstalled'));
    const outcome = await capabilities.promptInstall();
    expect(outcome).toBe('unavailable');
  });

  it('promptInstall returns "accepted" when the user accepts the install prompt', async () => {
    capabilities.init();
    const listener = vi.fn();
    capabilities.onInstallPromptChange(listener);
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    window.dispatchEvent(event);

    const outcome = await capabilities.promptInstall();
    expect(outcome).toBe('accepted');
    // listener should have been notified of unavailability after install
    const lastCall = listener.mock.calls[listener.mock.calls.length - 1];
    expect(lastCall?.[0]).toBe(false);
  });

  it('promptInstall returns "dismissed" when the user dismisses the install prompt', async () => {
    capabilities.init();
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });
    window.dispatchEvent(event);

    const outcome = await capabilities.promptInstall();
    expect(outcome).toBe('dismissed');
  });

  it('promptInstall returns "dismissed" when the prompt itself throws', async () => {
    capabilities.init();
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = vi.fn().mockRejectedValue(new Error('boom'));
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    window.dispatchEvent(event);

    const outcome = await capabilities.promptInstall();
    expect(outcome).toBe('dismissed');
  });

  it('dismissInstallPrompt notifies listeners with current availability', () => {
    capabilities.init();
    const listener = vi.fn();
    capabilities.onInstallPromptChange(listener);
    capabilities.dismissInstallPrompt();
    expect(listener).toHaveBeenCalled();
  });
});
