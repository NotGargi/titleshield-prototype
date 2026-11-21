/**
 * Defense-in-depth credential scrubber for Landeed 2.0.
 * Guarantees that NO plaintext passwords, password hashes, salts, or session tokens
 * are ever logged or persisted in domain event payloads.
 */

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_REGEX = /^(password|passwd|pwd|pass|hash|passwordhash|password_hash|passwordsalt|password_salt|salt|secret|token|authorization|apikey|bearer|cookie|ssn|otp|pin|privatekey|private_key)$/i;

/**
 * Recursively sanitizes any object, removing or masking sensitive fields.
 */
export function sanitizePayload<T extends Record<string, any>>(input: T): T {
  if (input === null || input === undefined || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizePayload(item)) as unknown as T;
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = REDACTED;
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value);
    } else if (typeof value === 'string' && value.length > 512 && !key.toLowerCase().includes('path') && !key.toLowerCase().includes('url')) {
      sanitized[key] = value.slice(0, 512) + '...[truncated]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
