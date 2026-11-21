import express, { Request, Response } from 'express';
import {
  createUser,
  findUserById,
  validateCredentials,
  updatePassword,
  toSafeUser,
} from '../db/usersRepository';
import {
  createSession,
  deleteSession,
  deleteSessionsByUserId,
} from '../db/sessionsRepository';
import { queryAuthEvents } from '../db/authEventsRepository';
import { requireAuth } from '../middleware/auth';
import { saveUserTinyFishKey, getUserTinyFishStatus, verifyTinyFishKey } from '../services/tinyfishKeys';
import { authEventDispatcher } from '../events/dispatcher';
import {
  UserRegisteredEvent,
  UserLoggedInEvent,
  LoginFailedEvent,
  SessionExpiredEvent,
  PasswordChangedEvent,
  UserLoggedOutEvent,
} from '../events/types';

export const authRouter = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/register
 * Registers a new user, hashes password, emits UserRegistered and UserLoggedIn,
 * persists session in SQLite, and returns session token and safe user.
 */
authRouter.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: 'Name is required and must be at least 2 characters long.',
      });
      return;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        error: 'A valid email address is required.',
      });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password is required and must be at least 8 characters long.',
      });
      return;
    }

    const user = createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone ? String(phone).trim() : undefined,
      role: role ? String(role).trim().toUpperCase() : 'CITIZEN',
    });

    const session = createSession({
      userId: user.id,
      role: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    const safeUser = toSafeUser(user);

    // Emit UserRegistered domain event
    authEventDispatcher.dispatch<UserRegisteredEvent>({
      eventType: 'UserRegistered',
      userId: user.id,
      outcome: 'SUCCESS',
      payload: {
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
        role: user.role,
        registrationMethod: 'CREDENTIALS',
      },
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        sessionId: session.id,
      },
    });

    // Emit UserLoggedIn domain event
    authEventDispatcher.dispatch<UserLoggedInEvent>({
      eventType: 'UserLoggedIn',
      userId: user.id,
      outcome: 'SUCCESS',
      payload: {
        email: user.email,
        name: user.name,
        sessionId: session.id,
        sessionExpiresAt: session.expiresAt,
        authMethod: 'PASSWORD',
      },
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        sessionId: session.id,
      },
    });

    const tfKey = typeof req.body.tinyfishApiKey === 'string' ? req.body.tinyfishApiKey.trim() : '';
    if (tfKey) {
      saveUserTinyFishKey(user.id, tfKey, req.body.tinyfishVerified === true);
    }

    res.status(201).json({
      success: true,
      token: session.token,
      user: safeUser,
      tinyfish: getUserTinyFishStatus(user.id),
    });
  } catch (err: any) {
    if (err.status === 409 || err.message?.includes('already exists')) {
      res.status(409).json({
        success: false,
        error: err.message || 'A user with this email already exists.',
      });
      return;
    }
    console.error('[AuthRouter] Registration error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during registration.',
    });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials, manages lockout, emits UserLoggedIn or LoginFailed,
 * and issues authenticated session token.
 */
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const identifier = req.body.identifier || req.body.email || req.body.username;
    const password = req.body.password;

    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
      res.status(400).json({
        success: false,
        error: 'Email or username identifier is required.',
      });
      return;
    }

    if (!password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Password is required.',
      });
      return;
    }

    const cleanIdentifier = identifier.trim();
    const result = validateCredentials(cleanIdentifier, password);

    if (!result.success) {
      // Dispatch LoginFailed domain event
      authEventDispatcher.dispatch<LoginFailedEvent>({
        eventType: 'LoginFailed',
        userId: result.user ? result.user.id : null,
        outcome: 'FAILURE',
        payload: {
          attemptedIdentifier: cleanIdentifier,
          failureReason: result.failureReason,
        },
        metadata: {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        },
      });

      if (result.failureReason === 'ACCOUNT_LOCKED') {
        res.status(403).json({
          success: false,
          error: 'Account is temporarily locked due to multiple failed login attempts. Please try again after 15 minutes.',
          locked: true,
          lockedUntil: result.lockedUntil,
        });
        return;
      }

      if (result.failureReason === 'INACTIVE_ACCOUNT') {
        res.status(403).json({
          success: false,
          error: 'Account has been deactivated. Please contact support.',
        });
        return;
      }

      res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email/username and password.',
      });
      return;
    }

    const user = result.user;
    const session = createSession({
      userId: user.id,
      role: user.role,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    const safeUser = toSafeUser(user);

    // Dispatch UserLoggedIn domain event
    authEventDispatcher.dispatch<UserLoggedInEvent>({
      eventType: 'UserLoggedIn',
      userId: user.id,
      outcome: 'SUCCESS',
      payload: {
        email: user.email,
        name: user.name,
        sessionId: session.id,
        sessionExpiresAt: session.expiresAt,
        authMethod: 'PASSWORD',
      },
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        sessionId: session.id,
      },
    });

    const tfKeyLogin = typeof req.body.tinyfishApiKey === 'string' ? req.body.tinyfishApiKey.trim() : '';
    if (tfKeyLogin) {
      saveUserTinyFishKey(user.id, tfKeyLogin, req.body.tinyfishVerified === true);
    }

    res.status(200).json({
      success: true,
      token: session.token,
      user: safeUser,
      tinyfish: getUserTinyFishStatus(user.id),
    });
  } catch (err: any) {
    console.error('[AuthRouter] Login error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login.',
    });
  }
});

