import { Request, Response, NextFunction } from 'express';
import { validateSessionToken } from '../db/sessionsRepository';
import { SafeUser } from '../db/usersRepository';
import { Session } from '../db/schema';

// Extend Express Request interface to include authenticated user and session
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      session?: Session;
      token?: string;
    }
  }
}

/**
 * Extracts Bearer token from the Authorization header.
 */
export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1].trim();
  }
  return null;
}

/**
 * Middleware requiring a valid, non-expired Bearer session token.
 * Rejects with 401 Unauthorized if token is missing, invalid, or expired.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token in Authorization header.',
    });
    return;
  }

  const result = validateSessionToken(token);
  if (!result) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.',
    });
    return;
  }

  req.user = result.user;
  req.session = result.session;
  req.token = token;

  next();
}

/**
 * Optional authentication middleware.
 * If a valid Bearer token is provided, attaches user and session to request.
 * If no token is provided or token is invalid, continues without error.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (token) {
    const result = validateSessionToken(token);
    if (result) {
      req.user = result.user;
      req.session = result.session;
      req.token = token;
    }
  }

  next();
}

/**
 * Role-based authorization middleware.
 * Ensures the authenticated user has one of the allowed roles.
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden. Role '${req.user.role}' does not have required permissions.`,
      });
      return;
    }

    next();
  };
}
