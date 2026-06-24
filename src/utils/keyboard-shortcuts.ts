import { announcer } from './announcer';
import { focusTrap } from './focus-trap';

interface Shortcut {
  key: string;
  label: string;
  description: string;
  category: string;
  action?: () => void;
}

type NavigateFn = (route: string) => void;

let helpModalContainer: HTMLElement | null = null;
let helpModalBackdrop: HTMLElement | null = null;
let isHelpOpen = false;
let pendingKey: string | null = null;
let pendingTimeout: number | undefined;

const SHORTCUTS: Shortcut[] = [
  { key: '/', label: '/', description: 'Focus search', category: 'Navigation' },
  { key: 'n', label: 'n', description: 'New gist', category: 'Navigation' },
  { key: '?', label: '?', description: 'Show keyboard shortcuts', category: 'Help' },
  { key: 'g→h', label: 'g h', description: 'Go to Home', category: 'Navigation' },
  { key: 'g→s', label: 'g s', description: 'Go to Starred', category: 'Navigation' },
  { key: 'Esc', label: 'Esc', description: 'Deselect / Close', category: 'General' },
];

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

function navigate(route: string, navigateFn?: NavigateFn): void {
  if (navigateFn) {
    navigateFn(route);
  } else {
    window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route } }));
  }
}

function focusSearch(): void {
  const searchInput = document.querySelector('#gist-search') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.focus();
    announcer.announce('Search focused');
  }
}

function openHelpModal(): void {
  if (isHelpOpen) return;
  isHelpOpen = true;

  if (!helpModalBackdrop) {
    helpModalBackdrop = document.createElement('div');
    helpModalBackdrop.className = 'keyboard-help-backdrop';
    helpModalBackdrop.addEventListener('click', closeHelpModal);
    document.body.appendChild(helpModalBackdrop);
  }

  if (!helpModalContainer) {
    helpModalContainer = document.createElement('div');
    helpModalContainer.className = 'keyboard-help-modal';
    helpModalContainer.setAttribute('role', 'dialog');
    helpModalContainer.setAttribute('aria-modal', 'true');
    helpModalContainer.setAttribute('aria-label', 'Keyboard shortcuts');
    helpModalContainer.setAttribute('popover', 'manual');
    document.body.appendChild(helpModalContainer);
  }

  helpModalContainer.replaceChildren();

  const header = document.createElement('div');
  header.className = 'keyboard-help-header';
  const title = document.createElement('h2');
  title.textContent = 'Keyboard Shortcuts';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'icon-button keyboard-help-close';
  closeBtn.setAttribute('aria-label', 'Close shortcuts');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', closeHelpModal);
  header.appendChild(title);
  header.appendChild(closeBtn);
  helpModalContainer.appendChild(header);

  const body = document.createElement('div');
  body.className = 'keyboard-help-body';

  const categories = new Map<string, Shortcut[]>();
  for (const s of SHORTCUTS) {
    const list = categories.get(s.category) || [];
    list.push(s);
    categories.set(s.category, list);
  }

  for (const [cat, items] of categories) {
    const section = document.createElement('div');
    section.className = 'keyboard-help-section';
    const heading = document.createElement('h3');
    heading.textContent = cat;
    section.appendChild(heading);
    const list = document.createElement('dl');
    list.className = 'keyboard-help-list';
    for (const s of items) {
      const dt = document.createElement('dt');
      const kbd = document.createElement('kbd');
      kbd.textContent = s.label;
      dt.appendChild(kbd);
      const dd = document.createElement('dd');
      dd.textContent = s.description;
      list.appendChild(dt);
      list.appendChild(dd);
    }
    section.appendChild(list);
    body.appendChild(section);
  }

  helpModalContainer.appendChild(body);

  helpModalBackdrop.classList.add('visible');
  helpModalContainer.showPopover();
  focusTrap.activate(helpModalContainer);
  announcer.announce('Keyboard shortcuts opened');
}

function closeHelpModal(): void {
  if (!isHelpOpen) return;
  isHelpOpen = false;

  if (helpModalContainer) {
    focusTrap.deactivate();
    helpModalContainer.hidePopover();
  }
  if (helpModalBackdrop) {
    helpModalBackdrop.classList.remove('visible');
  }
}

export function registerKeyboardShortcuts(signal: AbortSignal, navigateFn?: NavigateFn): void {
  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHelpOpen) {
        e.preventDefault();
        closeHelpModal();
        return;
      }

      if (isInputFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (pendingKey) {
        clearTimeout(pendingTimeout);
        pendingTimeout = undefined;
        const combo = `${pendingKey}→${e.key}`;
        pendingKey = null;

        if (combo === 'g→h') {
          e.preventDefault();
          navigate('home', navigateFn);
          announcer.announce('Navigating to Home');
          return;
        }
        if (combo === 'g→s') {
          e.preventDefault();
          navigate('starred', navigateFn);
          announcer.announce('Navigating to Starred');
          return;
        }
        return;
      }

      if (e.key === 'g') {
        e.preventDefault();
        pendingKey = 'g';
        pendingTimeout = window.setTimeout(() => {
          pendingKey = null;
        }, 1000);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        focusSearch();
        return;
      }

      if (e.key === 'n') {
        e.preventDefault();
        navigate('create', navigateFn);
        announcer.announce('Creating new gist');
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        if (isHelpOpen) {
          closeHelpModal();
        } else {
          openHelpModal();
        }
        return;
      }
    },
    { signal }
  );
}

export function destroyKeyboardShortcuts(): void {
  if (pendingTimeout !== undefined) {
    clearTimeout(pendingTimeout);
    pendingTimeout = undefined;
  }
  pendingKey = null;
  closeHelpModal();
  if (helpModalContainer) {
    helpModalContainer.remove();
    helpModalContainer = null;
  }
  if (helpModalBackdrop) {
    helpModalBackdrop.remove();
    helpModalBackdrop = null;
  }
}

export function getShortcuts(): Shortcut[] {
  return SHORTCUTS;
}
