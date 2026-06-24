/**
 * Vitest setup: suppress known benign unhandled rejections from
 * dynamic import side effects in test environment (IndexedDB not available).
 * Unexpected rejections are rethrown so real errors surface.
 *
 * Also polyfills Popover API methods for JSDOM environments.
 */
const BENIGN_PATTERNS = [
  'indexeddb',
  'idbfactory',
  'failed to execute',
  'could not open database',
  'the database connection is closing',
  'transaction is not active',
];

process.on('unhandledRejection', (reason: unknown) => {
  const message =
    reason instanceof Error ? reason.message.toLowerCase() : String(reason).toLowerCase();
  const isBenign = BENIGN_PATTERNS.some((p) => message.includes(p));
  if (isBenign) {
    if (process.env.VERBOSE) {
      console.debug('[setup.ts] suppressed benign rejection:', reason);
    }
    return;
  }
  throw reason;
});

if (typeof IntersectionObserver === 'undefined') {
  // @ts-expect-error JSDOM polyfill: IntersectionObserver not in type defs
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

if (typeof ResizeObserver === 'undefined') {
  // @ts-expect-error JSDOM polyfill: ResizeObserver not in type defs
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof HTMLElement !== 'undefined') {
  if (!('showPopover' in HTMLElement.prototype)) {
    // @ts-expect-error JSDOM polyfill: showPopover not in type defs
    HTMLElement.prototype.showPopover = function showPopoverPolyfill() {
      if (this.popover && this.popover !== 'none') {
        this.classList.add('popover-open');
      }
    };
    // @ts-expect-error JSDOM polyfill: hidePopover not in type defs
    HTMLElement.prototype.hidePopover = function hidePopoverPolyfill() {
      if (this.popover && this.popover !== 'none') {
        this.classList.remove('popover-open');
      }
    };
    // @ts-expect-error JSDOM polyfill: togglePopover not in type defs
    HTMLElement.prototype.togglePopover = function togglePopoverPolyfill() {
      if (this.popover && this.popover !== 'none') {
        this.classList.toggle('popover-open');
      }
    };
  }
}
