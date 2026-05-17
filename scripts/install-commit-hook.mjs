#!/usr/bin/env node
/**
 * Postinstall hook: auto-installs the commit-msg hook for Conventional Commits.
 * Implements plan 038 item E2 (hook automation).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const hooksDir = path.join(rootDir, '.git', 'hooks');
const hookSource = path.join(rootDir, 'scripts', 'commit-msg-hook.sh');
const hookTarget = path.join(hooksDir, 'commit-msg');

// Skip if not a git repository
if (!fs.existsSync(hooksDir)) {
  process.exit(0);
}

// Check if hook already exists and is up to date
if (fs.existsSync(hookTarget)) {
  const existing = fs.readFileSync(hookTarget, 'utf8');
  const source = fs.readFileSync(hookSource, 'utf8');
  if (existing === source) {
    console.log('[install-commit-hook] commit-msg hook already installed and up to date');
    process.exit(0);
  }
}

// Install the hook
try {
  fs.copyFileSync(hookSource, hookTarget);
  fs.chmodSync(hookTarget, 0o755);
  console.log('[install-commit-hook] commit-msg hook installed');
} catch (err) {
  console.warn('[install-commit-hook] failed to install commit-msg hook:', err.message);
}
