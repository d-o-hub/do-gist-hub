#!/usr/bin/env npx tsx
/**
 * WCAG AA Contrast Checker for Design Tokens
 *
 * Verifies all foreground/background color token pairs meet:
 *   - WCAG AA normal text: 4.5:1 minimum
 *   - WCAG AA large text (18px+ or 14px+ bold): 3:1 minimum
 *
 * Sources token values directly from src/tokens/semantic/color-semantic.ts.
 * Run: npx tsx scripts/check-contrast.ts
 * Exit code: 0 if all pairs pass, 1 if any fail
 */

import { colorSemantic } from '../src/tokens/semantic/color-semantic';

function hexToRgba(hex: string): [number, number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
    return [
      Number.parseInt(clean.slice(0, 2), 16),
      Number.parseInt(clean.slice(2, 4), 16),
      Number.parseInt(clean.slice(4, 6), 16),
      1,
    ];
  }
  if (clean.length === 8) {
    if (!/^[0-9a-fA-F]{8}$/.test(clean)) return null;
    return [
      Number.parseInt(clean.slice(0, 2), 16),
      Number.parseInt(clean.slice(2, 4), 16),
      Number.parseInt(clean.slice(4, 6), 16),
      Number.parseInt(clean.slice(6, 8), 16) / 255,
    ];
  }
  return null;
}

function srgbChannel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

function relativeLuminanceHex(hex: string): number | null {
  const rgba = hexToRgba(hex);
  if (!rgba) {
    return null;
  }
  // relativeLuminance expects [r, g, b]
  return relativeLuminance(rgba[0], rgba[1], rgba[2]);
}

