import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const PERFORMANCE_BUDGETS = {
  initialJS: 150 * 1024,
  routeChunk: 50 * 1024,
};

const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('❌ dist/assets directory not found.');
  process.exit(1);
}

console.log('📊 Checking bundle budgets from filesystem...');
let failed = false;

const files = fs.readdirSync(assetsDir);

for (const file of files) {
  if (!file.endsWith('.js')) continue;

  const fullPath = path.join(assetsDir, file);
  const content = fs.readFileSync(fullPath);
  const gzipped = zlib.gzipSync(content);
  const gzipSize = gzipped.length;
  const sizeKB = (gzipSize / 1024).toFixed(2);

  let budget = PERFORMANCE_BUDGETS.routeChunk;
  let type = 'Route Chunk';

  // index/main bundle usually has a larger budget
  // It's the one that DOESN'T look like a route chunk (home, settings, create, etc)
  // Actually, let's look for 'index' or the largest one.
  if (file.startsWith('index-') || file.startsWith('main-')) {
    budget = PERFORMANCE_BUDGETS.initialJS;
    type = 'Initial JS';
  }

  const budgetKB = (budget / 1024).toFixed(0);

  if (gzipSize > budget) {
    console.error(`❌ ${type} "${file}" exceeds budget: ${sizeKB}KB > ${budgetKB}KB`);
    failed = true;
  } else {
    console.log(`✅ ${type} "${file}": ${sizeKB}KB (Budget: ${budgetKB}KB)`);
  }
}

if (failed) {
  console.error('\n❌ Bundle budget check failed!');
  process.exit(1);
} else {
  console.log('\n✅ All bundles are within budget.');
}
