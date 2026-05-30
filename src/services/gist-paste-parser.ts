/**
 * Paste Parser Service
 * Parses pasted plain text into separate files using deterministic heuristics.
 * Supports common multi-file paste formats:
 * - --- filename.ext --- delimiters
 * - ## filename.ext headers
 * - // filename.ext comments
 * - Triple-backtick code blocks with language hints
 */

import type { ParsedFile, ParsedPasteResult } from '../types/gist';

/**
 * Delimiter patterns for detecting file boundaries
 */
const DELIMITER_PATTERNS = [
  // --- filename.ext --- or --- filename.ext ---
  /^---+\s*(\S+\.\S+)\s*---+\s*$/gm,
  // ## filename.ext
  /^##\s+(\S+\.\S+)\s*$/gm,
  // // filename.ext (comment-style)
  /^\/\/\s+(\S+\.\S+)\s*$/gm,
];

/**
 * Triple-backtick code block pattern with optional language hint
 */
const CODE_BLOCK_PATTERN = /```(\w+)?\n([\s\S]*?)```/g;

/**
 * Map of language hints to file extensions
 */
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  ruby: 'rb',
  go: 'go',
  rust: 'rs',
  java: 'java',
  csharp: 'cs',
  cpp: 'cpp',
  c: 'c',
  html: 'html',
  css: 'css',
  json: 'json',
  yaml: 'yml',
  bash: 'sh',
  shell: 'sh',
  sql: 'sql',
  php: 'php',
  swift: 'swift',
  kotlin: 'kt',
  xml: 'xml',
  markdown: 'md',
  jsx: 'jsx',
  tsx: 'tsx',
};

/**
 * Get file extension from language hint
 */
function getExtensionFromLanguage(lang: string): string {
  const normalized = lang.toLowerCase();
  return LANGUAGE_EXTENSIONS[normalized] ?? normalized;
}

/**
 * Generate a filename from content and language hint
 */
function generateFilename(index: number, lang?: string): string {
  if (lang) {
    return `file${index + 1}.${getExtensionFromLanguage(lang)}`;
  }
  return `file${index + 1}.txt`;
}

/**
 * Extract content from code blocks
 */
function extractCodeBlocks(text: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const blocks = [...text.matchAll(CODE_BLOCK_PATTERN)];

  for (const [index, match] of blocks.entries()) {
    const lang = match[1];
    const content = match[2]?.trim() ?? '';
    if (content) {
      files.push({
        filename: generateFilename(index, lang),
        content,
      });
    }
  }

  return files;
}

/**
 * Split text by delimiter patterns and extract files
 */
function splitByDelimiters(text: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = text.split('\n');

  let currentFilename: string | null = null;
  let currentContent: string[] = [];

  const flushFile = (): void => {
    if (currentFilename && currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (content) {
        files.push({ filename: currentFilename, content });
      }
    }
    currentContent = [];
  };

  for (const line of lines) {
    let matched = false;

    for (const pattern of DELIMITER_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      const match = pattern.exec(line);
      if (match?.[1]) {
        flushFile();
        currentFilename = match[1];
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (currentFilename) {
        currentContent.push(line);
      }
    }
  }

  flushFile();
  return files;
}

/**
 * Attempt to detect a filename from the first line of content
 */
function detectFilenameFromContent(content: string): string | undefined {
  const firstLine = content.split('\n')[0]?.trim() ?? '';

  // Check if first line looks like a shebang
  if (firstLine.startsWith('#!/')) {
    const parts = firstLine.split('/');
    // Handle #!/usr/bin/env node format (check if last part starts with 'env')
    const lastPart = parts[parts.length - 1] ?? '';
    if (lastPart.startsWith('env ')) {
      const interpreter = lastPart.split(' ')[1];
      if (interpreter) {
        return `script.${interpreter}`;
      }
    }
    // Handle #!/bin/bash format
    const shell = lastPart.split(' ')[0];
    if (shell) {
      return `script.${shell}`;
    }
  }

  return undefined;
}

/**
 * Parse pasted text into separate files using deterministic heuristics.
 *
 * Detection order:
 * 1. Explicit delimiters (---, ##, //)
 * 2. Triple-backtick code blocks
 * 3. Fallback: entire paste as single file
 *
 * @param text - The pasted plain text
 * @returns ParsedPasteResult with detected files and optional description
 */
export function parsePasteText(text: string): ParsedPasteResult {
  if (!text.trim()) {
    return { files: [] };
  }

  // Strategy 1: Try delimiter-based splitting
  const delimiterFiles = splitByDelimiters(text);
  if (delimiterFiles.length > 0) {
    return {
      files: delimiterFiles,
      suggestedDescription: delimiterFiles.map((f) => f.filename).join(', '),
    };
  }

  // Strategy 2: Try code block extraction
  const codeBlockFiles = extractCodeBlocks(text);
  if (codeBlockFiles.length > 0) {
    // If there's also non-code text before/after, include it as a readme
    const strippedText = text.replace(CODE_BLOCK_PATTERN, '').trim();
    if (strippedText && codeBlockFiles.length > 0) {
      codeBlockFiles.unshift({
        filename: 'README.md',
        content: strippedText,
      });
    }
    return {
      files: codeBlockFiles,
      suggestedDescription: codeBlockFiles.map((f) => f.filename).join(', '),
    };
  }

  // Strategy 3: Fallback - entire paste as single file
  const detectedFilename = detectFilenameFromContent(text);
  return {
    files: [
      {
        filename: detectedFilename ?? 'untitled.txt',
        content: text.trim(),
      },
    ],
  };
}
