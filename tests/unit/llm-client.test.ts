/**
 * Unit tests for LLM Client
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/db', () => ({
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeError: vi.fn(),
}));

vi.mock('../../src/services/github/auth', () => ({
  getToken: vi.fn(),
}));

vi.mock('../../src/services/gist-paste-parser', () => ({
  parsePasteText: vi.fn((text: string) => ({
    files: [{ filename: 'untitled.txt', content: text }],
  })),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { getMetadata, setMetadata } from '../../src/services/db';
import {
  createLLMClient,
  generateDescription,
  loadLLMConfig,
  saveLLMConfig,
  splitIntoFiles,
} from '../../src/services/llm/client';

// ── Tests ─────────────────────────────────────────────────────────────

describe('LLM Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadLLMConfig', () => {
    it('returns default config when no config stored', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const config = await loadLLMConfig();
      expect(config).toEqual({ provider: 'none', enabled: false });
    });

    it('returns stored config', async () => {
      const stored = { provider: 'openai', apiKey: 'sk-test', enabled: true };
      vi.mocked(getMetadata).mockResolvedValue(stored);

      const config = await loadLLMConfig();
      expect(config).toEqual(stored);
    });
  });

  describe('saveLLMConfig', () => {
    it('saves config to IndexedDB', async () => {
      vi.mocked(setMetadata).mockResolvedValue(undefined);

      await saveLLMConfig({ provider: 'openai', apiKey: 'sk-test', enabled: true });
      expect(setMetadata).toHaveBeenCalledWith('llm-config', {
        provider: 'openai',
        apiKey: 'sk-test',
        enabled: true,
      });
    });
  });

  describe('createLLMClient', () => {
    it('returns null when LLM is disabled', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ provider: 'none', enabled: false });

      const client = await createLLMClient();
      expect(client).toBeNull();
    });

    it('returns null when no config exists', async () => {
      vi.mocked(getMetadata).mockResolvedValue(undefined);

      const client = await createLLMClient();
      expect(client).toBeNull();
    });

    it('returns null when provider is openai but no API key', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'openai',
        enabled: true,
      });

      const client = await createLLMClient();
      expect(client).toBeNull();
    });
  });

  describe('generateDescription', () => {
    it('falls back to filename list when LLM is disabled', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ provider: 'none', enabled: false });

      const result = await generateDescription([
        { filename: 'index.js', content: 'const x = 1;' },
        { filename: 'style.css', content: '.a {}' },
      ]);

      expect(result).toBe('index.js, style.css');
    });
  });

  describe('splitIntoFiles', () => {
    it('falls back to heuristic parser when LLM is disabled', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ provider: 'none', enabled: false });

      const result = await splitIntoFiles('some text');
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('untitled.txt');
    });
  });
});
