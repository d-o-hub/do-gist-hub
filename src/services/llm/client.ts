/**
 * LLM Client
 * Provider-agnostic interface for LLM operations.
 * Supports OpenAI and GitHub Models providers.
 */

import type { LLMClient, LLMConfig, ParsedFile, ParsedPasteResult } from '../../types/gist';
import { getMetadata, setMetadata } from '../db';
import { parsePasteText } from '../gist-paste-parser';
import { decrypt, encrypt } from '../security/crypto';
import { safeError } from '../security/logger';

const LLM_CONFIG_KEY = 'llm-config';

/**
 * Default LLM configuration
 */
const DEFAULT_CONFIG: LLMConfig = {
  provider: 'none',
  enabled: false,
};

/**
 * Load LLM configuration from IndexedDB
 */
export async function loadLLMConfig(): Promise<LLMConfig> {
  try {
    const config = await getMetadata<LLMConfig>(LLM_CONFIG_KEY);
    if (!config) return DEFAULT_CONFIG;

    // Sentinel: Decrypt API key if it's stored in encrypted format
    if (config.apiKey && typeof config.apiKey === 'object' && 'data' in config.apiKey) {
      try {
        const encrypted = config.apiKey as { data: string; iv: string };
        config.apiKey = await decrypt(encrypted.data, encrypted.iv);
      } catch (err) {
        safeError('[LLM] Failed to decrypt API key', err);
        config.apiKey = undefined;
      }
    }

    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Save LLM configuration to IndexedDB
 */
export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  const configToSave = { ...config };

  // Sentinel: Encrypt API key before persisting to IndexedDB
  if (configToSave.apiKey && typeof configToSave.apiKey === 'string') {
    try {
      configToSave.apiKey = (await encrypt(configToSave.apiKey)) as unknown as string;
    } catch (err) {
      safeError('[LLM] Failed to encrypt API key', err);
    }
  }

  await setMetadata(LLM_CONFIG_KEY, configToSave);
}

/**
 * Create an LLM client based on configuration.
 * Returns null if LLM is disabled or no valid provider is configured.
 */
export async function createLLMClient(): Promise<LLMClient | null> {
  const config = await loadLLMConfig();

  if (!config.enabled || config.provider === 'none') {
    return null;
  }

  try {
    if (config.provider === 'openai' && config.apiKey) {
      const { createOpenAIClient } = await import('./providers/openai');
      return createOpenAIClient(config.apiKey, config.model);
    }

    if (config.provider === 'github-models') {
      const { createGitHubModelsClient } = await import('./providers/github-models');
      return createGitHubModelsClient(config.apiKey, config.model);
    }
  } catch (err) {
    safeError('[LLM] Failed to create client:', err);
    return null;
  }

  return null;
}

/**
 * Generate a description for a set of files using LLM.
 * Falls back to filename-based description if LLM fails.
 */
export async function generateDescription(files: ParsedFile[]): Promise<string> {
  const client = await createLLMClient();
  if (!client) {
    return files.map((f) => f.filename).join(', ');
  }

  try {
    return await client.generateDescription(files);
  } catch (err) {
    safeError('[LLM] Description generation failed, using fallback:', err);
    return files.map((f) => f.filename).join(', ');
  }
}

/**
 * Split text into files using LLM.
 * Falls back to heuristic parser if LLM fails.
 */
export async function splitIntoFiles(text: string): Promise<ParsedPasteResult> {
  const client = await createLLMClient();
  if (!client) {
    return parsePasteText(text);
  }

  try {
    return await client.splitIntoFiles(text);
  } catch (err) {
    safeError('[LLM] File splitting failed, using heuristic parser:', err);
    return parsePasteText(text);
  }
}
