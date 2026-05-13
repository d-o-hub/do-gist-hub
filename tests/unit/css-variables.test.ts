import { describe, it, expect } from 'vitest';
import { generateCSSVariables } from '../../src/tokens/css-variables';
import {
  expectToken,
  expectTokens,
  expectBalancedBraces,
  expectBalancedParens,
  expectSemicolons,
  expectSectionTokens,
  expectMinMediaQueries,
  expectBalancedBrackets,
} from '../helpers/token-assertions';

describe('generateCSSVariables', () => {
  const css = generateCSSVariables();

  // ── Basic structure ──────────────────────────

  it('returns a non-empty string', () => {
    expect(css).toBeTruthy();
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(1000);
  });

  it('contains :root selector for base tokens', () => {
    expect(css).toContain(':root');
  });

  it('contains [data-theme="dark"] selector for dark theme', () => {
    expect(css).toContain('[data-theme="dark"]');
  });

  it('contains prefers-reduced-motion media query for accessibility', () => {
    expect(css).toContain('prefers-reduced-motion');
  });

  it('contains prefers-contrast media query for high contrast mode', () => {
    expect(css).toContain('prefers-contrast');
  });

  // ── Color Primitives ─────────────────────────

  it('generates color primitive tokens', () => {
    expectTokens(css, [
      '--color-black',
      '--color-white',
      '--color-gray-50',
      '--color-gray-900',
      '--color-gray-950',
    ]);
  });

  // ── Semantic Colors ──────────────────────────

  it('generates semantic background tokens', () => {
    expectTokens(css, [
      '--color-background-primary',
      '--color-background-secondary',
      '--color-background-tertiary',
      '--color-background-elevated',
    ]);
  });

  it('generates semantic foreground tokens', () => {
    expectTokens(css, [
      '--color-foreground-primary',
      '--color-foreground-secondary',
      '--color-foreground-muted',
    ]);
  });

  it('generates accent tokens', () => {
    expectTokens(css, [
      '--color-accent-primary',
      '--color-accent-hover',
      '--color-accent-subtle',
      '--color-accent-glow',
    ]);
  });

  it('generates border tokens', () => {
    expectTokens(css, [
      '--color-border-default',
      '--color-border-emphasis',
      '--color-border-strong',
    ]);
  });

  it('generates status tokens (success, error, warning, info)', () => {
    expectTokens(css, [
      '--color-status-success-bg',
      '--color-status-success-fg',
      '--color-status-error-bg',
      '--color-status-error-fg',
      '--color-status-warning-bg',
      '--color-status-warning-fg',
      '--color-status-info-bg',
      '--color-status-info-fg',
    ]);
  });

  it('generates interactive tokens', () => {
    expectTokens(css, [
      '--color-interactive-hover',
      '--color-interactive-active',
      '--color-interactive-focus',
    ]);
  });

  // ── Spacing Tokens ───────────────────────────

  it('generates spacing tokens', () => {
    expectTokens(css, [
      '--spacing-0',
      '--spacing-4',
      '--spacing-8',
      '--spacing-16',
      '--spacing-32',
      '--spacing-64',
      '--spacing-96',
      '--spacing-100',
    ]);
  });

  // ── Typography Tokens ────────────────────────

  it('generates font family tokens', () => {
    expectTokens(css, [
      '--font-family-sans',
      '--font-family-serif',
      '--font-family-mono',
    ]);
  });

  it('generates semantic font aliases for self-hosted fonts', () => {
    expectTokens(css, [
      '--font-body',
      '--font-display',
      '--font-mono',
    ]);
  });

  it('generates font size tokens', () => {
    expectTokens(css, [
      '--font-size-xs',
      '--font-size-base',
      '--font-size-lg',
      '--font-size-2xl',
      '--font-size-9xl',
    ]);
  });

  it('generates font weight tokens', () => {
    expectTokens(css, [
      '--font-weight-thin',
      '--font-weight-normal',
      '--font-weight-bold',
      '--font-weight-black',
    ]);
  });

  it('generates line height tokens', () => {
    expectTokens(css, [
      '--line-height-none',
      '--line-height-tight',
      '--line-height-normal',
      '--line-height-loose',
    ]);
  });

  it('generates letter spacing tokens', () => {
    expectTokens(css, [
      '--letter-spacing-tighter',
      '--letter-spacing-normal',
      '--letter-spacing-widest',
    ]);
  });

  // ── Radius Tokens ────────────────────────────

  it('generates radius tokens', () => {
    expectTokens(css, [
      '--radius-none',
      '--radius-sm',
      '--radius-base',
      '--radius-md',
      '--radius-lg',
      '--radius-xl',
      '--radius-2xl',
      '--radius-3xl',
      '--radius-full',
    ]);
  });

  // ── Motion Tokens ────────────────────────────

  it('generates motion duration tokens', () => {
    expectTokens(css, [
      '--motion-duration-instant',
      '--motion-duration-fast',
      '--motion-duration-normal',
      '--motion-duration-slow',
      '--motion-duration-deliberate',
      '--motion-duration-pulse',
    ]);
  });

  it('generates motion easing tokens', () => {
    expectTokens(css, [
      '--motion-easing-linear',
      '--motion-easing-smooth',
      '--motion-easing-out',
      '--motion-easing-in',
      '--motion-easing-elastic',
      '--motion-easing-spring',
    ]);
  });

  it('generates legacy motion alias tokens', () => {
    expectTokens(css, [
      '--motion-easing-ease-out',
      '--motion-easing-ease-in',
      '--motion-easing-ease-in-out',
      '--motion-duration-slower',
    ]);
  });

  // ── Shadow Tokens ────────────────────────────

  it('generates shadow tokens', () => {
    expectTokens(css, [
      '--shadow-none',
      '--shadow-sm',
      '--shadow-md',
      '--shadow-lg',
      '--shadow-xl',
      '--shadow-2xl',
      '--shadow-inner',
      '--shadow-accent',
    ]);
  });

  // ── Breakpoint Tokens ────────────────────────

  it('generates breakpoint tokens', () => {
    expectTokens(css, [
      '--bp-phone-small',
      '--bp-phone',
      '--bp-phone-large',
      '--bp-tablet-portrait',
      '--bp-tablet-landscape',
      '--bp-desktop',
      '--bp-desktop-wide',
    ]);
  });

  // ── Component Tokens ─────────────────────────

  it('generates component tokens', () => {
    expectTokens(css, [
      '--nav-bottom-height',
      '--nav-sidebar-width',
      '--ui-backdrop-bg',
      '--ui-backdrop-blur',
      '--gist-card-bg',
      '--gist-card-shadow',
    ]);
  });

  // ── Legacy Aliases ───────────────────────────

  it('generates legacy alias tokens for backward compatibility', () => {
    expectTokens(css, [
      '--color-bg',
      '--color-text',
      '--color-accent',
      '--color-surface',
      '--color-border',
      '--color-divider',
      '--color-error',
      '--color-success',
    ]);
  });

  // ── Surface & Overlay Tokens ─────────────────

  it('generates surface and overlay tokens', () => {
    expectTokens(css, [
      '--color-surface-overlay',
      '--color-surface-overlay-heavy',
      '--color-backdrop-medium',
      '--color-backdrop-heavy',
      '--color-nav-bg',
      '--color-header-bg',
      '--color-modal-bg',
    ]);
  });

  // ── Skeleton Tokens ──────────────────────────

  it('generates skeleton shimmer tokens', () => {
    expectTokens(css, [
      '--skeleton-shimmer-start',
      '--skeleton-shimmer-mid',
    ]);
  });

  // ── Dark Theme (beyond just the selector) ────

  it('generates dark mode shadow overrides', () => {
    expectSectionTokens(css, '[data-theme="dark"]', [
      '--shadow-md',
      '--shadow-lg',
    ]);
  });

  it('generates dark mode glass effect tokens', () => {
    expectSectionTokens(css, '[data-theme="dark"]', [
      '--ui-glass-bg',
      '--ui-glass-border',
    ]);
  });

  // ── Responsive Container Spacing ─────────────

  it('generates responsive container spacing queries', () => {
    expectToken(css, '--spacing-container');
    expectMinMediaQueries(css, 7);
  });

  // ── Reduced Motion ───────────────────────────

  it('reduced motion media query zeroes out animation durations', () => {
    const reducedMotionSection = css.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?(?=@media|$)/);
    expect(reducedMotionSection).not.toBeNull();
    const section = reducedMotionSection![0] ?? '';
    expect(section).toContain('animation-duration: 0.01ms');
    expect(section).toContain('--motion-duration-instant: 0ms');
    expect(section).toContain('--motion-duration-fast: 0ms');
    expect(section).toContain('--motion-duration-normal: 0ms');
  });

  // ── CSS Syntax Validation ────────────────────

  it('has balanced curly braces', () => {
    expectBalancedBraces(css);
  });

  it('has balanced parentheses', () => {
    expectBalancedParens(css);
  });

  it('has balanced square brackets', () => {
    expectBalancedBrackets(css);
  });

  it('uses semicolons consistently', () => {
    expectSemicolons(css, 200);
  });

  // ── Snapshot ─────────────────────────────────

  it('matches the full CSS output snapshot', () => {
    expect(css).toMatchSnapshot();
  });
});
