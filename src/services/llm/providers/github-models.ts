/**
 * GitHub Models LLM Provider
 * Integration with GitHub Models via Azure AI endpoint.
 * Uses existing PAT for authentication - zero additional config required.
 */

import type {
  LLMClient,
  LLMRequest,
  LLMResponse,
  ParsedFile,
  ParsedPasteResult,
} from '../../../types/gist';
import { safeError } from '../../security/logger';

const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Get stored PAT for authentication
 */
async function getToken(): Promise<string | null> {
  const { getToken } = await import('../../github/auth');
  return getToken();
}

/**
 * Call GitHub Models chat completion API
 */
async function callGitHubModels(
  request: LLMRequest,
  apiKey?: string,
  model = DEFAULT_MODEL
): Promise<LLMResponse> {
  const token = apiKey || (await getToken());
  if (!token) {
    throw new Error('No authentication token available for GitHub Models');
  }

  const response = await fetch(GITHUB_MODELS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string }; finish_reason: string }>;
  };

  const choice = data.choices[0];
  if (!choice) {
    throw new Error('No response from GitHub Models');
  }

  return {
    content: choice.message.content,
    finishReason: choice.finish_reason,
  };
}

/**
 * Create a GitHub Models LLM client
 */
export function createGitHubModelsClient(apiKey?: string, model?: string): LLMClient {
  const effectiveModel = model || DEFAULT_MODEL;

  return {
    async generateDescription(files: ParsedFile[]): Promise<string> {
      const fileList = files.map((f) => `- ${f.filename} (${f.content.length} chars)`).join('\n');
      const contentPreview = files
        .slice(0, 3)
        .map((f) => `--- ${f.filename} ---\n${f.content.slice(0, 200)}`)
        .join('\n\n');

      const request: LLMRequest = {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that generates concise, descriptive titles for code gists. Return only the description, no quotes or extra text.',
          },
          {
            role: 'user',
            content: `Generate a short, descriptive title for a GitHub Gist containing these files:\n\n${fileList}\n\nContent preview:\n${contentPreview}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 100,
      };

      const response = await callGitHubModels(request, apiKey, effectiveModel);
      return response.content.trim();
    },

    async suggestFilename(content: string): Promise<string> {
      const request: LLMRequest = {
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that suggests appropriate filenames for code files. Return only the filename, no quotes or extra text.',
          },
          {
            role: 'user',
            content: `Suggest a filename for this code:\n\n${content.slice(0, 500)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 50,
      };

      const response = await callGitHubModels(request, apiKey, effectiveModel);
      return response.content.trim().replace(/^["']|["']$/g, '');
    },

    async splitIntoFiles(text: string): Promise<ParsedPasteResult> {
      const request: LLMRequest = {
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that splits pasted text into separate files. 
Return a JSON array of objects with "filename" and "content" properties.
If the text contains a single file, return an array with one item.
Detect the appropriate filename from file extensions, shebangs, or content.
Use "untitled.txt" if no filename can be determined.`,
          },
          {
            role: 'user',
            content: `Split this pasted text into separate files:\n\n${text.slice(0, 4000)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      };

      const response = await callGitHubModels(request, apiKey, effectiveModel);

      try {
        // Parse JSON response, handling potential markdown code blocks
        const jsonStr = response.content
          .replace(/^```json\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        const files = JSON.parse(jsonStr) as ParsedFile[];

        if (!Array.isArray(files) || files.length === 0) {
          throw new Error('Invalid response format');
        }

        return { files };
      } catch (err) {
        safeError('[LLM/GitHubModels] Failed to parse split response:', err);
        throw err;
      }
    },
  };
}
