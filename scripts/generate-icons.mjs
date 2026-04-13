/**
 * Generate PNG icons for d.o. Gist Hub app
 *
 * 2026 Update: Uses modern design tokens
 * - Desaturated blue: #60a5fa (blue.400) for dark mode comfort
 * - Tonal elevation: #09090b → #1a1a1f gradient
 * - JetBrains Mono style for code symbol
 * - Improved visual hierarchy with subtle ring
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

// 2026 Design Token Colors (updated)
const COLORS = {
  // Background - tonal elevation for dark mode
  bgDark: '#09090b',           // zinc.950 - base surface
  bgDarkElevated: '#1a1a1f',   // elevated surface
  
  // 2026: Desaturated blue for dark mode comfort
  themeBlue: '#60a5fa',        // blue.400 (was #2563eb blue.600)
  themeBlueLight: '#93c5fd',   // blue.300 (for ring/glow)
  
  // Foreground - optical corrections for dark mode
  fgLight: '#fafafa',          // zinc.50 - primary text
  fgSecondary: '#d4d4d8',      // zinc.300 - secondary elements
  fgMuted: '#a1a1aa',          // zinc.400 - muted text
  
  white: '#ffffff',
};

/**
 * Generate an icon canvas with 2026 modern design
 * @param {number} size - Icon size in pixels
 * @returns {import('canvas').Canvas} Canvas instance
 */
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const center = size / 2;
  const scale = size / 512;

  // 1. Background gradient (tonal elevation)
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, COLORS.bgDark);
  gradient.addColorStop(1, COLORS.bgDarkElevated);
  ctx.fillStyle = gradient;
  
  // Rounded corners
  const cornerRadius = 18 * scale;
  roundRect(ctx, 0, 0, size, size, cornerRadius);
  ctx.fill();

  // 2. Desaturated blue circle (2026: blue.400 instead of blue.600)
  const circleRadius = size * 0.36;
  
  // Outer glow
  const glowGradient = ctx.createRadialGradient(center, center, circleRadius * 0.8, center, center, circleRadius + 12 * scale);
  glowGradient.addColorStop(0, COLORS.themeBlue + '25');
  glowGradient.addColorStop(1, COLORS.themeBlue + '00');
  ctx.beginPath();
  ctx.arc(center, center, circleRadius + 12 * scale, 0, Math.PI * 2);
  ctx.fillStyle = glowGradient;
  ctx.fill();
  
  // Main circle
  ctx.beginPath();
  ctx.arc(center, center, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.themeBlue;
  ctx.fill();
  
  // Subtle ring
  ctx.beginPath();
  ctx.arc(center, center, circleRadius, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.themeBlueLight + '40';
  ctx.lineWidth = 0.5 * scale;
  ctx.stroke();

  // 3. {} symbol (JetBrains Mono style, 2026: bolder weight)
  ctx.fillStyle = COLORS.fgLight;
  ctx.font = `600 ${Math.floor(125 * scale)}px 'JetBrains Mono', 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '0.5px';
  ctx.fillText('{}', center, center - 8 * scale);

  // 4. Three dots representing Gist items (2026: slightly larger, secondary color)
  const dotY = center + 72 * scale;
  const dotRadius = 9 * scale;
  const dotSpacing = 32 * scale;

  ctx.fillStyle = COLORS.fgSecondary;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.arc(center + i * dotSpacing, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

/**
 * Draw a rounded rectangle path
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generate all required icon sizes
 */
function main() {
  const icons = [
    { path: 'public/apple-touch-icon.png', size: 180 },
    { path: 'public/pwa-192x192.png', size: 192 },
    { path: 'public/pwa-512x512.png', size: 512 },
  ];

  console.log('Generating icons with 2026 design tokens...\n');
  console.log('Design tokens:');
  console.log('  Background: #09090b → #1a1a1f (tonal elevation)');
  console.log('  Accent: #60a5fa (blue.400, desaturated for dark mode)');
  console.log('  Foreground: #fafafa (zinc.50)');
  console.log('  Secondary: #d4d4d8 (zinc.300)');
  console.log('');

  for (const { path, size } of icons) {
    console.log(`Generating ${path} (${size}x${size})...`);
    const canvas = generateIcon(size);
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(path, buffer);
    console.log(`  ✓ Created ${path}\n`);
  }

  console.log('All icons generated successfully with 2026 design tokens!');
}

main();
