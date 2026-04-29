/**
 * Web Cryptography Service (2026)
 * Secure encryption for sensitive data at rest.
 * Uses AES-GCM with a device-persistent master key.
 */

const ALGORITHM = 'AES-GCM';
const KEY_STORAGE_NAME = 'gist-hub-master-key';

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

/**
 * Persist/retrieve the master key using IndexedDB metadata
 */
export async function getOrCreateKey(): Promise<CryptoKey> {
  const { getMetadata, setMetadata } = await import('../db');

  const stored = await getMetadata<JsonWebKey>(KEY_STORAGE_NAME);
  if (stored) {
    return window.crypto.subtle.importKey('jwk', stored, { name: ALGORITHM }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  const key = await window.crypto.subtle.generateKey({ name: ALGORITHM, length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);

  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  await setMetadata(KEY_STORAGE_NAME, jwk);

  // Re-import as non-extractable for runtime use to prevent XSS exfiltration
  return window.crypto.subtle.importKey('jwk', jwk, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
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
