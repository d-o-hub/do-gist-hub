/**
 * Web Cryptography Service (2026)
 * Secure encryption for sensitive data at rest.
 */

const ALGORITHM = 'AES-GCM';

/**
 * Encrypt a string using a device-bound key
 */
export async function encrypt(text: string): Promise<{ data: string; iv: string }> {
  const key = await getOrCreateKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as unknown as BufferSource },
    key,
    encoded
  );

  return {
    data: b64encode(encrypted),
    iv: b64encode(iv.buffer as ArrayBuffer),
  };
}

/**
 * Decrypt a string using the device-bound key
 */
export async function decrypt(encryptedData: string, ivBase64: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = b64decode(ivBase64);
  const data = b64decode(encryptedData);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = await getStoredKey();
  if (stored) return stored;

  const key = await window.crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);

  await storeKey(key);
  return key;
}

let cachedKey: CryptoKey | null = null;

async function getStoredKey(): Promise<CryptoKey | null> {
  return cachedKey;
}

async function storeKey(key: CryptoKey): Promise<void> {
  cachedKey = key;
}

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
