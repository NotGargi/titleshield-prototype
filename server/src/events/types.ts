/**
 * Domain Event Catalog for Landeed 2.0 Sovereign Authentication Lifecycle.
 * Implements Section 63 BSA 2023 compliant audit event store contracts.
 */

export type AuthEventType =
  | 'UserRegistered'
  | 'UserLoggedIn'
  | 'LoginFailed'
  | 'SessionExpired'
  | 'PasswordChanged'
  | 'UserLoggedOut';

export type EventOutcome = 'SUCCESS' | 'FAILURE';

export interface EventMetadata {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  clientVersion?: string;
}

export interface BaseDomainEvent<T = Record<string, any>> {
  eventId: string;
  eventType: AuthEventType;
  userId: string | null;
  timestamp: string; // ISO 8601 UTC string
  outcome: EventOutcome;
  payload: T;
  metadata: EventMetadata;
}

// 1. UserRegistered
export interface UserRegisteredPayload {
  username?: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  registrationMethod?: 'CREDENTIALS' | 'INVITATION' | 'OAUTH';
}
export type UserRegisteredEvent = BaseDomainEvent<UserRegisteredPayload>;

// 2. UserLoggedIn
export interface UserLoggedInPayload {
  username?: string;
  name?: string;
  email: string;
  sessionId: string;
  sessionExpiresAt: string;
  authMethod: 'PASSWORD' | 'TOKEN';
}
export type UserLoggedInEvent = BaseDomainEvent<UserLoggedInPayload>;

// 3. LoginFailed
export interface LoginFailedPayload {
  attemptedIdentifier: string; // email or username ONLY - strictly NO password
  failureReason: 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'ACCOUNT_LOCKED' | 'RATE_LIMITED' | 'INACTIVE_ACCOUNT';
  attemptCount?: number;
}
export type LoginFailedEvent = BaseDomainEvent<LoginFailedPayload>;

// 4. SessionExpired
export interface SessionExpiredPayload {
  sessionId: string;
  reason: 'TTL_EXPIRED' | 'EXPLICIT_LOGOUT' | 'REVOKED_BY_ADMIN' | 'PASSWORD_RESET';
  expiredAt?: string;
}
export type SessionExpiredEvent = BaseDomainEvent<SessionExpiredPayload>;

// 5. PasswordChanged
export interface PasswordChangedPayload {
  changedBy: 'USER' | 'ADMIN' | 'RECOVERY_FLOW';
  sessionsRevoked: boolean;
  revokedSessionCount?: number;
}
export type PasswordChangedEvent = BaseDomainEvent<PasswordChangedPayload>;

// 6. UserLoggedOut
export interface UserLoggedOutPayload {
  sessionId: string;
  reason?: string;
}
export type UserLoggedOutEvent = BaseDomainEvent<UserLoggedOutPayload>;

export type AuthDomainEvent =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | LoginFailedEvent
  | SessionExpiredEvent
  | PasswordChangedEvent
  | UserLoggedOutEvent;
