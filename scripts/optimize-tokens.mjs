import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Scanning for used design tokens...');

const files = globSync('src/**/*.{ts,css,html}', {
  ignore: ['src/tokens/**', 'src/styles/tokens-generated.css'],
  cwd: rootDir
});

const tokenRegex = /var\(--([a-zA-Z0-9-]+)\)/g;
const usedTokens = new Set();

for (const file of files) {
  const content = readFileSync(join(rootDir, file), 'utf-8');
  let match;
  while ((match = tokenRegex.exec(content)) !== null) {
    usedTokens.add(match[1]);
  }
}

// Add some commonly used tokens that might be dynamic or missed
const alwaysInclude = [
  'color-background-primary',
  'color-foreground-primary',
  'color-accent-primary',
  'color-border-default',
  'spacing-4',
  'font-size-base',
  'radius-md',
  'motion-duration-normal',
  'spacing-container' // Explicitly include this as it's used in media queries
];
alwaysInclude.forEach(t => usedTokens.add(t));

console.log(`✅ Found ${usedTokens.size} unique tokens in use.`);

const outputDir = join(rootDir, 'src/styles');
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

function generateMinimalCSS(usedSet) {
  const fullCSS = readFileSync(join(rootDir, 'public/design-tokens.css'), 'utf-8');
  const lines = fullCSS.split('\n');
  const filteredLines = [];
  let inRoot = false;
  let inTheme = false;
  let mediaHeader = null;
  let mediaBlockContent = [];
  let currentBraceLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('@media')) {
        mediaHeader = line;
        mediaBlockContent = [];
        currentBraceLevel = 0;
        if (trimmed.includes('{')) {
            const openCount = (trimmed.match(/{/g) || []).length;
            const closeCount = (trimmed.match(/}/g) || []).length;
            currentBraceLevel += (openCount - closeCount);
        }

        // If it's a single line @media like: @media (...) { :root { --v: v; } }
        if (currentBraceLevel === 0 && trimmed.includes('{') && trimmed.includes('}')) {
             const match = trimmed.match(/--([a-zA-Z0-9-]+):/);
             if (match && usedSet.has(match[1])) {
                 filteredLines.push(line);
             }
             mediaHeader = null;
        }
        continue;
    }

    if (mediaHeader !== null) {
        if (trimmed.includes('{')) currentBraceLevel += (trimmed.match(/{/g) || []).length;
        if (trimmed.includes('}')) currentBraceLevel -= (trimmed.match(/}/g) || []).length;

        if (currentBraceLevel === 0) {
            // End of media block
            if (mediaBlockContent.some(l => l.includes('--'))) {
                filteredLines.push(mediaHeader);
                filteredLines.push(...mediaBlockContent);
                filteredLines.push('}');
            }
            mediaHeader = null;
        } else {
            // Inside media block, filter tokens
            const match = trimmed.match(/--([a-zA-Z0-9-]+):/);
            if (match) {
                if (usedSet.has(match[1])) {
                    mediaBlockContent.push(line);
                }
            } else {
                mediaBlockContent.push(line);
            }
        }
        continue;
    }

    if (trimmed.startsWith(':root {')) {
        inRoot = true;
        filteredLines.push(line);
        continue;
    }
    if (trimmed.startsWith('[data-theme="dark"] {')) {
        inTheme = true;
        filteredLines.push(line);
        continue;
    }

    if (trimmed === '}') {
        if (inRoot || inTheme) {
            filteredLines.push(line);
            inRoot = false;
            inTheme = false;
        }
        continue;
    }

    if (inRoot || inTheme) {
        const match = trimmed.match(/--([a-zA-Z0-9-]+):/);
        if (match && usedSet.has(match[1])) {
            filteredLines.push(line);
        }
    } else {
        if (trimmed) filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

// I'll run the existing init script first to ensure we have a base.
import('./init-design-tokens.js').then(() => {
  const minimalCSS = generateMinimalCSS(usedTokens);
  writeFileSync(join(outputDir, 'tokens-generated.css'), minimalCSS);
  console.log('✅ Generated src/styles/tokens-generated.css');
}).catch(err => {
  console.error('Failed to generate tokens:', err);
  process.exit(1);
});
