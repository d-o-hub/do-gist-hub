/// <reference types="vite/client" />

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onRegisteredSW?: (swUrl: string, r: ServiceWorkerRegistration | undefined) => void;
    onNeedRefresh?: () => void;
  }

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
