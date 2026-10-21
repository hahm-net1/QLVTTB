/**
 * Private Vault Utility: Client-side AES-GCM 256-bit encryption for Private Notes
 * - Uses Native Web Crypto API (SubtleCrypto) with PBKDF2 (SHA-256, 100,000 iterations)
 * - Zero hardcoded PINs or secrets in source code
 * - Zero external npm dependencies
 */

const VERIFIER_KEY = 'vnpt_sec_vault_verifier_v1';
const SESSION_PIN_KEY = 'vnpt_sec_session_pin_v1';
const VERIFIER_MAGIC = 'VAULT_PIN_VALID_TOKEN_OK';

const SALT_BYTES = 16;
const IV_BYTES = 12;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive AES-GCM 256-bit Key from user PIN using PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plain-text note with user's PIN
 * Output format: ENC1:<salt_b64>:<iv_b64>:<ciphertext_b64>
 */
export async function encryptWithPin(plainText: string, pin: string): Promise<string> {
  if (!plainText || !plainText.trim() || !pin) return '';
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(pin, salt);

  const encoder = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plainText)
  );

  return `ENC1:${bufferToBase64(salt)}:${bufferToBase64(iv)}:${bufferToBase64(cipherBuffer)}`;
}

/**
 * Decrypt an encrypted note using user's PIN
 * Returns null if PIN is wrong or decryption fails
 */
export async function decryptWithPin(cipherString: string, pin: string): Promise<string | null> {
  if (!cipherString) return '';
  if (!cipherString.startsWith('ENC1:')) {
    // If not encrypted, return as is
    return cipherString;
  }
  if (!pin) return null;

  try {
    const parts = cipherString.split(':');
    if (parts.length !== 4) return null;

    const salt = base64ToBuffer(parts[1]);
    const iv = base64ToBuffer(parts[2]);
    const cipherData = base64ToBuffer(parts[3]);

    const key = await deriveKey(pin, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipherData as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (err) {
    // Authentication failed (wrong PIN) or corrupted
    return null;
  }
}

/**
 * Check if the vault has been initialized with a PIN verifier
 */
export function hasVaultVerifier(): boolean {
  try {
    return Boolean(localStorage.getItem(VERIFIER_KEY));
  } catch {
    return false;
  }
}

/**
 * Get stored verifier token if exists
 */
export function getStoredVerifier(): string | null {
  try {
    return localStorage.getItem(VERIFIER_KEY);
  } catch {
    return null;
  }
}

/**
 * Save new PIN verifier token (called on first setup or PIN change)
 */
export async function setVaultPin(newPin: string): Promise<void> {
  const verifierToken = await encryptWithPin(VERIFIER_MAGIC, newPin);
  try {
    localStorage.setItem(VERIFIER_KEY, verifierToken);
  } catch (e) {
    console.error('Failed to store verifier token:', e);
  }
}

/**
 * Validate a PIN against the stored verifier
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const verifier = getStoredVerifier();
  if (!verifier) {
    // If no verifier yet, first time validation will activate it
    return false;
  }
  const result = await decryptWithPin(verifier, pin);
  return result === VERIFIER_MAGIC;
}

/**
 * Session storage helpers to maintain unlock state across page navigations in current browser session
 */
export function getSavedSessionPin(): string | null {
  try {
    return sessionStorage.getItem(SESSION_PIN_KEY);
  } catch {
    return null;
  }
}

export function saveSessionPin(pin: string): void {
  try {
    sessionStorage.setItem(SESSION_PIN_KEY, pin);
  } catch {}
}

export function clearSessionPin(): void {
  try {
    sessionStorage.removeItem(SESSION_PIN_KEY);
  } catch {}
}
