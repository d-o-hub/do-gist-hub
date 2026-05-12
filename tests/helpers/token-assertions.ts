/**
 * Token Assertion Helpers
 *
 * Shared utilities for testing CSS variable output from generateCSSVariables().
 * Reduces boilerplate in token test files and enforces consistent validation patterns.
 *
 * @example
 * ```typescript
 * import { expectToken, expectTokens, expectBalancedBraces } from '../helpers/token-assertions';
 *
 * const css = generateCSSVariables();
 * expectToken(css, '--color-black');
 * expectTokens(css, ['--color-gray-50', '--color-gray-100', '--color-gray-200']);
 * expectBalancedBraces(css);
 * ```
 */

import { expect } from 'vitest';

// ── Token presence assertions ─────────────────────────────────────────

/**
 * Asserts that a single CSS custom property name appears in the CSS output.
 * Checks for `--name:` pattern to validate the token is declared.
 */
export function expectToken(css: string, name: string): void {
  expect(
    css.includes(`${name}:`),
    `Expected CSS to contain token "${name}:"`,
  ).toBe(true);
}

/**
 * Asserts that multiple CSS custom properties appear in the CSS output.
 */
export function expectTokens(css: string, names: string[]): void {
  for (const name of names) {
    expectToken(css, name);
  }
}

// ── CSS Syntax validation ─────────────────────────────────────────────

/**
 * Asserts that the CSS has balanced curly braces (`{` and `}`).
 */
export function expectBalancedBraces(css: string): void {
  const opens = (css.match(/{/g) ?? []).length;
  const closes = (css.match(/}/g) ?? []).length;
  expect(opens).toBe(closes);
}

/**
 * Asserts that the CSS has balanced parentheses (`(` and `)`).
 */
export function expectBalancedParens(css: string): void {
  const opens = (css.match(/\(/g) ?? []).length;
  const closes = (css.match(/\)/g) ?? []).length;
  expect(opens).toBe(closes);
}

/**
 * Asserts that the CSS has at least `min` semicolon-terminated declarations.
 */
export function expectSemicolons(css: string, min = 200): void {
  const declarations = css.match(/--[\w-]+:\s*[^;]+;/g);
  expect(declarations?.length).toBeGreaterThanOrEqual(min);
}

/**
 * Asserts that the CSS has balanced square brackets (`[` and `]`).
 */
export function expectBalancedBrackets(css: string): void {
  const opens = (css.match(/\[/g) ?? []).length;
  const closes = (css.match(/\]/g) ?? []).length;
  expect(opens).toBe(closes);
}

// ── Section extraction ─────────────────────────────────────────────────

/**
 * Extracts the CSS content within a specific selector or at-rule.
 * Returns an empty string if the selector is not found.
 */
export function extractSection(css: string, selector: string): string {
  const regex = new RegExp(
    `${escapeRegex(selector)}\\s*\\{([\\s\\S]*?)\\}`,
  );
  const match = css.match(regex);
  return match?.[1] ?? '';
}

/**
 * Extracts the content inside a media query block.
 * Returns an empty string if the query is not found.
 */
export function extractMediaQuery(css: string, query: string): string {
  const escaped = escapeRegex(query);
  const regex = new RegExp(
    `@media\\s*\\(${escaped}\\)\\s*\\{[\\s\\S]*?\\}`,
  );
  const match = css.match(regex);
  return match?.[0] ?? '';
}

/**
 * Asserts that a given section (selector/at-rule block) contains the listed tokens.
 */
export function expectSectionTokens(
  css: string,
  selector: string,
  tokens: string[],
): void {
  const section = extractSection(css, selector);
  expect(section.length).toBeGreaterThan(0);
  for (const token of tokens) {
    expect(
      section.includes(`${token}:`),
      `Expected section "${selector}" to contain token "${token}:"`,
    ).toBe(true);
  }
}

// ── Media query assertions ─────────────────────────────────────────────

/**
 * Asserts that the CSS contains at least `min` media queries matching a pattern.
 */
export function expectMinMediaQueries(css: string, min: number): void {
  const matches = css.match(/@media\s*\([^)]+\)/g);
  expect(matches?.length).toBeGreaterThanOrEqual(min);
}

// ── Utility ────────────────────────────────────────────────────────────

/** Escapes special regex characters in a string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
