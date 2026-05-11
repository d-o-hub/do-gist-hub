/// <reference types="vite/client" />

// Self-hosted variable fonts (ADR-022)
declare module '@fontsource-variable/inter';
declare module '@fontsource-variable/jetbrains-mono';
declare module '@fontsource/anton';

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onRegisteredSW?: (swUrl: string, r: ServiceWorkerRegistration | undefined) => void;
    onNeedRefresh?: () => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
