/**
 * Single source of truth for app identity.
 * All references (manifest, capacitor, IndexedDB, SW, docs) derive from here.
 */

export const APP = {
  /** Canonical package name (npm, repo ID) */
  id: 'd-o-gist-hub',

  /** Display name (UI title, PWA name, Capacitor appName) */
  name: 'd.o. Gist Hub',

  /** Short name for PWA (icon label, Android launcher) */
  shortName: 'd.o. Gists',

  /** One-line description shown in npm search and PWA install prompt */
  description:
    'd.o. Gist Hub — offline-first GitHub Gist management app with token-driven design and Android support',

  /** Theme color for PWA status bar / manifest / meta */
  themeColor: '#2563eb',

  /** Derived identifiers */
  appId: 'com.dogisthub.app',
  dbName: 'd-o-gist-hub-db',
  cacheName: 'd-o-gist-hub-v1',
  staticCacheName: 'd-o-gist-hub-static-v1',
  apiCacheName: 'd-o-gist-hub-api-v1',
} as const;

export type AppConfig = typeof APP;
