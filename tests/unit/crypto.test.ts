import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  encrypt,
  decrypt,
  getOrCreateKey,
  b64encode,
  b64decode,
} from '../../src/services/security/crypto';

// In-memory metadata store for mocking IndexedDB
const metadataStore = new Map<string, unknown>();

vi.mock('../../src/services/db', () => ({
  getMetadata: vi.fn(async <T>(key: string): Promise<T | undefined> => {
    return metadataStore.get(key) as T | undefined;
  }),
  setMetadata: vi.fn(async (key: string, value: unknown): Promise<void> => {
    metadataStore.set(key, value);
  }),
}));

describe('crypto', () => {
  beforeAll(() => {
    // Polyfill Web Crypto API in jsdom
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    metadataStore.clear();
    vi.clearAllMocks();
  });

  describe('encrypt / decrypt', () => {
    it('should round-trip a simple string', async () => {
      const original = 'hello world';
      const { data, iv } = await encrypt(original);
      const decrypted = await decrypt(data, iv);
      expect(decrypted).toBe(original);
    });

    it('should round-trip an empty string', async () => {
      const original = '';
      const { data, iv } = await encrypt(original);
      const decrypted = await decrypt(data, iv);
      expect(decrypted).toBe(original);
    });

    it('should round-trip unicode characters', async () => {
      const original = 'Hello 🌍 世界 Привет ¡Hola! 你好';
      const { data, iv } = await encrypt(original);
      const decrypted = await decrypt(data, iv);
      expect(decrypted).toBe(original);
    });

    it('should round-trip a large string', async () => {
      const original = 'x'.repeat(100_000);
      const { data, iv } = await encrypt(original);
      const decrypted = await decrypt(data, iv);
      expect(decrypted).toBe(original);
    });
  });

  describe('getOrCreateKey', () => {
    it('should create a valid CryptoKey', async () => {
      const key = await getOrCreateKey();
      expect(key).toBeDefined();
      expect(key.type).toBe('secret');
      expect(key.algorithm.name).toBe('AES-GCM');
    });

    it('should persist the key across calls', async () => {
      const { setMetadata } = await import('../../src/services/db');

      await getOrCreateKey();
      expect(setMetadata).toHaveBeenCalledTimes(1);

      await getOrCreateKey();
      expect(setMetadata).toHaveBeenCalledTimes(1);
    });

    it('should use the same key for encryption and decryption across calls', async () => {
      const { data, iv } = await encrypt('secret message');
      const decrypted = await decrypt(data, iv);
      expect(decrypted).toBe('secret message');
    });
  });

  describe('b64encode / b64decode', () => {
    it('should round-trip a buffer', () => {
      const original = new Uint8Array([0, 1, 2, 255, 128, 64]);
      const encoded = b64encode(original.buffer);
      const decoded = b64decode(encoded);
      expect(decoded).toEqual(original);
    });

    it('should round-trip an empty buffer', () => {
      const original = new Uint8Array(0);
      const encoded = b64encode(original.buffer);
      const decoded = b64decode(encoded);
      expect(decoded).toEqual(original);
    });
  });

  describe('error handling', () => {
    it('should throw when decrypting corrupted data', async () => {
      const { iv } = await encrypt('test');
      const corruptedData = b64encode(new Uint8Array([1, 2, 3]).buffer);

      await expect(decrypt(corruptedData, iv)).rejects.toThrow();
    });

    it('should throw when decrypting with wrong iv', async () => {
      const { data } = await encrypt('test');
      const wrongIv = b64encode(new Uint8Array(12).buffer);

      await expect(decrypt(data, wrongIv)).rejects.toThrow();
    });
  });
});
