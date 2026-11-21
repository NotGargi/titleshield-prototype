import crypto from 'node:crypto';

/**
 * Cryptographic utility functions for Landeed 2.0 Authentication.
 * Uses Node.js native crypto module (scryptSync, randomBytes, timingSafeEqual).
 */

const KEY_LENGTH = 64; // 64 bytes (512 bits)
const SALT_BYTES = 16; // 16 bytes (128 bits)
const TOKEN_BYTES = 32; // 32 bytes (256 bits)

export interface PasswordHashResult {
  hash: string;
  salt: string;
}

/**
 * Generates a cryptographically secure random salt and hashes the password using scrypt.
 */
export function hashPassword(password: string, providedSalt?: string): PasswordHashResult {
  const salt = providedSalt || crypto.randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Constant-time comparison to verify a password against stored scrypt hash and salt.
 * Defends against timing attacks.
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) {
    return false;
  }

  try {
    const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (derivedKey.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, storedBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Generates a 256-bit (32 bytes = 64 hex characters) cryptographically random bearer token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

/**
 * Generates a random unique ID with prefix.
 */
export function generateId(prefix: string): string {
  const randomHex = crypto.randomBytes(12).toString('hex');
  return `${prefix}_${randomHex}`;
}
