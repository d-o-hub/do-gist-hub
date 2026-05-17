#!/usr/bin/env node
/**
 * Postinstall hook: auto-installs the git hooks (commit-msg and pre-commit).
 * Implements plan 038 item E2 (hook automation).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const hooksDir = path.join(rootDir, '.git', 'hooks');

const hooks = [
  {
    name: 'commit-msg',
    source: path.join(rootDir, 'scripts', 'commit-msg-hook.sh'),
    target: path.join(hooksDir, 'commit-msg'),
  },
  {
    name: 'pre-commit',
    source: path.join(rootDir, 'scripts', 'pre-commit-hook.sh'),
    target: path.join(hooksDir, 'pre-commit'),
  },
];

// Skip if not a git repository
if (!fs.existsSync(hooksDir)) {
  console.log('[install-git-hooks] .git/hooks directory not found, skipping hook installation');
  process.exit(0);
}

for (const hook of hooks) {
  // Check if source file exists before attempting to read it
  if (!fs.existsSync(hook.source)) {
    console.warn(`[install-git-hooks] source file not found for ${hook.name} hook: ${hook.source}`);
    continue;
  }

  // Check if hook already exists and is up to date
  if (fs.existsSync(hook.target)) {
    const existing = fs.readFileSync(hook.target, 'utf8');
    const source = fs.readFileSync(hook.source, 'utf8');
    if (existing === source) {
      console.log(`[install-git-hooks] ${hook.name} hook already installed and up to date`);
      continue;
    }
  }

  // Install the hook
  try {
    fs.copyFileSync(hook.source, hook.target);
    fs.chmodSync(hook.target, 0o755);
    console.log(`[install-git-hooks] ${hook.name} hook installed`);
  } catch (err) {
    console.warn(`[install-git-hooks] failed to install ${hook.name} hook:`, err.message);
  }
}
