import { sqlite } from './index';
import { User } from './schema';
import { hashPassword, verifyPassword, generateId } from '../utils/crypto';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  metadata?: Record<string, any>;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CredentialValidationResult =
  | { success: true; user: User }
  | {
      success: false;
      user: User | null;
      failureReason: 'USER_NOT_FOUND' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'INACTIVE_ACCOUNT';
      lockedUntil?: string;
    };

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Maps raw SQLite database row to User object
 */
function mapUserRow(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    role: row.role,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    failedLoginAttempts: row.failed_login_attempts ?? 0,
    lockedUntil: row.locked_until || null,
    lastLoginAt: row.last_login_at || null,
    isActive: Boolean(row.is_active),
    metadata: row.metadata || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Strips sensitive password hashes and internal lockout fields for client consumption.
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Create a new user record in SQLite with cryptographically hashed password.
 */
export function createUser(input: CreateUserInput): User {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = findUserByEmail(normalizedEmail);
  if (existing) {
    const err = new Error(`User with email "${normalizedEmail}" already exists`);
    (err as any).status = 409;
    throw err;
  }

  const id = generateId('usr');
  const { hash, salt } = hashPassword(input.password);
  const now = new Date().toISOString();
  const role = input.role || 'CITIZEN';
  const metadataStr = input.metadata ? JSON.stringify(input.metadata) : null;

  const stmt = sqlite.prepare(`
    INSERT INTO users (
      id, name, email, phone, role, password_hash, password_salt,
      failed_login_attempts, locked_until, last_login_at, is_active,
      metadata, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      0, NULL, NULL, 1,
      ?, ?, ?
    )
  `);

  stmt.run(
    id,
    input.name.trim(),
    normalizedEmail,
    input.phone?.trim() || null,
    role,
    hash,
    salt,
    metadataStr,
    now,
    now
  );

  const created = findUserById(id);
  if (!created) {
    throw new Error('Failed to retrieve newly created user');
  }
  return created;
}

/**
 * Find user by email (case-insensitive).
 */
export function findUserByEmail(email: string): User | null {
  const stmt = sqlite.prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`);
  const row = stmt.get(email.trim());
  return row ? mapUserRow(row) : null;
}

/**
 * Find user by ID.
 */
export function findUserById(id: string): User | null {
  const stmt = sqlite.prepare(`SELECT * FROM users WHERE id = ?`);
  const row = stmt.get(id);
  return row ? mapUserRow(row) : null;
}

/**
 * Find user by identifier (email or phone or ID).
 */
export function findUserByIdentifier(identifier: string): User | null {
  const clean = identifier.trim();
  const stmt = sqlite.prepare(`
    SELECT * FROM users
    WHERE LOWER(email) = LOWER(?) OR phone = ? OR id = ?
  `);
  const row = stmt.get(clean, clean, clean);
  return row ? mapUserRow(row) : null;
}

/**
 * Validates user credentials with constant-time password verification,
 * lockout enforcement (after 5 failed attempts for 15 minutes),
 * and automatic counter reset upon successful verification.
 */
export function validateCredentials(identifier: string, password: string): CredentialValidationResult {
  const user = findUserByIdentifier(identifier);
  if (!user) {
    return { success: false, user: null, failureReason: 'USER_NOT_FOUND' };
  }

  if (!user.isActive) {
    return { success: false, user, failureReason: 'INACTIVE_ACCOUNT' };
  }

  // Check lockout
  const now = new Date();
  if (user.lockedUntil) {
    const lockedUntilDate = new Date(user.lockedUntil);
    if (lockedUntilDate > now) {
      return {
        success: false,
        user,
        failureReason: 'ACCOUNT_LOCKED',
        lockedUntil: user.lockedUntil,
      };
    } else {
      // Lock expired, unlock account
      resetFailedLogins(user.id);
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }
  }

  // Verify password using scrypt and timingSafeEqual
  const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    const updatedAttempts = user.failedLoginAttempts + 1;
    let lockedUntilStr: string | null = null;

    if (updatedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockDate = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      lockedUntilStr = lockDate.toISOString();
    }

    sqlite.prepare(`
      UPDATE users
      SET failed_login_attempts = ?, locked_until = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedAttempts, lockedUntilStr, now.toISOString(), user.id);

    return {
      success: false,
      user,
      failureReason: updatedAttempts >= MAX_FAILED_ATTEMPTS ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS',
      lockedUntil: lockedUntilStr || undefined,
    };
  }

  // Successful verification: reset failed attempts, update last login
  sqlite.prepare(`
    UPDATE users
    SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ?
    WHERE id = ?
  `).run(now.toISOString(), now.toISOString(), user.id);

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = now.toISOString();

  return { success: true, user };
}

/**
 * Resets failed login attempts and unlocks user.
 */
export function resetFailedLogins(userId: string): void {
  sqlite.prepare(`
    UPDATE users
    SET failed_login_attempts = 0, locked_until = NULL, updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), userId);
}

/**
 * Updates user password with new cryptographic hash and salt.
 */
export function updatePassword(userId: string, newPassword: string): void {
  const { hash, salt } = hashPassword(newPassword);
  const now = new Date().toISOString();

  const info = sqlite.prepare(`
    UPDATE users
    SET password_hash = ?, password_salt = ?, updated_at = ?
    WHERE id = ?
  `).run(hash, salt, now, userId);

  if (info.changes === 0) {
    throw new Error(`User with ID "${userId}" not found`);
  }
}

/**
 * Update general user profile fields.
 */
export function updateUser(
  userId: string,
  fields: Partial<{ name: string; phone: string; role: string; isActive: boolean; metadata: string }>
): User {
  const updates: string[] = [];
  const params: any[] = [];

  if (fields.name !== undefined) {
    updates.push('name = ?');
    params.push(fields.name.trim());
  }
  if (fields.phone !== undefined) {
    updates.push('phone = ?');
    params.push(fields.phone ? fields.phone.trim() : null);
  }
  if (fields.role !== undefined) {
    updates.push('role = ?');
    params.push(fields.role);
  }
  if (fields.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(fields.isActive ? 1 : 0);
  }
  if (fields.metadata !== undefined) {
    updates.push('metadata = ?');
    params.push(fields.metadata);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(userId);

  sqlite.prepare(`
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = ?
  `).run(...params);

  const updated = findUserById(userId);
  if (!updated) {
    throw new Error(`User with ID "${userId}" not found`);
  }
  return updated;
}
