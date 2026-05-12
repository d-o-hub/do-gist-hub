/**
 * Unit tests for Accessible Button Component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Imports ───────────────────────────────────────────────────────────

import { createButton } from '../../src/components/ui/button';

// ── Tests ─────────────────────────────────────────────────────────────

describe('createButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a button element with label text', () => {
    const button = createButton({
      label: 'Click Me',
      onClick: vi.fn(),
    });

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.textContent).toBe('Click Me');
    expect(button.type).toBe('button');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const button = createButton({ label: 'Go', onClick });

    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies primary variant class', () => {
    const button = createButton({
      label: 'Primary',
      onClick: vi.fn(),
      variant: 'primary',
    });

    expect(button.classList.contains('btn-primary')).toBe(true);
  });

  it('applies secondary variant class', () => {
    const button = createButton({
      label: 'Secondary',
      onClick: vi.fn(),
      variant: 'secondary',
    });

    expect(button.classList.contains('btn-secondary')).toBe(true);
  });

  it('applies ghost variant class', () => {
    const button = createButton({
      label: 'Ghost',
      onClick: vi.fn(),
      variant: 'ghost',
    });

    expect(button.classList.contains('btn-ghost')).toBe(true);
  });

  it('sets disabled state and aria-disabled', () => {
    const button = createButton({
      label: 'Disabled',
      onClick: vi.fn(),
      disabled: true,
    });

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('sets loading state with aria-busy and aria-live', () => {
    const button = createButton({
      label: 'Loading',
      onClick: vi.fn(),
      loading: true,
    });

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-live')).toBe('polite');
    expect(button.disabled).toBe(true);
  });

  it('sets aria-label when provided', () => {
    const button = createButton({
      label: 'X',
      onClick: vi.fn(),
      ariaLabel: 'Close dialog',
    });

    expect(button.getAttribute('aria-label')).toBe('Close dialog');
  });

  it('sets aria-expanded when provided', () => {
    const button = createButton({
      label: 'Menu',
      onClick: vi.fn(),
      ariaExpanded: true,
    });

    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('sets aria-expanded false when provided', () => {
    const button = createButton({
      label: 'Menu',
      onClick: vi.fn(),
      ariaExpanded: false,
    });

    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('sets aria-controls when provided', () => {
    const button = createButton({
      label: 'Open',
      onClick: vi.fn(),
      ariaControls: 'menu-1',
    });

    expect(button.getAttribute('aria-controls')).toBe('menu-1');
  });

  it('does not set optional ARIA attributes when not provided', () => {
    const button = createButton({
      label: 'Simple',
      onClick: vi.fn(),
    });

    expect(button.hasAttribute('aria-label')).toBe(false);
    expect(button.hasAttribute('aria-expanded')).toBe(false);
    expect(button.hasAttribute('aria-controls')).toBe(false);
  });

  it('has btn class by default', () => {
    const button = createButton({
      label: 'Default',
      onClick: vi.fn(),
    });

    expect(button.classList.contains('btn')).toBe(true);
  });
});
