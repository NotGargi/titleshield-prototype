import { sqlite } from './index';
import { Session } from './schema';
import { generateSessionToken, generateId } from '../utils/crypto';
import { findUserById, toSafeUser, SafeUser } from './usersRepository';

export interface CreateSessionInput {
  userId: string;
  role: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  ttlHours?: number; // default: 24 hours
}

export interface SessionWithUser {
  session: Session;
  user: SafeUser;
}

const DEFAULT_TTL_HOURS = 24;

/**
 * Maps raw SQLite database row to Session object
 */
function mapSessionRow(row: any): Session {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    role: row.role,
    deviceInfo: row.device_info || null,
    ipAddress: row.ip_address || null,
    userAgent: row.user_agent || null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    lastAccessedAt: row.last_accessed_at,
  };
}

/**
 * Creates and persists a new authenticated session token in SQLite.
 */
export function createSession(input: CreateSessionInput): Session {
  const id = generateId('sess');
  const token = generateSessionToken();
  const now = new Date();
  const ttlHours = input.ttlHours || DEFAULT_TTL_HOURS;
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();

  const stmt = sqlite.prepare(`
    INSERT INTO sessions (
      id, user_id, token, role, device_info, ip_address, user_agent,
      expires_at, created_at, last_accessed_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `);

  stmt.run(
    id,
    input.userId,
    token,
    input.role,
    input.deviceInfo || null,
    input.ipAddress || null,
    input.userAgent || null,
    expiresAt,
    nowIso,
    nowIso
  );

  const created = findSessionById(id);
  if (!created) {
    throw new Error('Failed to retrieve newly created session');
  }
  return created;
}

/**
 * Finds session by ID.
 */
export function findSessionById(id: string): Session | null {
  const stmt = sqlite.prepare(`SELECT * FROM sessions WHERE id = ?`);
  const row = stmt.get(id);
  return row ? mapSessionRow(row) : null;
}

/**
 * Look up active session by Bearer token.
 * Performs expiry check. If expired, automatically deletes the session and returns null.
 * If valid, updates last_accessed_at.
 */
export function validateSessionToken(token: string): SessionWithUser | null {
  if (!token || typeof token !== 'string') return null;

  const cleanToken = token.trim();
  const stmt = sqlite.prepare(`SELECT * FROM sessions WHERE token = ?`);
  const row = stmt.get(cleanToken);
  if (!row) return null;

  const session = mapSessionRow(row);
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (expiresAt <= now) {
    // Expired: delete from SQLite
    deleteSession(cleanToken);
    return null;
  }

  // Load user
  const user = findUserById(session.userId);
  if (!user || !user.isActive) {
    // User deleted or disabled: revoke session
    deleteSession(cleanToken);
    return null;
  }

  // Touch last_accessed_at
  sqlite.prepare(`
    UPDATE sessions
    SET last_accessed_at = ?
    WHERE id = ?
  `).run(now.toISOString(), session.id);

  session.lastAccessedAt = now.toISOString();

  return {
    session,
    user: toSafeUser(user),
  };
}

/**
 * Deletes a session by token (logout).
 */
export function deleteSession(token: string): boolean {
  const stmt = sqlite.prepare(`DELETE FROM sessions WHERE token = ?`);
  const result = stmt.run(token.trim());
  return result.changes > 0;
}

/**
 * Revokes all sessions for a user, optionally keeping a specific session token active.
 * Useful on password change.
 */
export function deleteSessionsByUserId(userId: string, exceptToken?: string): number {
  if (exceptToken) {
    const stmt = sqlite.prepare(`DELETE FROM sessions WHERE user_id = ? AND token != ?`);
    const result = stmt.run(userId, exceptToken.trim());
    return result.changes;
  } else {
    const stmt = sqlite.prepare(`DELETE FROM sessions WHERE user_id = ?`);
    const result = stmt.run(userId);
    return result.changes;
  }
}

/**
 * Cleanup job to purge expired sessions.
 */
export function cleanupExpiredSessions(): number {
  const stmt = sqlite.prepare(`DELETE FROM sessions WHERE expires_at <= ?`);
  const result = stmt.run(new Date().toISOString());
  return result.changes;
}