/**
 * POST /api/auth/logout
 * Revokes session token in SQLite and emits UserLoggedOut & SessionExpired events.
 */
authRouter.post('/logout', requireAuth, (req: Request, res: Response) => {
  try {
    const token = req.token!;
    const session = req.session!;
    const user = req.user!;

    deleteSession(token);

    // Dispatch UserLoggedOut domain event
    authEventDispatcher.dispatch<UserLoggedOutEvent>({
      eventType: 'UserLoggedOut',
      userId: user.id,
      outcome: 'SUCCESS',
      payload: {
        sessionId: session.id,
        reason: 'EXPLICIT_LOGOUT',
      },
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        sessionId: session.id,
      },
    });

    // Dispatch SessionExpired domain event
    authEventDispatcher.dispatch<SessionExpiredEvent>({
      eventType: 'SessionExpired',
      userId: user.id,
      outcome: 'SUCCESS',
      payload: {
        sessionId: session.id,
        reason: 'EXPLICIT_LOGOUT',
        expiredAt: new Date().toISOString(),
      },
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        sessionId: session.id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err: any) {
    console.error('[AuthRouter] Logout error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during logout.',
    });
  }
});

/**
 * GET /api/auth/me
 * Returns currently authenticated user profile and session details.
 */
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    user: req.user,
    session: {
      id: req.session!.id,
      expiresAt: req.session!.expiresAt,
      createdAt: req.session!.createdAt,
    },
  });
});

/**
 * POST /api/auth/password
 * Changes user password, invalidates other sessions, and emits PasswordChanged event.
 */
authRouter.post('/password', requireAuth, (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Current password is required.',
      });
      return;
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: 'New password is required and must be at least 8 characters long.',
      });
      return;
    }

    const user = findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found.',
      });
      return;
    }

    // Verify current password using credential validation
    const validation = validateCredentials(user.email, currentPassword);
    if (!validation.success) {
      res.status(401).json({
        success: false,
        error: 'Current password is incorrect.',
      });
      return;
    }

    // Update password
    updatePassword(user.id, newPassword);

    // Revoke all other sessions except current session
    const revokedCount = deleteSessionsByUserId(user.id, req.token);

    // Dispatch PasswordChanged domain event
    authEventDispatcher.dispatch<PasswordChangedEvent>({
      eventType: 'PasswordChanged',
      userId: user.id,
      outcome: 'SUCCESS',
      payload: {
        changedBy: 'USER',
        sessionsRevoked: true,
        revokedSessionCount: revokedCount,
      },
      metadata: {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        sessionId: req.session!.id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (err: any) {
    console.error('[AuthRouter] Password update error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while updating password.',
    });
  }
});

/**
 * GET /api/auth/events
 * Query lifecycle events from the persistent SQLite audit store.
 * Supports filtering by userId, eventType, outcome, since, until, limit, offset.
 */
authRouter.get('/events', (req: Request, res: Response) => {
  try {
    const { userId, eventType, outcome, since, until, limit, offset } = req.query;

    const queryResult = queryAuthEvents({
      userId: userId ? String(userId) : undefined,
      eventType: eventType ? String(eventType) : undefined,
      outcome: outcome ? (String(outcome) as any) : undefined,
      since: since ? String(since) : undefined,
      until: until ? String(until) : undefined,
      limit: limit ? parseInt(String(limit), 10) : 50,
      offset: offset ? parseInt(String(offset), 10) : 0,
    });

    res.status(200).json({
      success: true,
      total: queryResult.total,
      events: queryResult.events,
    });
  } catch (err: any) {
    console.error('[AuthRouter] Audit events query error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to query authentication audit events.',
    });
  }
});


/**
 * POST /api/auth/tinyfish/verify
 * Checks a TinyFish API key with the free Search API (no credits used). Does not store it.
 */
authRouter.post('/tinyfish/verify', async (req: Request, res: Response) => {
  const result = await verifyTinyFishKey(String(req.body?.apiKey || ''));
  res.status(200).json({ success: result.ok, ...result });
});

/**
 * GET /api/auth/tinyfish
 * Shows whether the signed-in user has a TinyFish key connected (masked).
 */
authRouter.get('/tinyfish', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({ success: true, tinyfish: getUserTinyFishStatus(req.user!.id) });
});

/**
 * PUT /api/auth/tinyfish
 * Verifies and saves (or replaces) the signed-in user's TinyFish key.
 */
authRouter.put('/tinyfish', requireAuth, async (req: Request, res: Response) => {
  const apiKey = String(req.body?.apiKey || '').trim();
  if (!apiKey) {
    res.status(400).json({ success: false, error: 'Enter your TinyFish API key.' });
    return;
  }
  const check = await verifyTinyFishKey(apiKey);
  if (!check.ok && (check.status === 401 || check.status === 403)) {
    res.status(400).json({ success: false, error: check.message });
    return;
  }
  saveUserTinyFishKey(req.user!.id, apiKey, check.ok);
  res.status(200).json({ success: true, verification: check, tinyfish: getUserTinyFishStatus(req.user!.id) });
});
