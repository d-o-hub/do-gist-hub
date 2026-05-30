/**
 * Gist-related types for paste parsing and LLM integration
 */

/**
 * A single parsed file from pasted text
 */
export interface ParsedFile {
  filename: string;
  content: string;
}

/**
 * Result of parsing pasted text into separate files
 */
export interface ParsedPasteResult {
  files: ParsedFile[];
  suggestedDescription?: string;
}

/**
 * LLM provider type
 */
export type LLMProviderType = 'openai' | 'github-models' | 'none';

/**
 * LLM configuration stored in IndexedDB
 */
export interface LLMConfig {
  provider: LLMProviderType;
  apiKey?: string;
  model?: string;
  enabled: boolean;
}

/**
 * LLM request for chat completion
 */
export interface LLMRequest {
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * LLM response from chat completion
 */
export interface LLMResponse {
  content: string;
  finishReason: string;
}

/**
 * LLM client interface - provider-agnostic
 */
export interface LLMClient {
  generateDescription(files: ParsedFile[]): Promise<string>;
  suggestFilename(content: string): Promise<string>;
  splitIntoFiles(text: string): Promise<ParsedPasteResult>;
}
