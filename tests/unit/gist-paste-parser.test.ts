/**
 * Unit tests for Paste Parser Service
 */
import { describe, expect, it } from 'vitest';
import { parsePasteText } from '../../src/services/gist-paste-parser';

describe('parsePasteText', () => {
  describe('empty input', () => {
    it('returns empty files for empty string', () => {
      expect(parsePasteText('')).toEqual({ files: [] });
    });

    it('returns empty files for whitespace-only input', () => {
      expect(parsePasteText('   \n  \n  ')).toEqual({ files: [] });
    });
  });

  describe('single file (no delimiters)', () => {
    it('returns entire paste as single file with untitled.txt', () => {
      const result = parsePasteText('Hello world');
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('untitled.txt');
      expect(result.files[0]?.content).toBe('Hello world');
    });

    it('detects shebang to generate filename', () => {
      const result = parsePasteText('#!/bin/bash\necho hello');
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('script.bash');
      expect(result.files[0]?.content).toBe('#!/bin/bash\necho hello');
    });

    it('detects node shebang', () => {
      const result = parsePasteText('#!/usr/bin/env node\nconsole.log("hi")');
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('script.node');
    });
  });

  describe('delimiter-based splitting', () => {
    it('splits on --- filename.ext --- delimiters', () => {
      const text = `--- index.js ---
const x = 1;
--- style.css ---
body { color: red; }`;

      const result = parsePasteText(text);
      expect(result.files).toHaveLength(2);
      expect(result.files[0]?.filename).toBe('index.js');
      expect(result.files[0]?.content).toContain('const x = 1;');
      expect(result.files[1]?.filename).toBe('style.css');
      expect(result.files[1]?.content).toContain('color: red;');
    });

    it('splits on ## filename.ext headers', () => {
      const text = `## README.md
# My Project
## config.json
{"key": "value"}`;

      const result = parsePasteText(text);
      expect(result.files).toHaveLength(2);
      expect(result.files[0]?.filename).toBe('README.md');
      expect(result.files[1]?.filename).toBe('config.json');
    });

    it('splits on // filename.ext comment delimiters', () => {
      const text = `// app.js
console.log("app");
// styles.css
.btn { display: flex; }`;

      const result = parsePasteText(text);
      expect(result.files).toHaveLength(2);
      expect(result.files[0]?.filename).toBe('app.js');
      expect(result.files[1]?.filename).toBe('styles.css');
    });

    it('generates suggestedDescription from filenames', () => {
      const text = `--- a.js ---
const a = 1;
--- b.css ---
.a {}`;

      const result = parsePasteText(text);
      expect(result.suggestedDescription).toBe('a.js, b.css');
    });

    it('handles content after last delimiter', () => {
      const text = `--- file.js ---
const x = 1;
const y = 2;`;

      const result = parsePasteText(text);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('file.js');
      expect(result.files[0]?.content).toContain('const x = 1;');
      expect(result.files[0]?.content).toContain('const y = 2;');
    });
  });

  describe('code block extraction', () => {
    it('extracts triple-backtick code blocks', () => {
      const text = '```javascript\nconst x = 1;\n```';
      const result = parsePasteText(text);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('file1.js');
      expect(result.files[0]?.content).toBe('const x = 1;');
    });

    it('extracts multiple code blocks', () => {
      const text = `\`\`\`python
print("hello")
\`\`\`

\`\`\`css
body { margin: 0; }
\`\`\``;

      const result = parsePasteText(text);
      expect(result.files).toHaveLength(2);
      expect(result.files[0]?.filename).toBe('file1.py');
      expect(result.files[1]?.filename).toBe('file2.css');
    });

    it('adds README.md when non-code text surrounds blocks', () => {
      const text = `Here is my code:

\`\`\`js
const x = 1;
\`\`\`

That's it!`;

      const result = parsePasteText(text);
      expect(result.files.length).toBeGreaterThanOrEqual(2);
      expect(result.files[0]?.filename).toBe('README.md');
      expect(result.files.some((f) => f.filename === 'file1.js')).toBe(true);
    });

    it('handles code blocks without language hint', () => {
      const text = '```\nconst x = 1;\n```';
      const result = parsePasteText(text);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('file1.txt');
    });
  });

  describe('priority: delimiters over code blocks', () => {
    it('uses delimiter parsing when delimiters are present', () => {
      const text = `--- main.js ---
\`\`\`js
const x = 1;
\`\`\`
--- style.css ---
body {}`;

      const result = parsePasteText(text);
      expect(result.files).toHaveLength(2);
      expect(result.files[0]?.filename).toBe('main.js');
      expect(result.files[1]?.filename).toBe('style.css');
    });
  });
});