function contrastRatio(fg: string, bg: string): number | null {
  const l1 = relativeLuminanceHex(fg);
  const l2 = relativeLuminanceHex(bg);
  if (l1 === null || l2 === null) {
    return null;
  }
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Blend a semi-transparent foreground with a solid background.
 * Returns the resulting solid color as if rendered on that background.
 */
function blendRgbaOnHex(fgColor: string, bgHex: string): string | null {
  let rFg: number, gFg: number, bFg: number, a: number;

  const rgbaMatch = fgColor.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
  if (rgbaMatch) {
    rFg = Number.parseInt(rgbaMatch[1], 10);
    gFg = Number.parseInt(rgbaMatch[2], 10);
    bFg = Number.parseInt(rgbaMatch[3], 10);
    a = Number.parseFloat(rgbaMatch[4]);
  } else {
    const rgba = hexToRgba(fgColor);
    if (!rgba) return null;
    [rFg, gFg, bFg, a] = rgba;
  }

  if (
    !Number.isInteger(rFg) || rFg < 0 || rFg > 255 ||
    !Number.isInteger(gFg) || gFg < 0 || gFg > 255 ||
    !Number.isInteger(bFg) || bFg < 0 || bFg > 255 ||
    Number.isNaN(a) || a < 0 || a > 1
  ) {
    return null;
  }

  const bgRgba = hexToRgba(bgHex);
  if (!bgRgba) {
    return null;
  }

  const r = Math.round(rFg * a + bgRgba[0] * (1 - a));
  const g = Math.round(gFg * a + bgRgba[1] * (1 - a));
  const b = Math.round(bFg * a + bgRgba[2] * (1 - a));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

interface ColorPair {
  name: string;
  fg: string;
  bg: string;
  threshold: 'normal' | 'large';
}

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

const D = colorSemantic.dark;
const L = colorSemantic.light;

const pairs: ColorPair[] = [
  // ===== Dark Theme =====
  // Foreground on background-primary
  {
    name: 'dark:foreground-primary on background-primary',
    fg: D.foreground.primary,
    bg: D.background.primary,
    threshold: 'normal',
  },
  {
    name: 'dark:foreground-secondary on background-primary',
    fg: D.foreground.secondary,
    bg: D.background.primary,
    threshold: 'normal',
  },
  {
    name: 'dark:foreground-muted on background-primary',
    fg: D.foreground.muted,
    bg: D.background.primary,
    threshold: 'large',
  },
  // Accent on background-primary (for links, buttons)
  {
    name: 'dark:accent-primary on background-primary',
    fg: D.accent.primary,
    bg: D.background.primary,
    threshold: 'normal',
  },
  {
    name: 'dark:accent-hover on background-primary',
    fg: D.accent.hover,
    bg: D.background.primary,
    threshold: 'normal',
  },
  // Foreground on elevated surfaces
  {
    name: 'dark:foreground-primary on background-secondary',
    fg: D.foreground.primary,
    bg: D.background.secondary,
    threshold: 'normal',
  },
  {
    name: 'dark:foreground-primary on background-tertiary',
    fg: D.foreground.primary,
    bg: D.background.tertiary,
    threshold: 'normal',
  },
  {
    name: 'dark:foreground-primary on background-elevated',
    fg: D.foreground.primary,
    bg: D.background.elevated,
    threshold: 'normal',
  },
  // Status colors — fg on opaque bg (blended from transparent bg on the actual surface)
  {
    name: 'dark:status-success-fg on primary surface',
    fg: D.status.success.fg,
    bg: blendRgbaOnHex(D.status.success.bg, D.background.primary) ?? '',
    threshold: 'normal',
  },
  {
    name: 'dark:status-error-fg on primary surface',
    fg: D.status.error.fg,
    bg: blendRgbaOnHex(D.status.error.bg, D.background.primary) ?? '',
    threshold: 'normal',
  },
  {
    name: 'dark:status-warning-fg on primary surface',
    fg: D.status.warning.fg,
    bg: blendRgbaOnHex(D.status.warning.bg, D.background.primary) ?? '',
    threshold: 'normal',
  },
  {
    name: 'dark:status-info-fg on primary surface',
    fg: D.status.info.fg,
    bg: blendRgbaOnHex(D.status.info.bg, D.background.primary) ?? '',
    threshold: 'normal',
  },

  // ===== Light Theme =====
  // Foreground on background-primary
  {
    name: 'light:foreground-primary on background-primary',
    fg: L.foreground.primary,
    bg: L.background.primary,
    threshold: 'normal',
  },
  {
    name: 'light:foreground-secondary on background-primary',
    fg: L.foreground.secondary,
    bg: L.background.primary,
    threshold: 'normal',
  },
  {
    name: 'light:foreground-muted on background-primary',
    fg: L.foreground.muted,
    bg: L.background.primary,
    threshold: 'large',
  },
  // Accent on background-primary
  {
    name: 'light:accent-primary on background-primary',
    fg: L.accent.primary,
    bg: L.background.primary,
    threshold: 'normal',
  },
  {
    name: 'light:accent-hover on background-primary',
    fg: L.accent.hover,
    bg: L.background.primary,
    threshold: 'normal',
  },
  // Foreground on elevated surfaces
  {
    name: 'light:foreground-primary on background-secondary',
    fg: L.foreground.primary,
    bg: L.background.secondary,
    threshold: 'normal',
  },
  {
    name: 'light:foreground-primary on background-tertiary',
    fg: L.foreground.primary,
    bg: L.background.tertiary,
    threshold: 'normal',
  },
  {
    name: 'light:foreground-primary on background-elevated',
    fg: L.foreground.primary,
    bg: L.background.elevated,
    threshold: 'normal',
  },
  // Status colors (light mode bg are opaque)
  {
    name: 'light:status-success-fg on status-success-bg',
    fg: L.status.success.fg,
    bg: L.status.success.bg,
    threshold: 'normal',
  },
  {
    name: 'light:status-error-fg on status-error-bg',
    fg: L.status.error.fg,
    bg: L.status.error.bg,
    threshold: 'normal',
  },
  {
    name: 'light:status-warning-fg on status-warning-bg',
    fg: L.status.warning.fg,
    bg: L.status.warning.bg,
    threshold: 'normal',
  },
  {
    name: 'light:status-info-fg on status-info-bg',
    fg: L.status.info.fg,
    bg: L.status.info.bg,
    threshold: 'normal',
  },
];

let failures = 0;
let checked = 0;

for (const pair of pairs) {
  if (!pair.bg || !pair.fg) {
    console.error(`[FAIL] ${pair.name} — could not resolve color (fg=${pair.fg}, bg=${pair.bg})`);
    failures++;
    continue;
  }

  const ratio = contrastRatio(pair.fg, pair.bg);

  if (ratio === null) {
    console.error(`[FAIL] ${pair.name} — could not compute ratio (fg=${pair.fg}, bg=${pair.bg})`);
    failures++;
    continue;
  }

  const minRatio = pair.threshold === 'normal' ? AA_NORMAL : AA_LARGE;
  checked++;

  if (ratio >= minRatio) {
    console.log(`[PASS] ${pair.name} — ${ratio.toFixed(2)}:1`);
  } else {
    console.log(`[FAIL] ${pair.name} — ${ratio.toFixed(2)}:1 (need ${minRatio.toFixed(1)}:1)`);
    failures++;
  }
}

console.log(`\n${checked} checked, ${failures} failed`);
if (failures > 0) {
  process.exit(1);
}
