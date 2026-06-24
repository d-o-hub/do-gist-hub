import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    files: [{ filename: 'fallback.txt', content: text }],
  })),
}));

import { getMetadata } from '../../src/services/db';
import {
  createLLMClient,
  generateDescription,
  splitIntoFiles,
} from '../../src/services/llm/client';
import { safeError } from '../../src/services/security/logger';

describe('LLM Client additional coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLLMClient', () => {
    it('returns null when provider is openai but no apiKey', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'openai',
        enabled: true,
      });
      const client = await createLLMClient();
      expect(client).toBeNull();
    });

    it('creates openai client when valid config', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'openai',
        apiKey: 'sk-test',
        enabled: true,
        model: 'gpt-4',
      });
      vi.doMock('../../src/services/llm/providers/openai', () => ({
        createOpenAIClient: vi.fn(() => ({
          generateDescription: vi.fn(),
          splitIntoFiles: vi.fn(),
        })),
      }));

      const client = await createLLMClient();
      expect(client).not.toBeNull();
      vi.doUnmock('../../src/services/llm/providers/openai');
    });

    it('creates github-models client when valid config', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'github-models',
        apiKey: 'gh-token',
        enabled: true,
      });
      vi.doMock('../../src/services/llm/providers/github-models', () => ({
        createGitHubModelsClient: vi.fn(() => ({
          generateDescription: vi.fn(),
          splitIntoFiles: vi.fn(),
        })),
      }));

      const client = await createLLMClient();
      expect(client).not.toBeNull();
      vi.doUnmock('../../src/services/llm/providers/github-models');
    });

    it('returns null when provider import fails', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'openai',
        apiKey: 'sk-test',
        enabled: true,
      });
      vi.doMock('../../src/services/llm/providers/openai', () => {
        throw new Error('Import failed');
      });

      const client = await createLLMClient();
      expect(client).toBeNull();
      expect(safeError).toHaveBeenCalled();
      vi.doUnmock('../../src/services/llm/providers/openai');
    });

    it('returns null for unknown provider', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'unknown-provider',
        enabled: true,
      });
      const client = await createLLMClient();
      expect(client).toBeNull();
    });
  });

  describe('generateDescription', () => {
    it('falls back to filenames when LLM disabled', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ provider: 'none', enabled: false });
      const result = await generateDescription([
        { filename: 'a.ts', content: '' },
        { filename: 'b.ts', content: '' },
      ]);
      expect(result).toBe('a.ts, b.ts');
    });

    it('returns fallback when LLM throws', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'openai',
        apiKey: 'sk-test',
        enabled: true,
      });

      vi.doMock('../../src/services/llm/providers/openai', () => ({
        createOpenAIClient: vi.fn(() => ({
          generateDescription: vi.fn().mockRejectedValue(new Error('API error')),
          splitIntoFiles: vi.fn(),
        })),
      }));

      const result = await generateDescription([{ filename: 'x.js', content: '' }]);
      expect(result).toBe('x.js');
      expect(safeError).toHaveBeenCalled();
      vi.doUnmock('../../src/services/llm/providers/openai');
    });

    it('uses LLM when available', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'openai',
        apiKey: 'sk-test',
        enabled: true,
      });

      vi.doMock('../../src/services/llm/providers/openai', () => ({
        createOpenAIClient: vi.fn(() => ({
          generateDescription: vi.fn().mockResolvedValue('AI description'),
          splitIntoFiles: vi.fn(),
        })),
      }));

      const result = await generateDescription([{ filename: 'x.js', content: '' }]);
      expect(result).toBe('AI description');
      vi.doUnmock('../../src/services/llm/providers/openai');
    });
  });

  describe('splitIntoFiles', () => {
    it('falls back to parser when LLM disabled', async () => {
      vi.mocked(getMetadata).mockResolvedValue({ provider: 'none', enabled: false });
      const result = await splitIntoFiles('some text');
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.filename).toBe('fallback.txt');
    });

    it('returns fallback when LLM throws', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'openai',
        apiKey: 'sk-test',
        enabled: true,
      });

      vi.doMock('../../src/services/llm/providers/openai', () => ({
        createOpenAIClient: vi.fn(() => ({
          generateDescription: vi.fn(),
          splitIntoFiles: vi.fn().mockRejectedValue(new Error('fail')),
        })),
      }));

      const result = await splitIntoFiles('text');
      expect(result.files[0]?.filename).toBe('fallback.txt');
      expect(safeError).toHaveBeenCalled();
      vi.doUnmock('../../src/services/llm/providers/openai');
    });

    it('uses LLM when available', async () => {
      vi.mocked(getMetadata).mockResolvedValue({
        provider: 'github-models',
        apiKey: 'gh-token',
        enabled: true,
      });

      vi.doMock('../../src/services/llm/providers/github-models', () => ({
        createGitHubModelsClient: vi.fn(() => ({
          generateDescription: vi.fn(),
          splitIntoFiles: vi.fn().mockResolvedValue({
            files: [{ filename: 'ai.ts', content: 'ai content' }],
          }),
        })),
      }));

      const result = await splitIntoFiles('text');
      expect(result.files[0]?.filename).toBe('ai.ts');
      vi.doUnmock('../../src/services/llm/providers/github-models');
    });
  });
});
